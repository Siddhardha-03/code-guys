import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Set up axios with token
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Get all coding questions with pagination
 * @param {Object} params - Query parameters (page, limit, difficulty, tag)
 * @returns {Promise} - Promise with questions data
 */
export const getQuestions = async (params = {}) => {
  try {
    const response = await axios.get(`${API_URL}/questions`, { params });
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch questions';
  }
};

/**
 * Get a single question by ID
 * @param {number} id - Question ID
 * @returns {Promise} - Promise with question data
 */
export const getQuestion = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/questions/${id}`);
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch question';
  }
};

/**
 * Run code without saving (for testing)
 * @param {Object} data - Code data (code, language, input)
 * @returns {Promise} - Promise with execution result
 */
export const runCode = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/submissions/run`, data, {
      headers: getAuthHeader()
    });
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to run code';
  }
};

/**
 * Submit code for a question
 * @param {number} questionId - Question ID
 * @param {Object} data - Submission data (code, language)
 * @returns {Promise} - Promise with submission result
 */
export const submitCode = async (questionId, data) => {
  try {
    const response = await axios.post(`${API_URL}/submissions/${questionId}`, data, {
      headers: getAuthHeader()
    });
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to submit code';
  }
};

/**
 * Get user's submissions
 * @param {Object} params - Query parameters (page, limit)
 * @returns {Promise} - Promise with submissions data
 */
export const getUserSubmissions = async (params = {}) => {
  try {
    const response = await axios.get(`${API_URL}/submissions/user`, {
      headers: getAuthHeader(),
      params
    });
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch submissions';
  }
};

/**
 * Get a specific submission
 * @param {number} id - Submission ID
 * @returns {Promise} - Promise with submission data
 */
export const getSubmission = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/submissions/${id}`, {
      headers: getAuthHeader()
    });
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch submission';
  }
};

/**
 * Get user submission statistics
 * @returns {Promise} - Promise with statistics data
 */
export const getUserStats = async () => {
  try {
    const response = await axios.get(`${API_URL}/submissions/stats/user`, {
      headers: getAuthHeader()
    });
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch statistics';
  }
};