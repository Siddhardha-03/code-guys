/**
 * @file scaffoldings.js
 * @description Provides language-specific code template generation utilities for
 * competitive programming problems. Handles type inference, parameter mapping,
 * and support structure definitions across JavaScript, Python, Java, and C++.
 */

/**
 * Derives the most suitable Java data type for a sample value, attempting to
 * mimic LeetCode's heuristics so generated templates match expected signatures.
 */
export const deduceJavaType = (value) => {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'int[]';
    }
    const innerType = deduceJavaType(value[0]);
    return `${innerType}[]`;
  }
  if (value === null || value === undefined) {
    return 'Object';
  }
  const type = typeof value;
  if (type === 'number') {
    if (Number.isInteger(value)) {
      if (value >= -2147483648 && value <= 2147483647) {
        return 'int';
      }
      return 'long';
    }
    return 'double';
  }
  if (type === 'string') {
    return 'String';
  }
  if (type === 'boolean') {
    return 'boolean';
  }
  return 'Object';
};

/**
 * Safely interprets a raw string literal into a JavaScript value, supporting
 * primitive casts and JSON payloads used inside stored test cases.
 */
export const parseRawValue = (raw) => {
  if (raw === undefined || raw === null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric)) {
    return numeric;
  }
  try {
    return JSON.parse(trimmed);
  } catch (err) {
    return trimmed;
  }
};

/**
 * Normalizes multiline input blocks into an array of parsed values for use in
 * type inference and display.
 */
export const parseTestCaseInputs = (input = '') => {
  if (!input) return [];
  const normalized = input.replace(/\r/g, '').trim();
  if (!normalized) return [];
  return normalized
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(parseRawValue);
};

/**
 * Extracts return and parameter types from a persisted Java signature, falling
 * back to inferred defaults if the signature is unavailable or malformed.
 */
export const getJavaTypeFromSignature = (signature, fallback) => {
  if (!signature) return fallback;
  const returnMatch = signature.match(/^(public|protected|private)\s+(?:static\s+)?([^\s(]+)\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/);
  if (!returnMatch) return fallback;
  const returnType = returnMatch[2];
  const params = returnMatch[4].split(',').map(param => param.trim()).filter(Boolean);
  const paramTypes = params.map(p => p.split(/\s+/).slice(0, -1).join(' ') || p);
  return {
    returnType: returnType || fallback.returnType,
    paramTypes: paramTypes.length ? paramTypes : fallback.paramTypes
  };
};

/**
 * Infers Java type information directly from the first available test case to
 * keep generated starter code aligned with stored expectations.
 */
export const getJavaTypeFromTestCases = (testCases = [], fallback) => {
  if (!Array.isArray(testCases) || testCases.length === 0) return fallback;
  const firstCase = testCases[0];
  const parsedParams = parseTestCaseInputs(firstCase?.input || '');
  const parsedOutput = parseRawValue(firstCase?.expected_output);
  const paramTypes = parsedParams.map(deduceJavaType);
  const returnType = parsedOutput !== undefined ? deduceJavaType(parsedOutput) : fallback.returnType;
  return {
    returnType: returnType || fallback.returnType,
    paramTypes: paramTypes.length ? paramTypes : fallback.paramTypes
  };
};

/**
 * Provides deterministic fallback type mappings for each question category to
 * maintain predictable templates even without explicit schema data.
 */
export const getJavaFallbackTypes = (questionType) => {
  switch (questionType) {
    case 'string':
      return { returnType: 'String', paramTypes: ['String'] };
    case 'array':
      return { returnType: 'int[]', paramTypes: ['int[]'] };
    case 'primitives':
      return { returnType: 'int', paramTypes: ['int'] };
    case 'math':
      return { returnType: 'int', paramTypes: ['int'] };
    case 'matrix':
      return { returnType: 'int[][]', paramTypes: ['int[][]'] };
    case 'linked_list':
      return { returnType: 'ListNode', paramTypes: ['ListNode'] };
    case 'binary_tree':
      return { returnType: 'TreeNode', paramTypes: ['TreeNode'] };
    case 'graph':
      return { returnType: 'List<List<Integer>>', paramTypes: ['List<List<Integer>>'] };
    case 'custom_class':
      return { returnType: 'Object', paramTypes: ['Object'] };
    default:
      return { returnType: 'int', paramTypes: ['int'] };
  }
};

/**
 * Converts a problem title into a camelCase function identifier compatible with
 * each supported language when custom names are not provided.
 */
export const sanitizeFunctionName = (title) => {
  if (typeof title !== 'string' || !title.trim()) {
    return 'solution';
  }
  const words = title
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean);
  if (words.length === 0) {
    return 'solution';
  }
  const camel = words
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index === 0) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
  return camel || 'solution';
};

