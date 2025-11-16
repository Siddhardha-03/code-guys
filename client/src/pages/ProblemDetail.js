/**
 * @file ProblemDetail.js
 * @description Presents the interactive coding problem workspace, including
 * dynamic code template generation, auto-saving drafts, test execution, and
 * submission handling for multiple languages.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuestion } from '../services/questionService';
import {
  runCode as runSubmissionCode,
  submitCode as submitSolution,
  getQuestionSubmissions,
  getCodeDraft,
  saveCodeDraft
} from '../services/submissionService';
import CodeEditor from '../components/CodeEditor';
import OutputModal from '../components/OutputModal';
import { getCodeTemplate } from '../utils/scaffoldings';

/**
 * Main ProblemDetail component rendering the coding workspace and orchestrating
 * data fetching, language-aware templates, draft persistence, and submissions.
 */
const ProblemDetail = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Problem metadata and test case collections retrieved from the API.
  const [problem, setProblem] = useState(null);
  const [testCases, setTestCases] = useState([]);
  const [testCaseIndex, setTestCaseIndex] = useState(0);
  
  // Code editor state
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  
  // Output state: captured console text plus structured per-test results.
  const [output, setOutput] = useState('');
  const [testResults, setTestResults] = useState([]);
  const [resultStatus, setResultStatus] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('description');
  const [showOutputModal, setShowOutputModal] = useState(false);
  
  // Submission tracking
  const [submissions, setSubmissions] = useState([]);
  const [submissionStats, setSubmissionStats] = useState({
    attempts: 0,
    solved: false,
    bestTime: null
  });

  // Refs track auto-save cycles and initialization to prevent redundant writes.
  const saveTimeoutRef = useRef(null);
  const lastSavedRef = useRef('');
  const isInitializingRef = useRef(true);
  const languageRef = useRef(language);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  /**
   * Retrieves the most relevant code draft for the active language or falls
   * back to a generated template when no draft exists.
   */
  const loadCodeForLanguage = useCallback(async (questionData, lang, availableTestCases = []) => {
    if (!questionData) {
      isInitializingRef.current = false;
      return;
    }

    try {
      let draftCode = null;

      const draftResponse = await getCodeDraft(questionData.id || id, lang);
      draftCode = draftResponse?.code;

      if (typeof draftCode === 'string' && draftCode.length > 0) {
        setCode(draftCode);
        lastSavedRef.current = draftCode;
      } else {
        const template = getCodeTemplate(questionData, lang, availableTestCases);
        setCode(template);
        lastSavedRef.current = template;
      }
    } catch (draftError) {
      console.error('Failed to load code draft:', draftError);
      const fallbackTemplate = getCodeTemplate(questionData, lang, availableTestCases);
      setCode(fallbackTemplate);
      lastSavedRef.current = fallbackTemplate;
    } finally {
      isInitializingRef.current = false;
    }
  }, [user, id]);

  // Fetch user submissions for this problem
  /**
   * Fetches historical submissions to update attempt statistics without
   * blocking the main problem loading flow.
   */
  const fetchSubmissions = useCallback(async () => {
    if (!user || !id) return;
    
    try {
      const submissionsData = await getQuestionSubmissions(id);
      setSubmissions(submissionsData);
      
      // Calculate stats
      const userSubmissions = submissionsData.filter(sub => sub.user_id === user.id);
      const solvedSubmissions = userSubmissions.filter(sub => sub.passed);
      setSubmissionStats({
        attempts: userSubmissions.length,
        solved: solvedSubmissions.length > 0,
        bestTime: solvedSubmissions.length > 0 ? Math.min(...solvedSubmissions.map(s => s.execution_time || 0)) : null
      });
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    }
  }, [user, id]);

  /**
   * Loads the complete problem payload, initializes templates, and chains the
   * submission history refresh once data is available.
   */
  const fetchProblem = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getQuestion(id);
      setProblem(data.question);
      setTestCases(data.testCases || []);
      isInitializingRef.current = true;
      await loadCodeForLanguage(data.question, languageRef.current, data.testCases || []);
      
      // Fetch submissions after problem is loaded
      await fetchSubmissions();
    } catch (err) {
      setError('Failed to load problem. Please try again.');
      console.error('Problem fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [id, fetchSubmissions, loadCodeForLanguage]);

  useEffect(() => {
    fetchProblem();
  }, [fetchProblem]);

  /**
   * Updates the editor language and pulls the associated draft/template without
   * losing the loaded problem context.
   */
  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    isInitializingRef.current = true;
    setLanguage(newLanguage);

    if (problem) {
      loadCodeForLanguage(problem, newLanguage, testCases);
    }
  };

  /**
   * Keeps the editor content synchronized with component state for downstream
   * auto-save and execution handlers.
   */
  const handleCodeChange = (value) => {
    setCode(value);
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!problem) return;
    if (isInitializingRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounced auto-save to persist drafts without overwhelming the API.
    saveTimeoutRef.current = setTimeout(async () => {
      if (code === lastSavedRef.current) return;
      try {
        await saveCodeDraft(id, { language, code });
        lastSavedRef.current = code;
      } catch (draftError) {
        console.error('Failed to save code draft:', draftError);
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [code, language, id, user, problem]);

  /**
   * Runs the current code against a single visible test case to provide fast
   * feedback, highlighting pass/fail status along with stdout and errors.
   */
  const handleRunCode = async () => {
    if (!testCases || testCases.length === 0) {
      setError('No test cases available');
      return;
    }

    const currentTestCase = testCases[testCaseIndex];

    setExecuting(true);
    setError('');
    setOutput('');
    setTestResults([]);
    setResultStatus(null);

    try {
      const response = await runSubmissionCode({
        code,
        language,
        questionId: id,
        testCaseId: currentTestCase?.id
      });

      const expectedOutput = response?.expectedOutput ?? '';
      const actualOutput = response?.actualOutput ?? '';
      const errorOutput = response?.error ?? '';
      const inputValue = response?.input ?? currentTestCase?.input ?? '';
      const hidden = Boolean(response?.hidden || currentTestCase?.hidden);
      const passed = Boolean(response?.passed);

      const statusMessage = passed
        ? `✅ Test Case ${testCaseIndex + 1} Passed!`
        : errorOutput
          ? `❌ Test Case ${testCaseIndex + 1} encountered an error.`
          : `❌ Test Case ${testCaseIndex + 1} Failed.`;

      const details = [
        statusMessage,
        '',
        `Input: ${inputValue || '—'}`,
        `Expected: ${expectedOutput || '—'}`,
        `Actual: ${actualOutput || (errorOutput ? 'Error' : 'No output')}`
      ];

      if (errorOutput) {
        details.push(`Error: ${errorOutput}`);
      }

      setOutput(details.join('\n'));

      setTestResults([
        {
          testCaseNumber: testCaseIndex + 1,
          input: inputValue,
          expectedOutput,
          actualOutput,
          error: errorOutput,
          passed,
          hidden,
          stdout: response?.stdout || '',
          stderr: response?.stderr || '',
          compileOutput: response?.compileOutput || ''
        }
      ]);
      setResultStatus(passed ? 'success' : errorOutput ? 'error' : 'failed');
      
      // Open modal on mobile after execution
      if (window.innerWidth < 1024) {
        setShowOutputModal(true);
      }
    } catch (err) {
      setError(err.message || 'Failed to execute code');
      setResultStatus('error');
    } finally {
      setExecuting(false);
    }
  };

  /**
   * Executes a full submission by delegating to the judge service and
   * translating the response into human-readable summaries and result lists.
   */
  const handleSubmitCode = async () => {
    if (!testCases || testCases.length === 0) {
      setError('No test cases available');
      return;
    }

    setSubmitting(true);
    setError('');
    setOutput('Running all test cases for final submission...\n');
    setResultStatus(null);

    try {
      const response = await submitSolution(id, { code, language });

      const results = response?.results || [];
      const totalTests = results.length;
      const passedCount = results.filter(result => result.passed).length;
      const allPassed = Boolean(response?.passed);
      const anyErrors = results.some(result => result.error);
      const successRate = totalTests > 0 ? ((passedCount / totalTests) * 100).toFixed(1) : '0.0';

      let finalOutput = `${'='.repeat(60)}\n`;
      finalOutput += `🏆 FINAL SUBMISSION RESULTS\n`;
      finalOutput += `${'='.repeat(60)}\n\n`;

      if (allPassed) {
        finalOutput += `🎉 ACCEPTED! All ${totalTests} test cases passed!\n\n`;
      } else {
        finalOutput += `❌ FAILED: ${passedCount}/${totalTests} test cases passed (${successRate}%)\n\n`;
      }

      if (response?.submissionId) {
        finalOutput += `Submission ID: ${response.submissionId}\n\n`;
      }

      if (results.length > 0) {
        const perCase = results.map((result, index) => {
          const status = result.passed ? 'PASS' : (result.error ? 'ERROR' : 'FAIL');
          const lines = [
            `Test Case ${index + 1}: ${status}`,
            `  Expected: ${result.expectedOutput || '—'}`,
            `  Actual: ${result.actualOutput || (result.error ? 'Error' : 'No output')}`
          ];

          if (result.error) {
            lines.push(`  Error: ${result.error}`);
          }

          return lines.join('\n');
        }).join('\n\n');

        finalOutput += `${perCase}\n\n`;
      }

      setOutput(finalOutput);

      setTestResults(results.map((result, index) => ({
        testCaseNumber: index + 1,
        input: result.input,
        expectedOutput: result.expectedOutput,
        actualOutput: result.actualOutput,
        error: result.error,
        passed: result.passed,
        hidden: result.hidden
      })));

      if (allPassed) {
        setResultStatus('success');
      } else if (anyErrors) {
        setResultStatus('error');
      } else {
        setResultStatus('failed');
      }

      // Open modal on mobile after submission
      if (window.innerWidth < 1024) {
        setShowOutputModal(true);
      }

      await fetchSubmissions();

      try {
        localStorage.setItem('practiceNeedsRefresh', 'true');
        window.dispatchEvent(new Event('practiceProgressUpdated'));
      } catch (storageError) {
        console.error('Failed to notify practice page refresh:', storageError);
      }
    } catch (err) {
      setError(`Submission failed: ${err.message || 'Unknown error occurred'}`);
      setResultStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error && !problem) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Problem Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="w-full px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <button
                onClick={() => navigate('/practice')}
                className="text-gray-600 hover:text-gray-900 flex items-center gap-2 text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Back to Problems
              </button>
              <div className="w-full sm:w-auto">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{problem?.title || 'Loading...'}</h1>
                <div className="flex items-center gap-2 sm:gap-3 mt-2 flex-wrap">
                  {problem?.difficulty && (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      problem.difficulty.toLowerCase() === 'easy' ? 'bg-green-100 text-green-800' :
                      problem.difficulty.toLowerCase() === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {problem.difficulty}
                    </span>
                  )}
                  {user && submissionStats.solved && (
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      Solved
                    </span>
                  )}
                  {user && submissionStats.attempts > 0 && (
                    <span className="text-xs sm:text-sm text-gray-600">
                      {submissionStats.attempts} attempt{submissionStats.attempts !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {problem?.tags && (
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                {problem.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md">
                    {tag}
                  </span>
                ))}
                {problem.tags.length > 3 && (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-md">
                    +{problem.tags.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-3 sm:px-6 py-4 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,45%)_minmax(0,55%)] gap-4 sm:gap-6 items-start">
          {/* Left Panel - Problem Description with Tabs */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden order-2 lg:order-1">
            {/* Tab Navigation */}
            <div className="border-b bg-gray-50 overflow-x-auto">
              <nav className="flex min-w-max">
                <button
                  onClick={() => setActiveTab('description')}
                  className={`px-3 sm:px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                    activeTab === 'description'
                      ? 'border-blue-500 text-blue-600 bg-white'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Description
                </button>
                {user && (
                  <button
                    onClick={() => setActiveTab('submissions')}
                    className={`px-3 sm:px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                      activeTab === 'submissions'
                        ? 'border-blue-500 text-blue-600 bg-white'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Submissions ({submissionStats.attempts})
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('hints')}
                  className={`px-3 sm:px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                    activeTab === 'hints'
                      ? 'border-blue-500 text-blue-600 bg-white'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Hints
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="h-full overflow-y-auto p-4 sm:p-6 max-h-[600px] lg:max-h-[calc(100vh-300px)]">
              {activeTab === 'description' && (
                <div className="space-y-6">
                  {/* Problem Description */}
                  <div className="problem-statement">
                    <h4 className="text-lg font-semibold mb-3 text-blue-600">Problem Description</h4>
                    <div className="prose prose-sm max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: problem?.description || 'Loading problem description...' }} />
                    </div>
                  </div>
              
              {/* Examples */}
              {problem?.examples && problem.examples.length > 0 && (
                <div className="examples-section">
                  <h4 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">Examples</h4>
                  <div className="space-y-4">
                    {problem.examples.map((example, index) => (
                      <div key={index} className="example-box p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="example-title font-semibold text-gray-800 dark:text-gray-100 mb-3">Example {index + 1}:</div>
                        <div className="example-content space-y-2">
                          <div className="flex items-start">
                            <span className="font-medium text-gray-700 dark:text-gray-300 min-w-[60px]">Input:</span>
                            <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm font-mono ml-2 flex-1">{example.input}</code>
                          </div>
                          <div className="flex items-start">
                            <span className="font-medium text-gray-700 dark:text-gray-300 min-w-[60px]">Output:</span>
                            <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm font-mono ml-2 flex-1">{example.output}</code>
                          </div>
                          {example.explanation && (
                            <div className="flex items-start">
                              <span className="font-medium text-gray-700 dark:text-gray-300 min-w-[60px]">Explain:</span>
                              <span className="text-gray-600 dark:text-gray-400 text-sm ml-2 flex-1">{example.explanation}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Test Cases Preview */}
              {testCases && testCases.length > 0 && (
                <div className="test-cases-section">
                  <h4 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">Test Cases</h4>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                      <strong>Note:</strong> Showing all available test cases. Hidden test cases are marked accordingly.
                    </p>
                    <div className="space-y-3">
                      {testCases.map((testCase, index) => (
                        <div key={index} className={`p-3 rounded border ${testCase.hidden ? 'bg-gray-100 dark:bg-gray-800 border-dashed' : 'bg-white dark:bg-gray-900'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Test Case {index + 1}
                            </div>
                            {testCase.hidden && (
                              <span className="text-xs bg-gray-500 dark:bg-gray-600 text-white px-2 py-1 rounded">
                                Hidden
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Input:</span>
                              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded mt-1">
                                <code className="text-xm font-mono">{testCase.input}</code>
                              </div>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Expected Output:</span>
                              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded mt-1">
                                <code className="text-xm font-mono">
                                  {testCase.hidden ? 'Hidden until submission' : testCase.expected_output}
                                </code>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-yellow-700 dark:text-yellow-300">
                      <p><strong>Total:</strong> {testCases.length} test cases ({testCases.filter(tc => !tc.hidden).length} visible, {testCases.filter(tc => tc.hidden).length} hidden)</p>
                    </div>
                  </div>
                </div>
              )}

                  {/* Constraints */}
                  <div className="constraints-section">
                    <h4 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">Constraints</h4>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                        <li>• Follow the function signature provided in the code editor</li>
                        <li>• Your solution should handle all edge cases</li>
                        <li>• Consider time and space complexity</li>
                        {problem?.title === 'Two Sum' && (
                          <>
                            <li>• <code>2 ≤ nums.length ≤ 10⁴</code></li>
                            <li>• <code>-10⁹ ≤ nums[i] ≤ 10⁹</code></li>
                            <li>• <code>-10⁹ ≤ target ≤ 10⁹</code></li>
                            <li>• Only one valid answer exists</li>
                          </>
                        )}
                        {problem?.title === 'Fibonacci Number' && (
                          <>
                            <li>• <code>0 ≤ n ≤ 30</code></li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'submissions' && user && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Your Submissions</h4>
                  {submissions.filter(sub => sub.user_id === user.id).length > 0 ? (
                    <div className="space-y-3">
                      {submissions
                        .filter(sub => sub.user_id === user.id)
                        .slice(0, 10)
                        .map((submission, index) => (
                          <div key={submission.id} className={`p-4 rounded-lg border ${
                            submission.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <span className={`text-sm font-medium ${
                                  submission.passed ? 'text-green-800' : 'text-red-800'
                                }`}>
                                  {submission.passed ? 'Accepted' : 'Failed'}
                                </span>
                                <div className="text-xs text-gray-600 mt-1">
                                  {new Date(submission.submitted_at).toLocaleString()}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium">{submission.language}</div>
                                {submission.score && (
                                  <div className="text-xs text-gray-600">Score: {submission.score}%</div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No submissions yet. Submit your solution to see history here.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'hints' && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Hints & Tips</h4>
                  <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                        {problem?.title === 'Two Sum' && (
                          <>
                            <p><strong>Hint 1:</strong> Try using a hash map to store numbers you've seen</p>
                            <p><strong>Hint 2:</strong> For each number, check if its complement exists in the map</p>
                            <p><strong>Hint 3:</strong> The complement is <code>target - current_number</code></p>
                          </>
                        )}
                        {problem?.title === 'Fibonacci Number' && (
                          <>
                            <p><strong>Hint 1:</strong> Consider the base cases: F(0) = 0, F(1) = 1</p>
                            <p><strong>Hint 2:</strong> You can solve this iteratively or recursively</p>
                            <p><strong>Hint 3:</strong> Iterative approach has O(1) space complexity</p>
                          </>
                        )}
                        {problem?.title === 'Reverse String' && (
                          <>
                            <p><strong>Hint 1:</strong> Use two pointers approach</p>
                            <p><strong>Hint 2:</strong> Swap characters from both ends moving inward</p>
                            <p><strong>Hint 3:</strong> Modify the array in-place</p>
                          </>
                        )}
                        {(!problem?.title || !['Two Sum', 'Fibonacci Number', 'Reverse String'].includes(problem.title)) && (
                          <>
                            <p><strong>General Tip 1:</strong> Read the problem carefully and understand the requirements</p>
                            <p><strong>General Tip 2:</strong> Think about edge cases and constraints</p>
                            <p><strong>General Tip 3:</strong> Consider time and space complexity</p>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <h5 className="font-medium text-gray-800 dark:text-gray-100 mb-2">Approach Strategy</h5>
                      <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                        <p>1. Understand the problem and identify input/output</p>
                        <p>2. Think of a brute force solution first</p>
                        <p>3. Optimize using appropriate data structures</p>
                        <p>4. Test with the given examples</p>
                        <p>5. Consider edge cases</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Code Editor and Output */}
          <div className="flex flex-col gap-4 order-1 lg:order-2">
            {/* Code Editor */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-600 overflow-hidden flex-1">
              <div className="border-b bg-gray-50 dark:bg-gray-700 dark:border-gray-600 px-3 sm:px-4 py-3 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 truncate">{problem?.title}</h1>
                    {problem?.function_name && (
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                        Function Name: <span className="font-mono">{problem.function_name}</span>
                      </p>
                    )}
                  </div>
                  <select
                    value={language}
                    onChange={handleLanguageChange}
                    className="w-full sm:w-auto px-3 py-1.5 sm:py-1 text-sm border border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-300 focus:border-blue-500 dark:focus:border-blue-300"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                  </select>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                    <select
                      value={testCaseIndex}
                      onChange={(e) => setTestCaseIndex(parseInt(e.target.value, 10))}
                      className="w-full sm:w-auto px-3 py-2 text-sm border border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-300 focus:border-blue-500 dark:focus:border-blue-300"
                    >
                      {testCases.map((testCase, index) => (
                        <option key={index} value={index}>
                          Test Case {index + 1}{testCase.hidden ? ' (Hidden)' : ''}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      {testCases.length} test case{testCases.length !== 1 ? 's' : ''} ({testCases.filter(tc => !tc.hidden).length} visible, {testCases.filter(tc => tc.hidden).length} hidden)
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleRunCode}
                      disabled={executing || submitting}
                      className="px-3 py-1.5 text-xs sm:text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900"
                    >
                      {executing ? 'Running…' : 'Run Test'}
                    </button>
                    <button
                      onClick={handleSubmitCode}
                      disabled={submitting}
                      className="px-3 py-1.5 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-400 dark:hover:bg-blue-300 dark:text-blue-950"
                    >
                      {submitting ? 'Submitting…' : 'Submit Solution'}
                    </button>
                    {/* View Output button for mobile */}
                    {(output || testResults.length > 0) && (
                      <button
                        onClick={() => setShowOutputModal(true)}
                        className="lg:hidden px-3 py-1.5 text-xs sm:text-sm bg-green-600 hover:bg-green-700 text-white rounded-md"
                      >
                        View Output
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="h-[400px] sm:h-[500px] lg:h-[600px]">
                <CodeEditor
                  code={code}
                  language={language}
                  onChange={handleCodeChange}
                  height="100%"
                  title="Solution"
                  showHeader={false}
                  className="h-full"
                />
              </div>
            </div>

            {/* Output Panel */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-600 overflow-hidden">
              <div className="border-b bg-gray-50 dark:bg-gray-700 dark:border-gray-600 px-3 sm:px-4 py-3">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">Output</h3>
              </div>
              
              <div className="p-3 sm:p-4 h-48 sm:h-64 overflow-y-auto text-gray-900 dark:text-gray-100">
                {error && (
                  <div className="bg-red-100 dark:bg-red-900/40 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4">
                    <strong>Error:</strong> {error}
                  </div>
                )}
                
                {(executing || submitting) ? (
                  <div className="flex items-center justify-center py-8 text-gray-600 dark:text-gray-300">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-300 mr-3"></div>
                    <span>{submitting ? 'Running all test cases…' : 'Executing code…'}</span>
                  </div>
                ) : output ? (
                  <div className="space-y-4">
                    <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 dark:bg-gray-900 p-3 rounded border dark:border-gray-600 overflow-x-auto">
                      {output}
                    </pre>

                    {resultStatus === 'success' && (
                      <div className="bg-green-100 dark:bg-green-900/40 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-200 px-4 py-3 rounded">
                        <strong>All tests passed!</strong> Great job—your solution meets all checks we can reveal.
                      </div>
                    )}

                    {resultStatus === 'failed' && (
                      <div className="bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded">
                        <strong>Some tests failed.</strong> Review the details below to debug your solution.
                      </div>
                    )}

                    {resultStatus === 'error' && (
                      <div className="bg-red-100 dark:bg-red-900/40 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 px-4 py-3 rounded">
                        <strong>Execution error.</strong> Check the output above for more information.
                      </div>
                    )}

                    {testResults.length > 0 && (
                      <div className="space-y-3">
                        {testResults.map((test) => {
                          const badgeClasses = test.passed
                            ? 'bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-500'
                            : 'bg-red-100 dark:bg-red-800/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-500';

                          return (
                            <div
                              key={test.testCaseNumber}
                              className={`rounded-lg border px-3 sm:px-4 py-3 text-sm ${badgeClasses}`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-sm">
                                  Test Case {test.testCaseNumber} {test.hidden ? '(Hidden)' : ''}
                                </span>
                                <span className="text-xs uppercase tracking-wide">
                                  {test.passed ? 'Passed' : (test.error ? 'Error' : 'Failed')}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                <div>
                                  <span className="font-medium text-gray-600 dark:text-gray-300 block mb-1">Input</span>
                                  <div className="bg-white/60 dark:bg-gray-900 border border-white/40 dark:border-gray-600 rounded p-2 font-mono break-all">
                                    {test.input || '—'}
                                  </div>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-600 dark:text-gray-300 block mb-1">Expected</span>
                                  <div className="bg-white/60 dark:bg-gray-800 border border-white/40 dark:border-gray-700 rounded p-2 font-mono break-all">
                                    {test.hidden ? 'Hidden' : (test.expectedOutput || '—')}
                                  </div>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-600 dark:text-gray-300 block mb-1">Actual</span>
                                  <div className="bg-white/60 dark:bg-gray-800 border border-white/40 dark:border-gray-700 rounded p-2 font-mono break-all">
                                    {test.actualOutput || (test.error ? 'Error' : '—')}
                                  </div>
                                </div>
                              </div>

                              {test.hidden && (
                                <p className="text-xs text-gray-700 dark:text-gray-300 mt-2">
                                  Hidden case details are revealed after submission.
                                </p>
                              )}

                              {test.error && (
                                <div className="mt-2">
                                  <span className="font-medium text-gray-600 dark:text-gray-300 block mb-1">Error</span>
                                  <pre className="bg-white/60 dark:bg-gray-900 border border-white/40 dark:border-gray-600 rounded p-2 font-mono whitespace-pre-wrap text-xs break-all">
                                    {test.error}
                                  </pre>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12 text-gray-500">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm">Run your code to see output here.</p>
                      <p className="text-xs text-gray-400 mt-1">Use "Run Test" to check a single case or "Submit" to run all test cases.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Output Modal for Mobile */}
      <OutputModal 
        isOpen={showOutputModal} 
        onClose={() => setShowOutputModal(false)}
        title="Output"
      >
        {error && (
          <div className="bg-red-100 dark:bg-red-900/40 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {(executing || submitting) ? (
          <div className="flex items-center justify-center py-8 text-gray-600 dark:text-gray-300">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-300 mr-3"></div>
            <span>{submitting ? 'Running all test cases…' : 'Executing code…'}</span>
          </div>
        ) : output ? (
          <div className="space-y-4">
            <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 dark:bg-gray-900 p-3 rounded border dark:border-gray-600 overflow-x-auto">
              {output}
            </pre>

            {resultStatus === 'success' && (
              <div className="bg-green-100 dark:bg-green-900/40 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-200 px-4 py-3 rounded">
                <strong>All tests passed!</strong> Great job—your solution meets all checks we can reveal.
              </div>
            )}

            {resultStatus === 'failed' && (
              <div className="bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded">
                <strong>Some tests failed.</strong> Review the details below to debug your solution.
              </div>
            )}

            {resultStatus === 'error' && (
              <div className="bg-red-100 dark:bg-red-900/40 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 px-4 py-3 rounded">
                <strong>Execution error.</strong> Check the output above for more information.
              </div>
            )}

            {testResults.length > 0 && (
              <div className="space-y-3">
                {testResults.map((test) => {
                  const badgeClasses = test.passed
                    ? 'bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-500'
                    : 'bg-red-100 dark:bg-red-800/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-500';

                  return (
                    <div
                      key={test.testCaseNumber}
                      className={`rounded-lg border px-3 sm:px-4 py-3 text-sm ${badgeClasses}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">
                          Test Case {test.testCaseNumber} {test.hidden ? '(Hidden)' : ''}
                        </span>
                        <span className="text-xs uppercase tracking-wide">
                          {test.passed ? 'Passed' : (test.error ? 'Error' : 'Failed')}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-300 block mb-1">Input</span>
                          <div className="bg-white/60 dark:bg-gray-900 border border-white/40 dark:border-gray-600 rounded p-2 font-mono break-all">
                            {test.input || '—'}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-300 block mb-1">Expected</span>
                          <div className="bg-white/60 dark:bg-gray-800 border border-white/40 dark:border-gray-700 rounded p-2 font-mono break-all">
                            {test.hidden ? 'Hidden' : (test.expectedOutput || '—')}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-300 block mb-1">Actual</span>
                          <div className="bg-white/60 dark:bg-gray-800 border border-white/40 dark:border-gray-700 rounded p-2 font-mono break-all">
                            {test.actualOutput || (test.error ? 'Error' : '—')}
                          </div>
                        </div>
                      </div>

                      {test.hidden && (
                        <p className="text-xs text-gray-700 dark:text-gray-300 mt-2">
                          Hidden case details are revealed after submission.
                        </p>
                      )}

                      {test.error && (
                        <div className="mt-2">
                          <span className="font-medium text-gray-600 dark:text-gray-300 block mb-1">Error</span>
                          <pre className="bg-white/60 dark:bg-gray-900 border border-white/40 dark:border-gray-600 rounded p-2 font-mono whitespace-pre-wrap text-xs break-all">
                            {test.error}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">Run your code to see output here.</p>
              <p className="text-xs text-gray-400 mt-1">Use "Run Test" to check a single case or "Submit" to run all test cases.</p>
            </div>
          </div>
        )}
      </OutputModal>
    </div>
  );
};

export default ProblemDetail;