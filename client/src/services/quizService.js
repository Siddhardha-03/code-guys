import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Set up axios with token
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Get all quizzes with pagination
 * @param {Object} params - Query parameters (page, limit, category)
 * @returns {Promise} - Promise with quizzes data
 */
export const getQuizzes = async (params = {}) => {
  try {
    const response = await axios.get(`${API_URL}/quizzes`, { 
      params,
      headers: getAuthHeader()
    });
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch quizzes';
  }
};

/**
 * Get a single quiz by ID
 * @param {number} id - Quiz ID
 * @returns {Promise} - Promise with quiz data
 */
export const getQuiz = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/quizzes/${id}`, {
      headers: getAuthHeader()
    });
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch quiz';
  }
};

/**
 * Submit quiz answers
 * @param {number} quizId - Quiz ID
 * @param {Object} data - Answers data
 * @returns {Promise} - Promise with submission result
 */
export const submitQuiz = async (quizId, data) => {
  try {
    const response = await axios.post(`${API_URL}/quizzes/${quizId}/submit`, data, {
      headers: getAuthHeader()
    });
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to submit quiz';
  }
};

/**
 * Get user's quiz submissions
 * @returns {Promise} - Promise with submissions data
 */
export const getUserQuizSubmissions = async () => {
  try {
    const response = await axios.get(`${API_URL}/quizzes/submissions/user`, {
      headers: getAuthHeader()
    });
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch quiz submissions';
  }
};

/**
 * Get quiz results (admin only)
 * @param {number} quizId - Quiz ID
 * @returns {Promise} - Promise with results data
 */
export const getQuizResults = async (quizId) => {
  try {
    const response = await axios.get(`${API_URL}/quizzes/${quizId}/results`, {
      headers: getAuthHeader()
    });
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch quiz results';
  }
};

/**
 * Get user quiz statistics
 * @returns {Promise} - Promise with statistics data
 */
export const getUserQuizStats = async () => {
  try {
    const response = await axios.get(`${API_URL}/quizzes/stats/user`, {
      headers: getAuthHeader()
    });
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch quiz statistics';
  }
};