/**
 * Supplies language-specific support class definitions for Java templates when
 * problems rely on structured data such as lists or trees.
 */
export const getJavaSupportDefinition = (questionType) => {
  switch (questionType) {
    case 'linked_list':
      return `/**
* Definition for singly-linked list.
* public class ListNode {
*     int val;
*     ListNode next;
*     ListNode() {}
*     ListNode(int val) { this.val = val; }
*     ListNode(int val, ListNode next) { this.val = val; this.next = next; }
* }
 */`;
    case 'binary_tree':
      return `/**
* Definition for a binary tree node.
* public class TreeNode {
*     int val;
*     TreeNode left;
*     TreeNode right;
*     TreeNode() {}
*     TreeNode(int val) { this.val = val; }
*     TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
* }
 */`;
    case 'graph':
      return `/**
* Definition for a graph node.
* class GraphNode {
*     int val;
*     List<GraphNode> neighbors;
*     GraphNode() { neighbors = new ArrayList<>(); }
*     GraphNode(int val) { this.val = val; neighbors = new ArrayList<>(); }
* }
 */`;
    case 'custom_class':
      return `/**
 * Custom data type definition placeholder.
 */
`;
    default:
      return '';
  }
};

/**
 * Generates contextual helper comments for JavaScript users so data structures
 * like linked lists have a ready-made reference implementation.
 */
export const getJavaScriptSupportComment = (questionType) => {
  switch (questionType) {
    case 'linked_list':
      return `/**
* Definition for singly-linked list.
* function ListNode(val, next) {
*     this.val = (val === undefined ? 0 : val)
*     this.next = (next === undefined ? null : next)
* }
 */`;
    case 'binary_tree':
      return `/**
* Definition for a binary tree node.
* function TreeNode(val, left, right) {
*     this.val = (val === undefined ? 0 : val)
*     this.left = (left === undefined ? null : left)
*     this.right = (right === undefined ? null : right)
* }
 */`;
    case 'graph':
      return `/**
* Definition for a Node.
* function Node(val, neighbors) {
*     this.val = (val === undefined ? 0 : val)
*     this.neighbors = (neighbors === undefined ? [] : neighbors)
* }
 */`;
    case 'custom_class':
      return `/**
* Definition for custom object.
* function CustomType() {
*     // Define fields as needed
* }
 */`;
    default:
      return '';
  }
};

/**
 * Mirrors platform helper snippets in Python, allowing users to work with
 * complex inputs such as trees without manual boilerplate.
 */
export const getPythonSupportDefinition = (questionType) => {
  switch (questionType) {
    case 'linked_list':
      return `# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next
`;
    case 'binary_tree':
      return `# Definition for a binary tree node.
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right
`;
    case 'graph':
      return `# Definition for a graph node.
# class GraphNode:
#     def __init__(self, val=0, neighbors=None):
#         self.val = val
#         self.neighbors = neighbors or []
`;
    case 'custom_class':
      return `# Custom data type definition placeholder.
# class CustomType:
#     def __init__(self):
#         # Define fields as needed
#         pass
`;
    default:
      return '';
  }
};

/**
 * Ensures C++ templates include the required struct declarations for advanced
 * data types when applicable.
 */
export const getCppSupportComment = (questionType) => {
  switch (questionType) {
    case 'linked_list':
      return `/**
* Definition for singly-linked list.
* struct ListNode {
*     int val;
*     ListNode *next;
*     ListNode() : val(0), next(nullptr) {}
*     ListNode(int x) : val(x), next(nullptr) {}
*     ListNode(int x, ListNode *next) : val(x), next(next) {}
* };
 */`;
    case 'binary_tree':
      return `/**
* Definition for a binary tree node.
* struct TreeNode {
*     int val;
*     TreeNode *left;
*     TreeNode *right;
*     TreeNode() : val(0), left(nullptr), right(nullptr) {}
*     TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
*     TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
* };
 */`;
    case 'graph':
      return `/**
* Definition for a graph node.
* struct GraphNode {
*     int val;
*     vector<GraphNode*> neighbors;
*     GraphNode() : val(0), neighbors({}) {}
*     GraphNode(int x) : val(x), neighbors({}) {}
* };
 */`;
    case 'custom_class':
      return `/**
 * Custom data type definition placeholder.
 */
`;
    default:
      return '';
  }
};

