import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Set up axios with token
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Get user's submissions
 * @param {Object} params - Query parameters
 * @returns {Promise} - Promise with submissions data
 */
export const getUserSubmissions = async (params = {}) => {
  try {
    const response = await axios.get(`${API_URL}/submissions/user`, {
      headers: getAuthHeader(),
      params
    });
    return response.data.data?.submissions || [];
  } catch (error) {
    console.error('Get user submissions error:', error);
    // Return empty array instead of throwing to prevent app crashes
    return [];
  }
};

/**
 * Submit code for a question
 * @param {number} questionId - Question ID
 * @param {Object} submissionData - Submission data
 * @returns {Promise} - Promise with submission result
 */
export const submitCode = async (questionId, submissionData) => {
  try {
    const response = await axios.post(`${API_URL}/submissions/${questionId}`, submissionData, {
      headers: getAuthHeader()
    });
    return response.data.data;
  } catch (error) {
    console.error('Submit code error:', error);
    throw error.response?.data?.message || 'Failed to submit code';
  }
};

/**
 * Run code without saving (for testing)
 * @param {Object} codeData - Code execution data
 * @returns {Promise} - Promise with execution result
 */
export const runCode = async (codeData) => {
  try {
    const response = await axios.post(`${API_URL}/submissions/run`, codeData, {
      headers: getAuthHeader()
    });
    return response.data.data;
  } catch (error) {
    console.error('Run code error:', error);
    throw error.response?.data?.message || 'Failed to run code';
  }
};

/**
 * Get submission details by ID
 * @param {number} submissionId - Submission ID
 * @returns {Promise} - Promise with submission details
 */
export const getSubmissionById = async (submissionId) => {
  try {
    const response = await axios.get(`${API_URL}/submissions/${submissionId}`, {
      headers: getAuthHeader()
    });
    return response.data.data;
  } catch (error) {
    console.error('Get submission error:', error);
    throw error.response?.data?.message || 'Failed to fetch submission';
  }
};

/**
 * Get submissions for a specific question
 * @param {number} questionId - Question ID
 * @returns {Promise} - Promise with question submissions
 */
export const getQuestionSubmissions = async (questionId) => {
  try {
    const response = await axios.get(`${API_URL}/submissions/question/${questionId}`, {
      headers: getAuthHeader()
    });
    return response.data.data?.submissions || [];
  } catch (error) {
    console.error('Get question submissions error:', error);
    // Return empty array instead of throwing to prevent app crashes
    return [];
  }
};

const buildCodeDraftKey = (questionId, language = 'javascript') => {
  const normalizedLanguage = (language || 'javascript').toLowerCase();
  return `codeDraft:${questionId}:${normalizedLanguage}`;
};

/**
 * Fetch saved code draft for a question/language combination
 * @param {number|string} questionId - Question identifier
 * @param {string} language - Programming language key
 * @returns {Promise<{code: string | null}>}
 */
export const getCodeDraft = async (questionId, language = 'javascript') => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { code: null };
  }

  const storageKey = buildCodeDraftKey(questionId, language);
  const storedCode = window.localStorage.getItem(storageKey);

  return { code: storedCode !== null ? storedCode : null };
};

/**
 * Persist code draft for a question/language combination
 * @param {number|string} questionId - Question identifier
 * @param {{language: string, code: string}} draftData - Draft payload
 */
export const saveCodeDraft = async (questionId, draftData = {}) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  const { language = 'javascript', code = '' } = draftData;
  const storageKey = buildCodeDraftKey(questionId, language);

  window.localStorage.setItem(storageKey, code ?? '');
};
