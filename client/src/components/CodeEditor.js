import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from '../contexts/ThemeContext';

const CodeEditor = ({ 
  code, 
  language, 
  onChange, 
  height = '600px',
  readOnly = false,
  showHeader = true,
  title = 'Code Editor'
}) => {
  const [editorValue, setEditorValue] = useState(code || '');
  const { isDark } = useTheme();
  const monacoRef = useRef(null);
  const editorInstanceRef = useRef(null);
  const themeDefinedRef = useRef(false);

  useEffect(() => {
    setEditorValue(code || '');
  }, [code, language]);

  const handleEditorChange = (value) => {
    setEditorValue(value);
    if (onChange) {
      onChange(value);
    }
  };

  const getLanguageId = (lang) => {
    // Map language identifiers to Monaco editor language IDs
    const languageMap = {
      'javascript': 'javascript',
      'python': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'csharp': 'csharp',
      'go': 'go',
      'ruby': 'ruby',
      'php': 'php',
      'typescript': 'typescript',
      'swift': 'swift',
      'kotlin': 'kotlin',
      'rust': 'rust',
    };
    
    return languageMap[lang.toLowerCase()] || lang.toLowerCase();
  };

  const editorOptions = {
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'JetBrains Mono, Fira Code, Consolas, Liberation Mono, Menlo, Courier, monospace',
    automaticLayout: true,
    readOnly: readOnly,
    wordWrap: 'on',
    lineNumbers: 'on',
    folding: true,
    renderLineHighlight: 'all',
    suggestOnTriggerCharacters: true,
    formatOnPaste: true,
    formatOnType: true,
    bracketPairColorization: { enabled: true },
    guides: {
      bracketPairs: true,
      indentation: true
    },
    padding: { top: 16, bottom: 16 },
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    renderWhitespace: 'selection',
    fontLigatures: false,
    cursorSmoothCaretAnimation: true
  };

  const ensureNightfallTheme = (monaco) => {
    if (themeDefinedRef.current) return;

    monaco.editor.defineTheme('nightfall-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: 'E0E0E0', background: '181A1F' },
        { token: 'comment', foreground: '6A737D', fontStyle: 'italic' },
        { token: 'keyword', foreground: '82AAFF' },
        { token: 'keyword.control', foreground: '82AAFF' },
        { token: 'keyword.operator', foreground: '82AAFF' },
        { token: 'string', foreground: 'F78C6C' },
        { token: 'string.escape', foreground: 'F8BD7F' },
        { token: 'number', foreground: '89DDFF' },
        { token: 'regexp', foreground: 'F7768E' },
        { token: 'operator', foreground: 'E0E0E0' },
        { token: 'namespace', foreground: '89DDFF' },
        { token: 'type', foreground: '89DDFF' },
        { token: 'predefined', foreground: '89DDFF' },
        { token: 'function', foreground: 'FFD866' },
        { token: 'method', foreground: 'FFD866' },
        { token: 'identifier', foreground: 'E0E0E0' },
        { token: 'parameter', foreground: 'C3E88D' }
      ],
      colors: {
        'editor.background': '#181A1F',
        'editor.foreground': '#E0E0E0',
        'editorLineNumber.foreground': '#3D4757',
        'editorLineNumber.activeForeground': '#9DA8BF',
        'editorCursor.foreground': '#4dabf7',
        'editor.selectionBackground': '#264F7899',
        'editor.inactiveSelectionBackground': '#264F7844',
        'editorLineHighlightBackground': '#20232B',
        'editor.lineHighlightBorder': '#20232B',
        'editorIndentGuide.background': '#2A2D37',
        'editorIndentGuide.activeBackground': '#3C4250',
        'editor.selectionHighlightBackground': '#264F7844',
        'editor.hoverHighlightBackground': '#264F7826',
        'editorLink.activeForeground': '#4dabf7',
        'editorBracketMatch.background': '#3C4354',
        'editorBracketMatch.border': '#4dabf7',
        'editorWhitespace.foreground': '#2C313C',
        'editorGutter.background': '#181A1F',
        'editorSuggestWidget.background': '#1f1f24',
        'editorSuggestWidget.foreground': '#E0E0E0',
        'editorSuggestWidget.selectedBackground': '#2a2d38',
        'editorHoverWidget.background': '#1f1f24',
        'editorHoverWidget.border': '#333333',
        'editorWidget.background': '#1f1f24'
      }
    });

    themeDefinedRef.current = true;
  };

  const handleEditorWillMount = (monaco) => {
    ensureNightfallTheme(monaco);
    monacoRef.current = monaco;
  };

  useEffect(() => {
    if (monacoRef.current && editorInstanceRef.current) {
      monacoRef.current.editor.setTheme(isDark ? 'nightfall-dark' : 'vs');
    }
  }, [isDark]);

  const currentTheme = isDark ? 'nightfall-dark' : 'vs';

  return (
    <div className="code-editor-container">
      {showHeader && (
        <div className="code-editor-header">
          <div className="code-editor-title">
            {title} - {language.toUpperCase()}
          </div>
          <div className="code-editor-actions">
            <span className="text-xs text-muted">
              {editorValue.split('\n').length} lines
            </span>
          </div>
        </div>
      )}
      <Editor
        height={height}
        language={getLanguageId(language)}
        value={editorValue}
        theme={currentTheme}
        beforeMount={handleEditorWillMount}
        onMount={(editor, monaco) => {
          editorInstanceRef.current = editor;
          monacoRef.current = monaco;
          ensureNightfallTheme(monaco);
          monaco.editor.setTheme(currentTheme);
        }}
        onChange={handleEditorChange}
        options={editorOptions}
        className="w-full"
      />
    </div>
  );
};

export default CodeEditor;