/**
 * Reconciles persisted parameter schemas with inferred types to produce a
 * stable shape for template generation across languages.
 */
export const normalizeParameterSchema = (schema, fallbackTypes) => {
  if (!schema) {
    return {
      params: fallbackTypes.paramTypes.map((type, idx) => ({
        name: idx === 0 ? 'param' : `param${idx + 1}`,
        type
      })),
      returnType: fallbackTypes.returnType
    };
  }

  const params = Array.isArray(schema.params) && schema.params.length
    ? schema.params.map((param, idx) => ({
        name: param?.name?.trim() || (idx === 0 ? 'param' : `param${idx + 1}`),
        type: param?.type?.trim() || fallbackTypes.paramTypes[idx] || 'int'
      }))
    : fallbackTypes.paramTypes.map((type, idx) => ({
        name: idx === 0 ? 'param' : `param${idx + 1}`,
        type
      }));

  const returnType = schema.returnType?.trim() || fallbackTypes.returnType || 'int';

  return { params, returnType };
};

/**
 * Maps a canonical type descriptor to the closest JavaScript type annotation
 * for JSDoc generation.
 */
export const mapJsType = (type) => {
  const base = type?.trim();
  switch (base) {
    case 'int':
    case 'long':
    case 'double':
    case 'float':
      return 'number';
    case 'int[]':
    case 'long[]':
    case 'double[]':
    case 'float[]':
      return 'number[]';
    case 'boolean':
      return 'boolean';
    case 'boolean[]':
      return 'boolean[]';
    case 'char':
      return 'string';
    case 'char[]':
      return 'string[]';
    case 'String':
      return 'string';
    case 'String[]':
      return 'string[]';
    case 'List<List<Integer>>':
      return 'number[][]';
    case 'ListNode':
    case 'TreeNode':
      return base;
    case 'void':
      return 'void';
    case 'Any':
      return 'any';
    default:
      return base || 'any';
  }
};

/**
 * Translates canonical types into Python typing hints while collecting any
 * required imports.
 */
export const mapPythonType = (type) => {
  const base = type?.trim();
  switch (base) {
    case 'int':
    case 'long':
      return { hint: 'int' };
    case 'double':
    case 'float':
      return { hint: 'float' };
    case 'boolean':
      return { hint: 'bool' };
    case 'char':
    case 'String':
      return { hint: 'str' };
    case 'int[]':
    case 'long[]':
      return { hint: 'List[int]', imports: ['List'] };
    case 'double[]':
    case 'float[]':
      return { hint: 'List[float]', imports: ['List'] };
    case 'String[]':
    case 'char[]':
      return { hint: 'List[str]', imports: ['List'] };
    case 'boolean[]':
      return { hint: 'List[bool]', imports: ['List'] };
    case 'List<List<Integer>>':
      return { hint: 'List[List[int]]', imports: ['List'] };
    case 'ListNode':
      return { hint: 'Optional[ListNode]', imports: ['Optional'] };
    case 'TreeNode':
      return { hint: 'Optional[TreeNode]', imports: ['Optional'] };
    case 'void':
      return { hint: 'None' };
    case 'Any':
      return { hint: 'Any', imports: ['Any'] };
    default:
      if (!base) {
        return { hint: 'Any', imports: ['Any'] };
      }
      return { hint: 'Any', imports: ['Any'] };
  }
};

/**
 * Converts canonical types into idiomatic C++ signatures, differentiating
 * between return values and parameters where necessary.
 */
