/**
 * @file codeRunner.js
 * @description Translates stored problems and user submissions into executable
 * programs across supported languages, providing helper builders for inputs,
 * outputs, and language-specific scaffolding.
 */

/**
 * Converts a human-friendly title into a deterministic camelCase function name
 * to align user code with generated templates.
 */
const sanitizeTitleToFunction = (title = '') => {
  if (!title) return 'solve';
  const tokens = title
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return 'solve';
  const [first, ...rest] = tokens;
  const camel = first.toLowerCase() + rest.map(token => token.charAt(0).toUpperCase() + token.slice(1)).join('');
  return camel || 'solve';
};

/**
 * Serializes primitive values and arrays into Java literal syntax, honoring the
 * declared type when provided.
 */
const javaValueLiteral = (value, type = null) => {
  if (value === null || value === undefined) {
    return 'null';
  }
  switch (type) {
    case 'String':
      return JSON.stringify(String(value));
    case 'char':
    case 'Character':
      return `'${String(value).charAt(0)}'`;
    case 'double':
    case 'Double':
      return String(value).includes('.') ? String(value) : `${value}.0`;
    case 'float':
    case 'Float':
      return String(value).includes('.') ? `${value}f` : `${value}.0f`;
    case 'long':
    case 'Long':
      return `${value}L`;
    case 'boolean':
    case 'Boolean':
      return value ? 'true' : 'false';
    case 'Integer':
    case 'Short':
    case 'Byte':
    case 'int':
    case 'short':
    case 'byte':
      return String(value);
    default:
      if (typeof value === 'string') {
        return JSON.stringify(value);
      }
      if (typeof value === 'number') {
        return Number.isFinite(value) ? String(value) : (value > 0 ? 'Double.POSITIVE_INFINITY' : 'Double.NEGATIVE_INFINITY');
      }
      if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
      }
      return JSON.stringify(value);
  }
};

/**
 * Produces Java expressions for scalar values, arrays, and collections used in
 * synthesized main methods that drive templates.
 */
const toJavaLiteral = (value, options = {}) => {
  const {
    kind = null,
    arrayComponentType,
    elementOptions,
    valueType
  } = options || {};

  if (kind === 'value') {
    return javaValueLiteral(value, valueType);
  }

  if (kind === 'array') {
    const componentType = arrayComponentType || 'int';
    const elements = Array.isArray(value)
      ? value.map(item => (elementOptions ? toJavaLiteral(item, elementOptions) : javaValueLiteral(item, componentType)))
      : [];
    return `new ${componentType}[]{${elements.join(', ')}}`;
  }

  if (kind === 'list') {
    if (!Array.isArray(value) || value.length === 0) {
      return 'java.util.Collections.emptyList()';
    }
    const items = value.map(item => elementOptions ? toJavaLiteral(item, elementOptions) : toJavaLiteral(item));
    return `java.util.Arrays.asList(${items.join(', ')})`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'new int[]{}';
    }
    if (value.every(item => Number.isInteger(item))) {
      return `new int[]{${value.join(', ')}}`;
    }
    if (value.every(item => typeof item === 'number')) {
      return `new double[]{${value.join(', ')}}`;
    }
    if (value.every(item => typeof item === 'boolean')) {
      return `new boolean[]{${value.map(item => (item ? 'true' : 'false')).join(', ')}}`;
    }
    const elements = value.map(item => JSON.stringify(item)).join(', ');
    return `new Object[]{${elements}}`;
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? `${value}` : `${value}d`;
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (value === null || value === undefined) {
    return 'null';
  }
  return JSON.stringify(value);
};

const cppTreeNodeStruct = `#ifndef CASCADE_TREENODE_DEFINED
#define CASCADE_TREENODE_DEFINED
struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};
#endif`;

const cppTreeNodeHelpers = `static TreeNode* buildTreeNode(const std::vector<std::string>& values) {
    if (values.empty()) return nullptr;
    std::vector<TreeNode*> nodes(values.size(), nullptr);
    for (size_t i = 0; i < values.size(); ++i) {
        if (values[i] != "null") {
            nodes[i] = new TreeNode(std::stoi(values[i]));
        }
    }
    size_t idx = 1;
    for (size_t i = 0; i < nodes.size() && idx < nodes.size(); ++i) {
        TreeNode* node = nodes[i];
        if (!node) continue;
        node->left = nodes[idx++];
        if (idx < nodes.size()) {
            node->right = nodes[idx++];
        }
    }
    return nodes[0];
}

static std::string treeNodeToJson(TreeNode* root) {
    if (!root) {
        return "[]";
    }
    std::vector<std::string> values;
    std::queue<TreeNode*> queue;
    queue.push(root);
    while (!queue.empty()) {
        TreeNode* node = queue.front();
        queue.pop();
        if (node) {
            values.push_back(std::to_string(node->val));
            queue.push(node->left);
            queue.push(node->right);
        } else {
            values.push_back("null");
        }
    }
    while (!values.empty() && values.back() == "null") {
        values.pop_back();
    }
    std::ostringstream oss;
    oss << "[";
    for (size_t i = 0; i < values.size(); ++i) {
        if (i) oss << ", ";
        oss << values[i];
    }
    oss << "]";
    return oss.str();
}

template <typename T>
auto normalizeBinaryTreeResult(T&& value) -> T&& {
    return std::forward<T>(value);
}

static std::string normalizeBinaryTreeResult(TreeNode* root) {
    return treeNodeToJson(root);
}
`;

const cppGraphNodeStruct = `#ifndef CASCADE_GRAPHNODE_DEFINED
#define CASCADE_GRAPHNODE_DEFINED
struct GraphNode {
    int val;
    std::vector<GraphNode*> neighbors;
    GraphNode() : val(0), neighbors() {}
    GraphNode(int x) : val(x), neighbors() {}
};
#endif`;

