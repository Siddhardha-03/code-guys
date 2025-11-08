const axios = require('axios');
require('dotenv').config();

const { buildWrappedCode } = require('./codeRunner');

const JUDGE0_BASE_URL = process.env.JUDGE0_BASE_URL || 'https://ce.judge0.com';

// Language IDs for Judge0 API
const LANGUAGE_IDS = {
  javascript: 63,  // JavaScript (Node.js 12.14.0)
  python: 71,      // Python (3.8.1)
  java: 62,        // Java (OpenJDK 13.0.1)
  cpp: 54,         // C++ (GCC 9.2.0)
  c: 50,           // C (GCC 9.2.0)
  csharp: 51,      // C# (Mono 6.6.0.161)
  ruby: 72,        // Ruby (2.7.0)
  go: 60,          // Go (1.13.5)
  php: 68,         // PHP (7.4.1)
};

/**
 * Submit code to Judge0 API for execution
 * @param {string} source - Source code
 * @param {string} language - Programming language
 * @param {string} input - Standard input
 * @returns {Promise<Object>} - Submission result
 */
async function submitCode(source, language, input = '') {
  try {
    const languageId = LANGUAGE_IDS[language.toLowerCase()];
    
    if (!languageId) {
      throw new Error(`Unsupported language: ${language}`);
    }

    // Create submission
    const response = await axios.post(`${JUDGE0_BASE_URL}/submissions?base64_encoded=true`, {
      source_code: Buffer.from(source, 'utf-8').toString('base64'),
      language_id: languageId,
      stdin: Buffer.from(input || '', 'utf-8').toString('base64'),
      // Additional options
      cpu_time_limit: 2,       // 2 seconds
      memory_limit: 128000,    // 128 MB
      stack_limit: 64000,      // 64 MB
      max_processes_and_or_threads: 60,
      enable_network: false,
      base64_encoded: true,
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const token = response.data.token;
    return await getSubmissionResult(token);
  } catch (error) {
    console.error('Judge0 API error:', error.message, error.response?.data || '');
    throw error;
  }
}

/**
 * Get submission result from Judge0 API
 * @param {string} token - Submission token
 * @returns {Promise<Object>} - Submission result
 */
async function getSubmissionResult(token) {
  try {
    // Poll for result with exponential backoff
    let attempts = 0;
    const maxAttempts = 10;
    const initialDelay = 500; // ms

    while (attempts < maxAttempts) {
      const delay = initialDelay * Math.pow(1.5, attempts);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const response = await axios.get(`${JUDGE0_BASE_URL}/submissions/${token}`, {
        params: {
          base64_encoded: true,
          fields: 'status_id,status,time,memory,stdout,stderr,compile_output,message,exit_code'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = response.data;
      const decode = (value) => value ? Buffer.from(value, 'base64').toString('utf-8') : '';
      
      // Check if the submission is processed
      if (result.status_id <= 2) { // In Queue or Processing
        attempts++;
        continue;
      }

      return {
        status: result.status,
        statusId: result.status_id,
        time: result.time,
        memory: result.memory,
        stdout: decode(result.stdout),
        stderr: decode(result.stderr),
        compileOutput: decode(result.compile_output),
        message: decode(result.message),
        exitCode: result.exit_code
      };
    }

    throw new Error('Submission processing timeout');
  } catch (error) {
    console.error('Judge0 API error:', error.message, error.response?.data || '');
    throw error;
  }
}

/**
 * Validate code against test cases
 * @param {string} source - Source code
 * @param {string} language - Programming language
 * @param {Array} testCases - Array of test cases
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} - Array of test case results
 */
async function validateCode(source, language, testCases, options = {}) {
  try {
    const results = [];
    const { problem } = options;
    
    for (const testCase of testCases) {
      const wrappedSource = buildWrappedCode({
        problem,
        code: source,
        language,
        testCaseInput: testCase.input
      });

      const result = await submitCode(wrappedSource, language, '');

      const actualOutput = (result.stdout || '').trim();
      const expectedOutput = (testCase.expected_output || '').trim();
      const errorOutput = (result.stderr || result.compileOutput || result.message || '').trim();
      const passed = actualOutput === expectedOutput && !errorOutput;
      
      results.push({
        testCaseId: testCase.id,
        input: testCase.input,
        expectedOutput,
        actualOutput,
        hidden: Boolean(testCase.hidden),
        passed,
        error: errorOutput,
        statusId: result.statusId,
        status: result.status,
        time: result.time,
        memory: result.memory,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        compileOutput: result.compileOutput || ''
      });
    }
    
    return results;
  } catch (error) {
    console.error('Code validation error:', error.message);
    throw error;
  }
}

module.exports = {
  submitCode,
  getSubmissionResult,
  validateCode,
  LANGUAGE_IDS
};