export const mapCppType = (type, { isReturn = false } = {}) => {
  const base = type?.trim();
  switch (base) {
    case 'int':
      return 'int';
    case 'long':
      return 'long long';
    case 'double':
      return 'double';
    case 'float':
      return 'double';
    case 'boolean':
      return 'bool';
    case 'char':
      return 'char';
    case 'String':
      return 'string';
    case 'void':
      return 'void';
    case 'int[]':
      return isReturn ? 'vector<int>' : 'vector<int>&';
    case 'long[]':
      return isReturn ? 'vector<long long>' : 'vector<long long>&';
    case 'double[]':
      return isReturn ? 'vector<double>' : 'vector<double>&';
    case 'float[]':
      return isReturn ? 'vector<double>' : 'vector<double>&';
    case 'String[]':
      return isReturn ? 'vector<string>' : 'vector<string>&';
    case 'char[]':
      return isReturn ? 'string' : 'string&';
    case 'boolean[]':
      return isReturn ? 'vector<bool>' : 'vector<bool>&';
    case 'List<List<Integer>>':
      return isReturn ? 'vector<vector<int>>' : 'vector<vector<int>>&';
    case 'ListNode':
      return 'ListNode*';
    case 'TreeNode':
      return 'TreeNode*';
    case 'Any':
      return isReturn ? 'auto' : 'auto';
    default:
      return null;
  }
};

/**
 * Assembles the Java starter template, merging helper structures, inferred
 * types, and saved parameter metadata into a single class definition.
 */
export const buildJavaTemplate = (functionName, typeInfo, questionType, parameterSchema) => {
  const fallback = {
    returnType: typeInfo.returnType || 'int',
    paramTypes: typeInfo.paramTypes && typeInfo.paramTypes.length ? typeInfo.paramTypes : ['int']
  };
  const normalized = normalizeParameterSchema(parameterSchema, fallback);
  const paramList = normalized.params
    .map(param => `${param.type} ${param.name}`)
    .join(', ');
  const supportComment = getJavaSupportDefinition(questionType);
  const prefix = supportComment ? `${supportComment}\n\n` : '';
  return `${prefix}class Solution {
    public ${normalized.returnType} ${functionName}(${paramList}) {
        // Write your solution here
        
    }
}`;
};

/**
 * Constructs the JavaScript starter code alongside relevant helper comments and
 * JSDoc annotations for clarity.
 */
export const buildJavascriptTemplate = (functionName, context) => {
  const support = getJavaScriptSupportComment(context.questionType);
  const jsDocParams = context.jsDocs
    .filter(doc => doc.name)
    .map(doc => ` * @param {${doc.type}} ${doc.name}`)
    .join('\n');
  const jsDocReturn = ` * @return {${context.jsReturnType || 'any'}}`;
  const paramsList = context.normalized.params.map(param => param.name).join(', ');
  const docBlock = jsDocParams ? `/**\n${jsDocParams}\n${jsDocReturn}\n */` : `/**\n${jsDocReturn}\n */`;
  const supportBlock = support ? `${support}\n\n` : '';
  return `${supportBlock}${docBlock}
var ${functionName} = function(${paramsList}) {
    // Write your solution here
    
};`;
};

/**
 * Produces the Python solution scaffold with optional typing imports and helper
 * definitions tailored to the selected problem type.
 */
export const buildPythonTemplate = (functionName, context) => {
  const supportDefinition = getPythonSupportDefinition(context.questionType);
  const importLine = context.pythonImports.length
    ? `from typing import ${context.pythonImports.join(', ')}\n\n`
    : '';
  const params = context.pythonParams
    .map(param => `${param.name}: ${param.hint || 'Any'}`)
    .join(', ');
  const args = params ? `, ${params}` : '';
  const returnHint = context.pythonReturnHint ? ` -> ${context.pythonReturnHint}` : '';
  const supportBlock = supportDefinition ? `${supportDefinition}\n\n` : '';
  return `${supportBlock}${importLine}class Solution:
    def ${functionName}(self${args})${returnHint}:
        # Write your solution here
        pass`;
};

/**
 * Generates C++ boilerplate, appending structure helpers as needed and
 * preserving the Solution class interface expected by the judge.
 */
export const buildCppTemplate = (functionName, context) => {
  const support = getCppSupportComment(context.questionType);
  const params = context.normalized.params
    .map((param, idx) => {
      const type = context.cppParamTypes[idx] || 'auto';
      return `${type} ${param.name}`;
    })
    .join(', ');
  const supportBlock = support ? `${support}\n` : '';
  return `${supportBlock}class Solution {
public:
    ${context.cppReturnType} ${functionName}(${params}) {
        // Write your solution here
        
    }
};
`;
};