const cppGraphNodeHelpers = `static GraphNode* buildGraphNode(const std::vector<std::vector<int>>& adjList) {
    if (adjList.empty()) return nullptr;
    std::vector<GraphNode*> nodes(adjList.size(), nullptr);
    for (size_t i = 0; i < adjList.size(); ++i) {
        if (!nodes[i]) {
            nodes[i] = new GraphNode(static_cast<int>(i + 1));
        }
        for (int neighbor : adjList[i]) {
            if (neighbor <= 0 || static_cast<size_t>(neighbor) > adjList.size()) continue;
            if (!nodes[neighbor - 1]) {
                nodes[neighbor - 1] = new GraphNode(neighbor);
            }
            nodes[i]->neighbors.push_back(nodes[neighbor - 1]);
        }
    }
    return nodes[0];
}

static std::vector<std::vector<int>> graphNodeToAdjList(GraphNode* node) {
    std::vector<std::vector<int>> result;
    if (!node) return result;
    std::unordered_map<int, GraphNode*> visited;
    std::queue<GraphNode*> queue;
    queue.push(node);
    while (!queue.empty()) {
        GraphNode* current = queue.front();
        queue.pop();
        if (visited.count(current->val)) continue;
        visited[current->val] = current;
        std::vector<int> neighbors;
        for (GraphNode* neighbor : current->neighbors) {
            if (neighbor) {
                neighbors.push_back(neighbor->val);
                if (!visited.count(neighbor->val)) {
                    queue.push(neighbor);
                }
            }
        }
        if (static_cast<size_t>(current->val) > result.size()) {
            result.resize(current->val);
        }
        result[current->val - 1] = neighbors;
    }
    for (auto& neighbors : result) {
        std::sort(neighbors.begin(), neighbors.end());
    }
    return result;
}

static std::string graphNodeToJson(GraphNode* node) {
    auto lists = graphNodeToAdjList(node);
    std::ostringstream oss;
    oss << "[";
    for (size_t i = 0; i < lists.size(); ++i) {
        if (i) oss << ", ";
        oss << "[";
        for (size_t j = 0; j < lists[i].size(); ++j) {
            if (j) oss << ", ";
            oss << lists[i][j];
        }
        oss << "]";
    }
    oss << "]";
    return oss.str();
}`;

/**
 * Attempts to infer the primary function exported by a JavaScript submission to
 * invoke it correctly during execution.
 */
