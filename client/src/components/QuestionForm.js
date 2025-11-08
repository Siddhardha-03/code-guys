import React, { useState, useEffect } from 'react';
import { createQuestion, updateQuestion, getAllTestCases } from '../services/adminService';

const QuestionForm = ({ question, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    function_name: '',
    description: '',
    difficulty: 'Easy',
    question_type: '',
    parameter_schema: { params: [{ name: '', type: '' }], returnType: '' },
    language_supported: { languages: ['javascript', 'python', 'java', 'cpp'] },
    tags: { tags: [] },
    examples: [],
    testCases: [{ input: '', expected_output: '', hidden: false }]
  });
  const [loading, setLoading] = useState(false);
  const [loadingTestCases, setLoadingTestCases] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadQuestionData = async () => {
      if (question) {
        // Handle different data formats from API
        let languageSupported;
        if (Array.isArray(question.language_supported)) {
          languageSupported = { languages: question.language_supported };
        } else if (question.language_supported && question.language_supported.languages) {
          languageSupported = question.language_supported;
        } else {
          languageSupported = { languages: ['javascript', 'python', 'java', 'cpp'] };
        }

        let tags;
        if (Array.isArray(question.tags)) {
          tags = { tags: question.tags };
        } else if (question.tags && question.tags.tags) {
          tags = question.tags;
        } else {
          tags = { tags: [] };
        }

        let parameterSchema;
        if (typeof question.parameter_schema === 'string') {
          try {
            parameterSchema = JSON.parse(question.parameter_schema);
          } catch (e) {
            parameterSchema = { params: [{ name: '', type: '' }], returnType: '' };
          }
        } else if (question.parameter_schema && typeof question.parameter_schema === 'object') {
          parameterSchema = question.parameter_schema;
        } else {
          parameterSchema = { params: [{ name: '', type: '' }], returnType: '' };
        }
        if (!parameterSchema.params || parameterSchema.params.length === 0) {
          parameterSchema = { ...parameterSchema, params: [{ name: '', type: '' }] };
        }

        // Fetch test cases for editing
        let testCases = [{ input: '', expected_output: '', hidden: false }];
        if (question.id) {
          setLoadingTestCases(true);
          try {
            const testCasesData = await getAllTestCases(question.id);
            if (testCasesData.testCases && testCasesData.testCases.length > 0) {
              // Ensure hidden field is properly converted to boolean
              testCases = testCasesData.testCases.map(tc => ({
                ...tc,
                hidden: Boolean(tc.hidden)
              }));
            }
          } catch (err) {
            console.error('Failed to fetch test cases:', err);
            setError('Failed to load test cases. Using default test case.');
          } finally {
            setLoadingTestCases(false);
          }
        }

        setFormData({
          title: question.title || '',
          function_name: question.function_name || '',
          description: question.description || '',
          difficulty: question.difficulty || 'Easy',
          question_type: question.question_type || '',
          parameter_schema: parameterSchema,
          language_supported: languageSupported,
          tags: tags,
          examples: question.examples || [],
          testCases: testCases
        });
      }
    };

    loadQuestionData();
  }, [question]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTagsChange = (e) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
    setFormData(prev => ({
      ...prev,
      tags: { tags }
    }));
  };

  const handleLanguagesChange = (e) => {
    const { value, checked } = e.target;
    setFormData(prev => {
      const languages = prev.language_supported?.languages || [];
      if (checked) {
        return {
          ...prev,
          language_supported: { languages: [...languages, value] }
        };
      } else {
        return {
          ...prev,
          language_supported: { languages: languages.filter(lang => lang !== value) }
        };
      }
    });
  };

  const handleTestCaseChange = (index, field, value) => {
    setFormData(prev => {
      const testCases = [...prev.testCases];
      // Ensure boolean values for hidden field
      const newValue = field === 'hidden' ? Boolean(value) : value;
      testCases[index] = { ...testCases[index], [field]: newValue };
      return { ...prev, testCases };
    });
  };

  const handleParameterChange = (index, field, value) => {
    setFormData(prev => {
      const params = [...(prev.parameter_schema?.params || [])];
      params[index] = { ...params[index], [field]: value };
      return {
        ...prev,
        parameter_schema: {
          returnType: prev.parameter_schema?.returnType || '',
          params
        }
      };
    });
  };

  const typeOptions = [
    'void',
    'int',
    'long',
    'double',
    'float',
    'boolean',
    'char',
    'String',
    'int[]',
    'long[]',
    'double[]',
    'String[]',
    'ListNode',
    'TreeNode',
    'List<List<Integer>>'
  ];

  const handleReturnTypeChange = (value) => {
    setFormData(prev => ({
      ...prev,
      parameter_schema: {
        returnType: value,
        params: prev.parameter_schema?.params?.length ? prev.parameter_schema.params : [{ name: '', type: '' }]
      }
    }));
  };

  const addParameter = () => {
    setFormData(prev => ({
      ...prev,
      parameter_schema: {
        returnType: prev.parameter_schema?.returnType || '',
        params: [...(prev.parameter_schema?.params || []), { name: '', type: '' }]
      }
    }));
  };

  const removeParameter = (index) => {
    setFormData(prev => {
      const params = (prev.parameter_schema?.params || []).filter((_, i) => i !== index);
      return {
        ...prev,
        parameter_schema: {
          returnType: prev.parameter_schema?.returnType || '',
          params: params.length ? params : [{ name: '', type: '' }]
        }
      };
    });
  };

  const addTestCase = () => {
    setFormData(prev => ({
      ...prev,
      testCases: [...prev.testCases, { input: '', expected_output: '', hidden: false }]
    }));
  };

  const removeTestCase = (index) => {
    setFormData(prev => ({
      ...prev,
      testCases: prev.testCases.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate form data
    if (!formData.title.trim()) {
      setError('Title is required');
      setLoading(false);
      return;
    }

    if (!formData.description.trim()) {
      setError('Description is required');
      setLoading(false);
      return;
    }

    if (!formData.testCases || formData.testCases.length === 0) {
      setError('At least one test case is required');
      setLoading(false);
      return;
    }

    // Validate test cases
    for (let i = 0; i < formData.testCases.length; i++) {
      const testCase = formData.testCases[i];
      if (!testCase.input.trim() || !testCase.expected_output.trim()) {
        setError(`Test case ${i + 1} must have both input and expected output`);
        setLoading(false);
        return;
      }
    }

    try {
      console.log('=== FORM SUBMISSION ===');
      console.log('Full form data:', JSON.stringify(formData, null, 2));
      console.log('Test cases specifically:', formData.testCases);
      console.log('Test cases count:', formData.testCases?.length);
      
      if (question && question.id) {
        console.log('Updating question with ID:', question.id);
        console.log('Sending update request with data:', {
          ...formData,
          testCases: formData.testCases
        });
        const result = await updateQuestion(question.id, formData);
        console.log('Update result:', result);
      } else {
        console.log('Creating new question');
        const result = await createQuestion(formData);
        console.log('Create result:', result);
      }
      
      // Call onSave callback to refresh the parent component
      if (onSave) {
        onSave();
      }
    } catch (err) {
      console.error('Form submission error:', err);
      setError(err.message || 'Failed to save question');
    } finally {
      setLoading(false);
    }
  };

  const availableLanguages = ['javascript', 'python', 'java', 'cpp', 'c', 'csharp'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                {question ? 'Edit Question' : 'Create New Question'}
              </h3>
              <p className="text-blue-100 text-sm">
                {question ? 'Update the coding question details' : 'Add a new coding challenge'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="p-6">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-red-800 font-medium">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Basic Information
                </h4>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Question Title</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Enter a clear, descriptive title..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Function Name (optional)</label>
                    <input
                      type="text"
                      name="function_name"
                      value={formData.function_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="e.g., twoSum, maxDepth"
                    />
                    <p className="text-xs text-gray-500 mt-1">Used to pre-populate function signatures across languages. Leave blank to auto-generate.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
                    <select
                      name="question_type"
                      value={formData.question_type}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="">Select type</option>
                      <option value="array">Array</option>
                      <option value="string">String</option>
                      <option value="primitives">Primitives</option>
                      <option value="math">Math</option>
                      <option value="matrix">Matrix</option>
                      <option value="linked_list">Linked List</option>
                      <option value="binary_tree">Binary Tree</option>
                      <option value="graph">Graph</option>
                      <option value="custom_class">Custom Class</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Used to generate accurate language scaffolds (e.g., Math for numeric input/output)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level</label>
                    <select
                      name="difficulty"
                      value={formData.difficulty}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="Easy">🟢 Easy</option>
                      <option value="Medium">🟡 Medium</option>
                      <option value="Hard">🔴 Hard</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                    <input
                      type="text"
                      value={formData.tags?.tags?.join(', ') || ''}
                      onChange={handleTagsChange}
                      placeholder="array, hash table, dynamic programming"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Problem Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Describe the problem clearly. You can use HTML tags for formatting..."
                  />
                  <p className="text-xs text-gray-500 mt-1">HTML formatting supported</p>
                </div>
              </div>

              {/* Parameter Schema Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Function Signature
                  </h4>
                  <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full">
                    {(formData.parameter_schema?.params || []).length} parameter(s)
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Return Type</label>
                    <select
                      value={formData.parameter_schema?.returnType || ''}
                      onChange={(e) => handleReturnTypeChange(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="">Select return type</option>
                      {typeOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  {formData.parameter_schema?.params?.map((param, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="font-medium text-gray-900">Parameter {index + 1}</h5>
                        {formData.parameter_schema.params.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeParameter(index)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                          <input
                            type="text"
                            value={param.name || ''}
                            onChange={(e) => handleParameterChange(index, 'name', e.target.value)}
                            placeholder="nums, head, root, etc"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                          <select
                            value={param.type || ''}
                            onChange={(e) => handleParameterChange(index, 'type', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          >
                            <option value="">Select type</option>
                            {typeOptions.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addParameter}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Parameter
                </button>
              </div>

              {/* Supported Languages Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Supported Programming Languages
                </h4>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {availableLanguages.map(lang => (
                    <label key={lang} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-white transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        value={lang}
                        checked={formData.language_supported?.languages?.includes(lang) || false}
                        onChange={handleLanguagesChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700 capitalize">{lang}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Test Cases Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Test Cases
                  </h4>
                  <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full">
                    {formData.testCases.length} total • {formData.testCases.filter(tc => !tc.hidden).length} visible • {formData.testCases.filter(tc => tc.hidden).length} hidden
                  </div>
                </div>

                {loadingTestCases && (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-sm text-gray-600">Loading test cases...</p>
                  </div>
                )}

                <div className="space-y-4">
                  {formData.testCases.map((testCase, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium text-gray-900">Test Case {index + 1}</h5>
                        <div className="flex items-center space-x-3">
                          <label className="flex items-center text-sm text-gray-600">
                            <input
                              type="checkbox"
                              checked={testCase.hidden}
                              onChange={(e) => handleTestCaseChange(index, 'hidden', e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
                            />
                            Hidden from students
                          </label>
                          {formData.testCases.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTestCase(index)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Input</label>
                          <textarea
                            value={testCase.input}
                            onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm"
                            placeholder="Enter test input..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Expected Output</label>
                          <textarea
                            value={testCase.expected_output}
                            onChange={(e) => handleTestCaseChange(index, 'expected_output', e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm"
                            placeholder="Enter expected output..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addTestCase}
                  className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Another Test Case
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      {question ? 'Update Question' : 'Create Question'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionForm;