/**
 * Central orchestrator that selects the appropriate language template and
 * consolidates function naming, typing details, and helper code.
 */
export const getCodeTemplate = (problem, language, testCases = []) => {
  const problemTitle = problem?.title || 'Solution';
  const storedFunctionName = typeof problem?.function_name === 'string' ? problem.function_name.trim() : '';
  const functionName = storedFunctionName || sanitizeFunctionName(problemTitle);
  const javaSignature = problem?.java_function_signature;
  const javaFallbackTypes = getJavaFallbackTypes(problem?.question_type);
  const javaTypesFromTests = getJavaTypeFromTestCases(testCases, javaFallbackTypes);
  let parameterSchema = problem?.parameter_schema;
  if (typeof parameterSchema === 'string') {
    try {
      parameterSchema = JSON.parse(parameterSchema);
    } catch (err) {
      parameterSchema = null;
    }
  }
  const normalizedParams = normalizeParameterSchema(parameterSchema, {
    returnType: javaTypesFromTests.returnType,
    paramTypes: javaTypesFromTests.paramTypes
  });
  const jsDocEntries = normalizedParams.params.map(param => ({
    name: param.name,
    type: mapJsType(param.type)
  }));
  const jsReturnType = mapJsType(normalizedParams.returnType);

  const pythonImportsSet = new Set();
  const pythonParams = normalizedParams.params.map(param => {
    const info = mapPythonType(param.type);
    if (info.imports) {
      info.imports.forEach(imp => pythonImportsSet.add(imp));
    }
    return {
      name: param.name,
      hint: info.hint
    };
  });
  const pythonReturnInfo = mapPythonType(normalizedParams.returnType);
  if (pythonReturnInfo.imports) {
    pythonReturnInfo.imports.forEach(imp => pythonImportsSet.add(imp));
  }
  const pythonReturnHint = pythonReturnInfo.hint;
  const pythonImports = Array.from(pythonImportsSet).sort();

  const cppTypesFromJava = javaTypesFromTests.paramTypes.map(type => {
    switch (type) {
      case 'int[]':
        return 'vector<int>&';
      case 'int[][]':
        return 'vector<vector<int>>&';
      case 'String':
        return 'string';
      case 'boolean':
        return 'bool';
      case 'double':
        return 'double';
      case 'long':
        return 'long long';
      case 'ListNode':
        return 'ListNode*';
      case 'TreeNode':
        return 'TreeNode*';
      case 'List<List<Integer>>':
        return 'vector<vector<int>>&';
      default:
        return 'int';
    }
  });
  const cppFallbackReturnType = (() => {
    switch (javaTypesFromTests.returnType) {
      case 'int[]':
        return 'vector<int>';
      case 'int[][]':
        return 'vector<vector<int>>';
      case 'String':
        return 'string'; 
      case 'boolean':
        return 'bool';
      case 'double':
        return 'double';
      case 'long':
        return 'long long';
      case 'ListNode':
        return 'ListNode*';
      case 'TreeNode':
        return 'TreeNode*';
      case 'List<List<Integer>>':
        return 'vector<vector<int>>';
      default:
        return 'int';
    }
  })();

  const cppParamTypes = normalizedParams.params.map((param, idx) => mapCppType(param.type) || cppTypesFromJava[idx] || 'auto');
  const resolvedCppReturnType = mapCppType(normalizedParams.returnType, { isReturn: true }) || cppFallbackReturnType || 'int';
  const templateContext = {
    questionType: problem?.question_type,
    normalized: normalizedParams,
    jsDocs: jsDocEntries,
    jsReturnType,
    pythonParams,
    pythonReturnHint,
    pythonImports,
    cppParamTypes,
    cppReturnType: resolvedCppReturnType
  };

  const javaTypeInfo = javaSignature
    ? getJavaTypeFromSignature(javaSignature, javaTypesFromTests)
    : javaTypesFromTests;

  switch (language) {
    case 'python':
      return buildPythonTemplate(functionName, templateContext);
    case 'java':
      return buildJavaTemplate(functionName, javaTypeInfo, problem?.question_type, parameterSchema);
    case 'cpp':
      return buildCppTemplate(functionName, templateContext);
    case 'javascript':
    default:
      return buildJavascriptTemplate(functionName, templateContext);
  }
};