const detectJavaScriptFunctionName = (code, fallbackName) => {
  if (!code || typeof code !== 'string') return fallbackName;
  const stripped = code
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ');
  const candidateRegexes = [
    /module\.exports\s*=\s*([A-Za-z0-9_]+)/g,
    /(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?function\s*\(/g,
    /(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\(/g,
    /(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?[A-Za-z0-9_]+\s*=>/g,
    /function\s+([A-Za-z0-9_]+)\s*\(/g,
  ];
  const blacklist = new Set(['ListNode', 'TreeNode', 'GraphNode', 'RandomNode']);
  const candidates = [];
  for (const regex of candidateRegexes) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(stripped)) !== null) {
      if (match[1]) {
        candidates.push(match[1]);
      }
    }
  }
  for (const candidate of candidates) {
    if (!blacklist.has(candidate)) {
      return candidate;
    }
  }
  if (candidates.length > 0) {
    return candidates[0];
  }
  return fallbackName;
};

/**
 * Inspects Python code for the callable symbol that should be executed.
 */
const detectPythonFunctionName = (code, fallbackName) => {
  if (!code || typeof code !== 'string') return fallbackName;
  const classMethodMatch = code.match(/class\s+Solution\s*:\s*[\s\S]*?def\s+([A-Za-z0-9_]+)\s*\(/);
  if (classMethodMatch && classMethodMatch[1]) {
    return classMethodMatch[1];
  }
  const funcMatch = code.match(/def\s+([A-Za-z0-9_]+)\s*\(/);
  if (funcMatch && funcMatch[1]) {
    return funcMatch[1];
  }
  return fallbackName;
};

/**
 * Identifies which Java class contains the entry-point method, defaulting to
 * Solution when absent.
 */
const detectJavaClassName = (code) => {
  if (!code || typeof code !== 'string') return null;
  const solutionMatch = code.match(/class\s+Solution\b/);
  if (solutionMatch) {
    return 'Solution';
  }
  const classMatch = code.match(/class\s+([A-Za-z0-9_]+)/);
  return classMatch ? classMatch[1] : null;
};

/**
 * Determines the target Java method within the solution class, prioritizing
 * matches that mirror the stored function name.
 */
const detectJavaMethodName = (code, fallbackName) => {
  if (!code || typeof code !== 'string') return fallbackName;
  const normalized = code.replace(/\u00A0/g, ' ').replace(/\r/g, '');
  const classBodyMatch = normalized.match(/class\s+Solution[^\{]*\{([\s\S]*?)}/);
  const searchTarget = classBodyMatch ? classBodyMatch[1] : normalized;
  const methodRegex = /(public|protected|private)\s+(?:static\s+)?[A-Za-z0-9_<>,\[\]]+\s+([A-Za-z0-9_]+)\s*\(/g;
  const candidates = [];
  let match;
  while ((match = methodRegex.exec(searchTarget)) !== null) {
    const candidate = match[2];
    if (!candidate || candidate === 'main' || candidate === 'Solution') {
      continue;
    }
    candidates.push(candidate);
  }
  if (candidates.length === 0) {
    return fallbackName;
  }
  if (candidates.length === 1) {
    return candidates[0];
  }
  const fallbackLower = fallbackName ? fallbackName.toLowerCase() : null;
  if (fallbackLower) {
    const matched = candidates.find(name => name.toLowerCase() === fallbackLower);
    if (matched) {
      return matched;
    }
  }
  return candidates[0];
};

/**
 * Generates a runnable Java harness that instantiates the solution class,
 * calls the deduced method, and prints a serialized result.
 */
const wrapJavaCode = (code, functionName, args, options = {}) => {
  const { resultProcessor, resultType } = options;
  const className = detectJavaClassName(code) || 'Solution';
  const serialize = 'private static String serialize(Object obj) {\n        if (obj == null) return "null";\n        if (obj instanceof Number || obj instanceof Boolean) return obj.toString();\n        if (obj instanceof int[]) {\n            return java.util.Arrays.toString((int[]) obj);\n        }\n        if (obj instanceof double[]) {\n            return java.util.Arrays.toString((double[]) obj);\n        }\n        if (obj instanceof Object[]) {\n            return java.util.Arrays.deepToString((Object[]) obj);\n        }\n        return obj.toString();\n    }';
  const mainArgs = (args || []).map((arg, idx) => {
    if (arg && typeof arg === 'object' && arg.__expr) {
      const declaredType = arg.__type || 'Object';
      return `${declaredType} arg${idx} = ${arg.__expr};`;
    }
    if (Array.isArray(arg)) {
      if (arg.every(v => Number.isInteger(v))) {
        return `int[] arg${idx} = new int[]{${arg.join(',')}};`;
      }
      if (arg.every(v => typeof v === 'number')) {
        return `double[] arg${idx} = new double[]{${arg.join(',')}};`;
      }
      return `Object[] arg${idx} = new Object[]{${arg.map(v => JSON.stringify(v)).join(',')}};`;
    }
    if (typeof arg === 'number') {
      return `int arg${idx} = ${arg};`;
    }
    if (typeof arg === 'string') {
      return `String arg${idx} = ${JSON.stringify(arg)};`;
    }
    if (typeof arg === 'boolean') {
      return `boolean arg${idx} = ${arg};`;
    }
    return `Object arg${idx} = ${JSON.stringify(arg)};`;
  }).join('\n        ');
  const callArgs = (args || []).map((_, idx) => `arg${idx}`).join(', ');
  const resultDeclarationType = resultType || 'Object';
  const resultProcessing = resultProcessor
    ? `Object output = ${resultProcessor}(result);\n        System.out.println(serialize(output));`
    : 'System.out.println(serialize(result));';
  return `${code}\n\npublic class Main {\n    ${serialize}\n    public static void main(String[] args) {\n        ${mainArgs}\n        ${className} solution = new ${className}();\n        ${resultDeclarationType} result = solution.${functionName}(${callArgs});\n        ${resultProcessing}\n    }\n}`;
};

/**
 * Wraps C++ submissions with mandatory includes, helper structures, and a
 * canonical main function that marshals inputs and outputs.
 */
const wrapCppCode = (code, functionName, args, options = {}) => {
  const { helperFunctions, resultProcessor, structDefinition, structPattern } = options;
  const includes = '#include <bits/stdc++.h>\nusing namespace std;';
  const toJson = String.raw`string escapeString(const string& value) {
    string escaped;
    for (char c : value) {
        if (c == '\\' || c == '"') {
            escaped.push_back('\\');
        }
        escaped.push_back(c);
    }
    return escaped;
}

string vecToString(const vector<int>& values) {
    stringstream ss;
    ss << "[";
    for (size_t i = 0; i < values.size(); ++i) {
        if (i) ss << ", ";
        ss << values[i];
    }
    ss << "]";
    return ss.str();
}

string toJson(int value) {
    return to_string(value);
}

string toJson(long long value) {
    return to_string(value);
}

string toJson(double value) {
    std::ostringstream oss;
    oss << value;
    return oss.str();
}

string toJson(bool value) {
    return value ? "true" : "false";
}

string toJson(const string& value) {
    return value;
}

string toJson(const vector<int>& values) {
    return vecToString(values);
}`;
  const sanitizedCode = typeof code === 'string'
    ? code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ')
    : '';
  const needsStruct = structDefinition
    ? !(structPattern || /\bstruct\s+ListNode\b/).test(sanitizedCode)
    : false;
  const preCodeHelpers = [];
  const postCodeHelpers = [];
  if (needsStruct && structDefinition) {
    preCodeHelpers.push(structDefinition.trim());
  }
  if (helperFunctions) {
    if (needsStruct) {
      preCodeHelpers.push(helperFunctions.trim());
    } else {
      postCodeHelpers.push(helperFunctions.trim());
    }
  }
  const preHelperBlock = preCodeHelpers.length ? `${preCodeHelpers.join('\n\n')}\n\n` : '';
  const postHelperBlock = postCodeHelpers.length ? `\n\n${postCodeHelpers.join('\n\n')}\n\n` : '\n\n';
  const mainArgs = (args || []).map((arg, idx) => {
    if (arg && typeof arg === 'object' && arg.__expr) {
      return `auto arg${idx} = ${arg.__expr};`;
    }
    if (Array.isArray(arg)) {
      const literal = toCppLiteral(arg);
      return `auto arg${idx} = ${literal};`;
    }
    if (typeof arg === 'number') {
      return Number.isInteger(arg)
        ? `int arg${idx} = ${arg};`
        : `double arg${idx} = ${arg};`;
    }
    if (typeof arg === 'string') {
      return `std::string arg${idx} = "${escapeCppString(arg)}";`;
    }
    if (typeof arg === 'boolean') {
      return `bool arg${idx} = ${arg ? 'true' : 'false'};`;
    }
    return `auto arg${idx} = ${toCppLiteral(arg)};`;
  }).join('\n    ');
  const callArgs = (args || []).map((_, idx) => `arg${idx}`).join(', ');
  const invocation = resultProcessor
    ? `auto __raw_result = solution.${functionName}(${callArgs});\n    auto result = ${resultProcessor}(__raw_result);`
    : `auto result = solution.${functionName}(${callArgs});`;
  return `${includes}\n\n${preHelperBlock}${code}${postHelperBlock}${toJson}\n\nint main() {\n    ${mainArgs}\n    Solution solution;\n    ${invocation}\n    cout << toJson(result) << endl;\n    return 0;\n}`;
};

/**
 * Enriches JavaScript code with helper utilities and executes the exported
 * function while normalizing the console output.
 */
const wrapJavaScriptCode = (code, functionName, args, options = {}) => {
  const { helpers, resultProcessor } = options;
  const helperBlock = helpers ? `${helpers}\n\n` : '';
  const callArgs = (args || []).map(arg => toJavaScriptLiteral(arg)).join(', ');
  const invocationTarget = code.includes('module.exports') ? 'module.exports' : functionName;
  const resultAssignment = `const __result = ${invocationTarget}(${callArgs});`;
  const processedResult = resultProcessor
    ? `const result = ${resultProcessor}(__result);`
    : 'const result = __result;';
  const serializeBlock = `function __serialize(value) {\n  if (Array.isArray(value)) {\n    return '[' + value.map(__serialize).join(', ') + ']';\n  }\n  if (value && typeof value === 'object') {\n    const entries = Object.entries(value).map(([key, val]) => String(JSON.stringify(key)) + ': ' + __serialize(val));\n    return '{' + entries.join(', ') + '}';\n  }\n  if (typeof value === 'string') {\n    return value;\n  }\n  if (typeof value === 'number') {\n    return Number.isFinite(value) ? String(value) : (value > 0 ? 'Infinity' : '-Infinity');\n  }\n  if (typeof value === 'boolean') {\n    return value ? 'true' : 'false';\n  }\n  if (value === null || value === undefined) {\n    return 'null';\n  }\n  return JSON.stringify(value);\n}\nconsole.log(__serialize(result));`;
  return `${helperBlock}${code}\n\n${resultAssignment}\n${processedResult}\n${serializeBlock}`;
};

/**
 * Adds a __main__ guard around Python submissions so the target function or
 * class method executes with prepared arguments.
 */
const wrapPythonCode = (code, functionName, args, options = {}) => {
  const { resultProcessor } = options;
  const callArgs = (args || []).map(arg => toPythonLiteral(arg)).join(', ');
  const resultHandlingLines = [
    ...(resultProcessor ? [`    result = ${resultProcessor}(result)`] : []),
    '    if isinstance(result, (list, dict, tuple)):',
    '        import json',
    '        print(json.dumps(result))',
    '    else:',
    '        print(result)'
  ].join('\n');

  if (code.includes('class Solution')) {
    return `${code}

if __name__ == "__main__":
    solution = Solution()
    result = solution.${functionName}(${callArgs})
${resultHandlingLines}`;
  }

  return `${code}

if __name__ == "__main__":
    result = ${functionName}(${callArgs})
${resultHandlingLines}`;
};

const pythonListNodeHelpers = `class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


def build_linked_list(values):
    dummy = ListNode()
    tail = dummy
    for value in values:
        tail.next = ListNode(value)
        tail = tail.next
    return dummy.next


def linked_list_to_list(head):
    values = []
    current = head
    while current:
        values.append(current.val)
        current = current.next
    return values


def normalize_linked_list_output(value):
    if isinstance(value, ListNode) or value is None:
        return linked_list_to_list(value)
    return value`;

const pythonTreeNodeHelpers = `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def build_binary_tree(values):
    if not values:
        return None
    nodes = [TreeNode(val) if val is not None else None for val in values]
    kids = nodes[::-1]
    root = kids.pop()
    for node in nodes:
        if node:
            if kids:
                node.left = kids.pop()
            if kids:
                node.right = kids.pop()
    return root


def binary_tree_to_list(root):
    if not root:
        return []
    result = []
    queue = [root]
    while queue:
        node = queue.pop(0)
        if node:
            result.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
        else:
            result.append(None)
    while result and result[-1] is None:
        result.pop()
    return result


def normalize_binary_tree_output(value):
    if isinstance(value, TreeNode) or value is None:
        return binary_tree_to_list(value)
    return value`;

const pythonGraphNodeHelpers = `class GraphNode:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors or []


def build_graph(adj_list):
    if not adj_list:
        return None
    nodes = {i + 1: GraphNode(i + 1) for i in range(len(adj_list))}
    for idx, neighbors in enumerate(adj_list, start=1):
        nodes[idx].neighbors = [nodes[n] for n in neighbors]
    return nodes[1] if nodes else None


def graph_to_adj_list(node):
    if not node:
        return []
    visited = set()
    queue = [node]
    result = {}
    while queue:
        current = queue.pop(0)
        if current.val in visited:
            continue
        visited.add(current.val)
        result[current.val] = [neighbor.val for neighbor in current.neighbors]
        for neighbor in current.neighbors:
            if neighbor.val not in visited:
                queue.append(neighbor)
    return [result.get(i, []) for i in range(1, len(result) + 1)]`;

const pythonSupportHelpers = {
  linked_list: {
    helpers: pythonListNodeHelpers,
    fromInput: 'build_linked_list',
    toOutput: 'normalize_linked_list_output'
  },
  binary_tree: {
    helpers: pythonTreeNodeHelpers,
    fromInput: 'build_binary_tree',
    toOutput: 'normalize_binary_tree_output'
  },
  graph: {
    helpers: pythonGraphNodeHelpers,
    fromInput: 'build_graph',
    toOutput: 'graph_to_adj_list'
  }
};

const javascriptLinkedListHelpers = `function ListNode(val, next) {
  this.val = (val === undefined ? 0 : val);
  this.next = (next === undefined ? null : next);
}

function buildLinkedList(values) {
  const dummy = new ListNode();
  let tail = dummy;
  for (const value of values) {
    tail.next = new ListNode(value);
    tail = tail.next;
  }
  return dummy.next;
}

function linkedListToArray(head) {
  const result = [];
  let current = head;
  while (current) {
    result.push(current.val);
    current = current.next;
  }
  return result;
}

function normalizeLinkedListOutput(value) {
  if (value && typeof value === 'object' && 'val' in value && 'next' in value) {
    return linkedListToArray(value);
  }
  return value;
}`;

const javascriptBinaryTreeHelpers = `function TreeNode(val, left, right) {
  this.val = (val === undefined ? 0 : val);
  this.left = (left === undefined ? null : left);
  this.right = (right === undefined ? null : right);
}

function buildBinaryTree(values) {
  if (!values || !values.length) return null;
  const nodes = values.map(val => (val === null || val === undefined) ? null : new TreeNode(val));
  let idx = 1;
  for (let i = 0; i < nodes.length && idx < nodes.length; i++) {
    if (!nodes[i]) continue;
    nodes[i].left = nodes[idx++] || null;
    if (idx < nodes.length) {
      nodes[i].right = nodes[idx++] || null;
    }
  }
  return nodes[0];
}

function binaryTreeToArray(root) {
  if (!root) return [];
  const result = [];
  const queue = [root];
  while (queue.length) {
    const node = queue.shift();
    if (node) {
      result.push(node.val);
      queue.push(node.left);
      queue.push(node.right);
    } else {
      result.push(null);
    }
  }
  while (result.length && result[result.length - 1] === null) {
    result.pop();
  }
  return result;
}

function normalizeBinaryTreeOutput(value) {
  if (value && typeof value === 'object' && 'val' in value && 'left' in value && 'right' in value) {
    return binaryTreeToArray(value);
  }
  return value;
}`;

const javascriptGraphHelpers = `function Node(val, neighbors) {
  this.val = (val === undefined ? 0 : val);
  this.neighbors = (neighbors === undefined ? [] : neighbors);
}

function buildGraph(adjList) {
  if (!adjList || !adjList.length) return null;
  const nodes = new Map();
  const getNode = (val) => {
    if (!nodes.has(val)) {
      nodes.set(val, new Node(val));
    }
    return nodes.get(val);
  };
  adjList.forEach((neighbors, idx) => {
    const node = getNode(idx + 1);
    node.neighbors = neighbors.map(nei => getNode(nei));
  });
  return getNode(1);
}

function graphToAdjList(node) {
  if (!node) return [];
  const visited = new Map();
  const queue = [node];
  while (queue.length) {
    const curr = queue.shift();
    if (visited.has(curr.val)) continue;
    visited.set(curr.val, curr.neighbors.map(nei => nei.val));
    for (const nei of curr.neighbors) {
      if (!visited.has(nei.val)) {
        queue.push(nei);
      }
    }
  }
  if (!visited.size) return [];
  const maxKey = Math.max(...visited.keys());
  const result = [];
  for (let i = 1; i <= maxKey; i++) {
    result.push(visited.get(i) || []);
  }
  return result;
}`;

const javascriptSupportHelpers = {
  linked_list: {
    helpers: javascriptLinkedListHelpers,
    fromInput: 'buildLinkedList',
    toOutput: 'normalizeLinkedListOutput'
  },
  binary_tree: {
    helpers: javascriptBinaryTreeHelpers,
    fromInput: 'buildBinaryTree',
    toOutput: 'normalizeBinaryTreeOutput'
  },
  graph: {
    helpers: javascriptGraphHelpers,
    fromInput: 'buildGraph',
    toOutput: 'graphToAdjList'
  }
};

const cppLinkedListStruct = `#ifndef CASCADE_LISTNODE_DEFINED
#define CASCADE_LISTNODE_DEFINED
struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};
#endif`;

const cppLinkedListHelpers = `static ListNode* buildLinkedList(const std::vector<int>& values) {
    ListNode* dummy = new ListNode();
    ListNode* tail = dummy;
    for (int val : values) {
        tail->next = new ListNode(val);
        tail = tail->next;
    }
    ListNode* head = dummy->next;
    delete dummy;
    return head;
}

static std::vector<int> linkedListToVector(ListNode* head) {
    std::vector<int> result;
    while (head) {
        result.push_back(head->val);
        head = head->next;
    }
    return result;
}`;

const cppSupportHelpers = {
  linked_list: {
    structDefinition: cppLinkedListStruct,
    helperFunctions: cppLinkedListHelpers,
    structPattern: /^\s*struct\s+ListNode\b/m,
    fromInput: 'buildLinkedList',
    toOutput: 'linkedListToVector'
  },
  binary_tree: {
    structDefinition: cppTreeNodeStruct,
    helperFunctions: cppTreeNodeHelpers,
    structPattern: /^\s*struct\s+TreeNode\b/m,
    fromInput: 'buildTreeNode',
    toOutput: 'normalizeBinaryTreeResult'
  },
  graph: {
    structDefinition: cppGraphNodeStruct,
    helperFunctions: cppGraphNodeHelpers,
    structPattern: /^\s*struct\s+GraphNode\b/m,
    fromInput: 'buildGraphNode',
    toOutput: 'graphNodeToJson'
  }
};

const javaListNodeClass = `class ListNode {
    int val;
    ListNode next;

    ListNode() {}

    ListNode(int val) {
        this.val = val;
    }

    ListNode(int val, ListNode next) {
        this.val = val;
        this.next = next;
    }
}`;

const javaListNodeUtil = `class ListNodeUtil {
    static ListNode buildLinkedList(int[] values) {
        ListNode dummy = new ListNode();
        ListNode tail = dummy;
        for (int value : values) {
            tail.next = new ListNode(value);
            tail = tail.next;
        }
        return dummy.next;
    }

    static int[] linkedListToArray(ListNode head) {
        java.util.List<Integer> result = new java.util.ArrayList<>();
        ListNode current = head;
        while (current != null) {
            result.add(current.val);
            current = current.next;
        }
        int[] arr = new int[result.size()];
        for (int i = 0; i < result.size(); i++) {
            arr[i] = result.get(i);
        }
        return arr;
    }

    static Object normalizeOutput(Object value) {
        if (value instanceof ListNode || value == null) {
            return linkedListToArray((ListNode) value);
        }
        return value;
    }
}`;

const javaTreeNodeClass = `class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;

    TreeNode() {}

    TreeNode(int val) {
        this.val = val;
    }

    TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}`;

const javaTreeNodeUtil = `class TreeNodeUtil {
    static TreeNode buildBinaryTree(Integer[] values) {
        if (values == null || values.length == 0) {
            return null;
        }
        TreeNode[] nodes = new TreeNode[values.length];
        for (int i = 0; i < values.length; i++) {
            if (values[i] != null) {
                nodes[i] = new TreeNode(values[i]);
            }
        }
        int index = 1;
        for (int i = 0; i < nodes.length && index < nodes.length; i++) {
            TreeNode node = nodes[i];
            if (node == null) {
                continue;
            }
            if (index < nodes.length) {
                node.left = nodes[index++];
            }
            if (index < nodes.length) {
                node.right = nodes[index++];
            }
        }
        return nodes[0];
    }

    static Integer[] binaryTreeToArray(TreeNode root) {
        if (root == null) {
            return new Integer[0];
        }
        java.util.List<Integer> result = new java.util.ArrayList<>();
        java.util.Queue<TreeNode> queue = new java.util.ArrayDeque<>();
        queue.offer(root);
        while (!queue.isEmpty()) {
            TreeNode node = queue.poll();
            if (node != null) {
                result.add(node.val);
                queue.offer(node.left);
                queue.offer(node.right);
            } else {
                result.add(null);
            }
        }
        int last = result.size() - 1;
        while (last >= 0 && result.get(last) == null) {
            result.remove(last--);
        }
        return result.toArray(new Integer[0]);
    }

    static Object normalizeOutput(Object value) {
        if (value instanceof TreeNode || value == null) {
            return binaryTreeToArray((TreeNode) value);
        }
        return value;
    }
}`;

const javaGraphNodeClass = `class GraphNode {
    int val;
    java.util.List<GraphNode> neighbors = new java.util.ArrayList<>();

    GraphNode() {}

    GraphNode(int val) {
        this.val = val;
    }
}`;

const javaGraphNodeUtil = `class GraphNodeUtil {
    static GraphNode buildGraph(java.util.List<java.util.List<Integer>> adjList) {
        if (adjList == null || adjList.isEmpty()) {
            return null;
        }
        java.util.Map<Integer, GraphNode> map = new java.util.HashMap<>();
        for (int i = 0; i < adjList.size(); i++) {
            int nodeVal = i + 1;
            map.put(nodeVal, new GraphNode(nodeVal));
        }
        for (int i = 0; i < adjList.size(); i++) {
            GraphNode node = map.get(i + 1);
            for (int neighbor : adjList.get(i)) {
                GraphNode neighborNode = map.get(neighbor);
                if (neighborNode != null) {
                    node.neighbors.add(neighborNode);
                }
            }
        }
        return map.get(1);
    }

    static java.util.List<java.util.List<Integer>> graphToAdjList(GraphNode node) {
        java.util.List<java.util.List<Integer>> result = new java.util.ArrayList<>();
        if (node == null) {
            return result;
        }
        java.util.Map<Integer, GraphNode> visited = new java.util.LinkedHashMap<>();
        java.util.Queue<GraphNode> queue = new java.util.ArrayDeque<>();
        queue.offer(node);
        while (!queue.isEmpty()) {
            GraphNode current = queue.poll();
            if (visited.containsKey(current.val)) {
                continue;
            }
            visited.put(current.val, current);
            java.util.List<Integer> neighbors = new java.util.ArrayList<>();
            for (GraphNode neighbor : current.neighbors) {
                neighbors.add(neighbor.val);
                if (!visited.containsKey(neighbor.val)) {
                    queue.offer(neighbor);
                }
            }
            result.add(neighbors);
        }
        return result;
    }

    static Object normalizeOutput(Object value) {
        if (value instanceof GraphNode || value == null) {
            return graphToAdjList((GraphNode) value);
        }
        if (value instanceof java.util.List) {
            return value;
        }
        return value;
    }
}`;

const javaSupportHelpers = {
  linked_list: {
    classDefinition: javaListNodeClass,
    helperFunctions: javaListNodeUtil,
    fromInput: 'ListNodeUtil.buildLinkedList',
    toOutput: 'ListNodeUtil.linkedListToArray',
    argumentType: 'ListNode',
    resultType: 'ListNode',
    classPattern: /\bclass\s+ListNode\b/
  },
  binary_tree: {
    classDefinition: javaTreeNodeClass,
    helperFunctions: javaTreeNodeUtil,
    fromInput: 'TreeNodeUtil.buildBinaryTree',
    toOutput: 'TreeNodeUtil.normalizeOutput',
    argumentType: 'TreeNode',
    resultType: 'Object',
    classPattern: /\bclass\s+TreeNode\b/,
    inputLiteralOptions: {
      kind: 'array',
      arrayComponentType: 'Integer',
      elementOptions: {
        kind: 'value',
        valueType: 'Integer'
      }
    }
  },
  graph: {
    classDefinition: javaGraphNodeClass,
    helperFunctions: javaGraphNodeUtil,
    fromInput: 'GraphNodeUtil.buildGraph',
    toOutput: 'GraphNodeUtil.normalizeOutput',
    argumentType: 'GraphNode',
    resultType: 'GraphNode',
    classPattern: /\bclass\s+GraphNode\b/,
    inputLiteralOptions: {
      kind: 'list',
      elementOptions: {
        kind: 'list',
        elementOptions: {
          kind: 'value',
          valueType: 'Integer'
        }
      }
    }
  }
};

const escapeCppString = (value) => String(value)
  .replace(/\\/g, '\\\\')
  .replace(/"/g, '\\"');

const toCppLiteral = (value) => {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'std::vector<int>{}';
    }
    const hasNull = value.some(item => item === null || item === undefined);
    if (value.every(item => Array.isArray(item) && item.every(v => Number.isInteger(v)))) {
      const inner = value.map(item => `std::vector<int>{${item.join(', ')}}`).join(', ');
      return `std::vector<std::vector<int>>{${inner}}`;
    }
    if (value.every(item => Array.isArray(item) && item.every(v => typeof v === 'number'))) {
      const inner = value.map(item => `std::vector<std::vector<double>>{${item.join(', ')}}`).join(', ');
      return `std::vector<std::vector<double>>{${inner}}`;
    }
    if (hasNull && value.every(item => item === null || typeof item === 'number')) {
      const elements = value.map(item => (item === null ? '"null"' : `"${item}"`)).join(', ');
      return `std::vector<std::string>{${elements}}`;
    }
    if (value.every(item => Number.isInteger(item))) {
      return `std::vector<int>{${value.join(', ')}}`;
    }
    if (value.every(item => typeof item === 'number')) {
      return `std::vector<double>{${value.join(', ')}}`;
    }
    if (value.every(item => typeof item === 'boolean')) {
      return `std::vector<bool>{${value.map(item => (item ? 'true' : 'false')).join(', ')}}`;
    }
    if (value.every(item => typeof item === 'string')) {
      const elements = value.map(item => `"${escapeCppString(item)}"`).join(', ');
      return `std::vector<std::string>{${elements}}`;
    }
    const elements = value.map(item => `"${escapeCppString(JSON.stringify(item))}"`).join(', ');
    return `std::vector<std::string>{${elements}}`;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return value > 0 ? 'std::numeric_limits<double>::infinity()' : '-std::numeric_limits<double>::infinity()';
    }
    return value % 1 === 0 ? String(value) : String(value);
  }
  if (typeof value === 'string') {
    return `"${escapeCppString(value)}"`;
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (value === null || value === undefined) {
    return 'std::nullopt';
  }
  return `"${escapeCppString(JSON.stringify(value))}"`;
};

const detectCppFunctionName = (code, fallbackName) => {
  if (!code || typeof code !== 'string') return fallbackName;
  const sanitized = code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
  const methodRegexes = [
    /ListNode\s*\*\s*([A-Za-z0-9_]+)\s*\(.*?\)/,
    /TreeNode\s*\*\s*([A-Za-z0-9_]+)\s*\(.*?\)/,
    /GraphNode\s*\*\s*([A-Za-z0-9_]+)\s*\(.*?\)/,
    /int\s+([A-Za-z0-9_]+)\s*\(.*?\)/,
    /double\s+([A-Za-z0-9_]+)\s*\(.*?\)/,
    /bool\s+([A-Za-z0-9_]+)\s*\(.*?\)/
  ];
  for (const regex of methodRegexes) {
    const match = sanitized.match(regex);
    if (match && match[1] && match[1] !== 'main') {
      return match[1];
    }
  }
  return fallbackName;
};

const parseInputToParams = (input = '') => {
  if (!input) return [];
  const normalized = input.replace(/\r/g, '').trim();
  if (!normalized) return [];
  const lines = normalized.split('\n').map(line => line.trim()).filter(Boolean);
  const params = lines.map(line => {
    if (!line) return '';
    try {
      return JSON.parse(line);
    } catch (err) {
      if (line === 'true') return true;
      if (line === 'false') return false;
      const numeric = Number(line);
      if (!Number.isNaN(numeric)) {
        return numeric;
      }
      return line;
    }
  });
  return params.length === 1 ? params : params;
};

const toJavaScriptLiteral = (value) => {
  if (value && typeof value === 'object') {
    if (value.__expr) {
      return value.__expr;
    }
    if (Array.isArray(value)) {
      return `[${value.map(item => toJavaScriptLiteral(item)).join(', ')}]`;
    }
    const entries = Object.entries(value).map(([key, val]) => `${JSON.stringify(key)}: ${toJavaScriptLiteral(val)}`);
    return `{${entries.join(', ')}}`;
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : (value > 0 ? 'Infinity' : '-Infinity');
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (value === null || value === undefined) {
    return 'null';
  }
  return JSON.stringify(value);
};

const toPythonLiteral = (value) => {
  if (value && typeof value === 'object') {
    if (value.__expr) {
      return value.__expr;
    }
    if (Array.isArray(value)) {
      return `[${value.map(item => toPythonLiteral(item)).join(', ')}]`;
    }
    const entries = Object.entries(value).map(([key, val]) => `${JSON.stringify(key)}: ${toPythonLiteral(val)}`);
    return `{${entries.join(', ')}}`;
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (Number.isFinite(value)) {
      return String(value);
    }
    return value > 0 ? 'float("inf")' : 'float("-inf")';
  }
  if (typeof value === 'boolean') {
    return value ? 'True' : 'False';
  }
  if (value === null || value === undefined) {
    return 'None';
  }
  return JSON.stringify(value);
};

const wrapCodeForExecution = ({ code, language, functionName, args, helpers, resultProcessor, invocationOptions = {} }) => {
  const lowerLang = language.toLowerCase();
  let wrapped = '';
  switch (lowerLang) {
    case 'javascript':
      wrapped = wrapJavaScriptCode(code, functionName, args, {
        helpers,
        resultProcessor,
        ...invocationOptions
      });
      if (helpers) {
        // already injected by wrapper
      }
      break;
    case 'python':
      wrapped = wrapPythonCode(code, functionName, args, { resultProcessor });
      if (helpers) {
        wrapped = `${helpers}\n\n${wrapped}`;
      }
      break;
    case 'java':
      wrapped = wrapJavaCode(code, functionName, args, {
        resultProcessor,
        resultType: invocationOptions.resultType
      });
      if (helpers) {
        wrapped = `${helpers}\n\n${wrapped}`;
      }
      break;
    case 'cpp':
      wrapped = wrapCppCode(code, functionName, args, {
        helperFunctions: helpers,
        resultProcessor,
        structDefinition: invocationOptions.structDefinition,
        structPattern: invocationOptions.structPattern
      });
      break;
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
  return wrapped;
};

const detectFunctionName = ({ code, language, fallbackFunctionName }) => {
  switch (language.toLowerCase()) {
    case 'javascript':
      return detectJavaScriptFunctionName(code, fallbackFunctionName);
    case 'python':
      return detectPythonFunctionName(code, fallbackFunctionName);
    case 'java':
      return detectJavaMethodName(code, fallbackFunctionName);
    case 'cpp':
      return detectCppFunctionName(code, fallbackFunctionName);
    default:
      return fallbackFunctionName;
  }
};

const buildWrappedCode = ({ problem, code, language, testCaseInput }) => {
  const storedFunction = problem?.function_name && typeof problem.function_name === 'string'
    ? problem.function_name.trim()
    : null;
  const fallbackFunctionName = storedFunction && storedFunction.length > 0
    ? storedFunction
    : sanitizeTitleToFunction(problem?.title || 'solution');
  const functionName = detectFunctionName({ code, language, fallbackFunctionName });
  const args = parseInputToParams(testCaseInput);
  let helpers = null;
  let processedArgs = args;
  let resultProcessor = null;
  let invocationOptions = {};
  const lowerLang = language.toLowerCase();

  if (lowerLang === 'python' && problem?.question_type) {
    const support = pythonSupportHelpers[problem.question_type];
    if (support) {
      helpers = support.helpers;
      resultProcessor = support.toOutput || null;
      processedArgs = args.map(arg => {
        if (!Array.isArray(arg)) {
          return arg;
        }
        const literal = toPythonLiteral(arg);
        return { __expr: `${support.fromInput}(${literal})` };
      });
    }
  }

  if (lowerLang === 'javascript' && problem?.question_type) {
    const support = javascriptSupportHelpers[problem.question_type];
    if (support) {
      helpers = support.helpers;
      resultProcessor = support.toOutput || null;
      processedArgs = args.map(arg => {
        if (!Array.isArray(arg)) {
          return arg;
        }
        const literal = toJavaScriptLiteral(arg);
        return { __expr: `${support.fromInput}(${literal})` };
      });
    }
  }

  if (lowerLang === 'cpp' && problem?.question_type) {
    const support = cppSupportHelpers[problem.question_type];
    if (support) {
      helpers = support.helperFunctions || null;
      resultProcessor = support.toOutput || null;
      if (support.structDefinition) {
        invocationOptions.structDefinition = support.structDefinition;
      }
      if (support.structPattern) {
        invocationOptions.structPattern = support.structPattern;
      }
      processedArgs = args.map(arg => {
        if (!Array.isArray(arg)) {
          return arg;
        }
        const literal = toCppLiteral(arg);
        return { __expr: `${support.fromInput}(${literal})` };
      });
    }
  }

  if (lowerLang === 'java' && problem?.question_type) {
    const support = javaSupportHelpers[problem.question_type];
    if (support) {
      const sanitizedJavaCode = typeof code === 'string'
        ? code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ')
        : '';
      const helperPieces = [];
      if (support.classDefinition && (!support.classPattern || !support.classPattern.test(sanitizedJavaCode))) {
        helperPieces.push(support.classDefinition);
      }
      if (support.helperFunctions) {
        helperPieces.push(support.helperFunctions);
      }
      helpers = helperPieces.length ? helperPieces.join('\n\n') : null;
      resultProcessor = support.toOutput || null;
      if (support.resultType) {
        invocationOptions.resultType = support.resultType;
      }
      processedArgs = args.map(arg => {
        if (!Array.isArray(arg)) {
          return arg;
        }
        const literalOptions = support.inputLiteralOptions || {};
        const literal = toJavaLiteral(arg, literalOptions);
        const argType = support.argumentType || 'Object';
        return { __expr: `${support.fromInput}(${literal})`, __type: argType };
      });
    }
  }

  return wrapCodeForExecution({
    code,
    language,
    functionName,
    args: processedArgs,
    helpers,
    resultProcessor,
    invocationOptions
  });
};

module.exports = {
  sanitizeTitleToFunction,
  parseInputToParams,
  detectJavaScriptFunctionName,
  detectPythonFunctionName,
  detectJavaClassName,
  detectJavaMethodName,
  wrapJavaCode,
  wrapCppCode,
  wrapJavaScriptCode,
  wrapPythonCode,
  wrapCodeForExecution,
  buildWrappedCode,
};