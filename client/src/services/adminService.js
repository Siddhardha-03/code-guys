import axios from 'axios';
import { auth } from '../config/firebase';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Set up axios with Firebase token
const getAuthHeader = async () => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};

/**
 * Create a new coding question
 * @param {Object} questionData - Question data
 * @returns {Promise} - Promise with created question data
 */
export const createQuestion = async (questionData) => {
  try {
    const response = await axios.post(`${API_URL}/questions`, questionData, {
      headers: await getAuthHeader()
    });
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to create question';
  }
};

/**
 * Update a coding question
 * @param {number} id - Question ID
 * @param {Object} questionData - Question data to update
 * @returns {Promise} - Promise with success message
 */
export const updateQuestion = async (id, questionData) => {
  try {
    console.log('AdminService: Updating question', id, 'with data:', questionData);
    const response = await axios.put(`${API_URL}/questions/${id}`, questionData, {
      headers: await getAuthHeader()
    });
    console.log('AdminService: Update response:', response.data);
    return response.data;
  } catch (error) {
    console.error('AdminService: Update error:', error);
    console.error('AdminService: Error response:', error.response?.data);
    console.error('AdminService: Error status:', error.response?.status);
    throw error.response?.data?.message || error.message || 'Failed to update question';
  }
};

/**
 * Delete a coding question
 * @param {number} id - Question ID
 * @returns {Promise} - Promise with success message
 */
export const deleteQuestion = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/questions/${id}`, {
      headers: await getAuthHeader()
    });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to delete question';
  }
};

/**
 * Add test cases to a question
 * @param {number} questionId - Question ID
 * @param {Object} testCasesData - Test cases data
 * @returns {Promise} - Promise with success message
 */
export const addTestCases = async (questionId, testCasesData) => {
  try {
    const response = await axios.post(`${API_URL}/questions/${questionId}/test-cases`, testCasesData, {
      headers: await getAuthHeader()
    });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to add test cases';
  }
};

/**
 * Get all test cases for a question (including hidden ones)
 * @param {number} questionId - Question ID
 * @returns {Promise} - Promise with test cases data
 */
export const getAllTestCases = async (questionId) => {
  try {
    const response = await axios.get(`${API_URL}/questions/${questionId}/all-test-cases`, {
      headers: await getAuthHeader()
    });
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch test cases';
  }
};

/**
 * Create a new quiz
 * @param {Object} quizData - Quiz data
 * @returns {Promise} - Promise with created quiz data
 */
export const createQuiz = async (quizData) => {
  try {
    const response = await axios.post(`${API_URL}/quizzes`, quizData, {
      headers: await getAuthHeader()
    });
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to create quiz';
  }
};

/**
 * Update a quiz
 * @param {number} id - Quiz ID
 * @param {Object} quizData - Quiz data to update
 * @returns {Promise} - Promise with success message
 */
export const updateQuiz = async (id, quizData) => {
  try {
    const response = await axios.put(`${API_URL}/quizzes/${id}`, quizData, {
      headers: await getAuthHeader()
    });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to update quiz';
  }
};

/**
 * Delete a quiz
 * @param {number} id - Quiz ID
 * @returns {Promise} - Promise with success message
 */
export const deleteQuiz = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/quizzes/${id}`, {
      headers: await getAuthHeader()
    });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to delete quiz';
  }
};

/**
 * Add questions to a quiz
 * @param {number} quizId - Quiz ID
 * @param {Object} questionsData - Questions data
 * @returns {Promise} - Promise with success message
 */
export const addQuizQuestions = async (quizId, questionsData) => {
  try {
    const response = await axios.post(`${API_URL}/quizzes/${quizId}/questions`, questionsData, {
      headers: await getAuthHeader()
    });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to add questions';
  }
};

/**
 * Get submissions for a specific question (admin only)
 * @param {number} questionId - Question ID
 * @param {Object} params - Query parameters (page, limit)
 * @returns {Promise} - Promise with submissions data
 */
export const getQuestionSubmissions = async (questionId, params = {}) => {
  try {
    const response = await axios.get(`${API_URL}/submissions/question/${questionId}`, {
      headers: await getAuthHeader(),
      params
    });
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch submissions';
  }
};

/**
 * Get all users (admin only)
 * @returns {Promise} - Promise with users data
 */
export const getUsers = async () => {
  try {
    const response = await axios.get(`${API_URL}/admin/users`, {
      headers: await getAuthHeader()
    });
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch users';
  }
};

/**
 * Get platform statistics (admin only)
 * @returns {Promise} - Promise with statistics data
 */
export const getPlatformStats = async () => {
  try {
    const response = await axios.get(`${API_URL}/admin/stats`, {
      headers: await getAuthHeader()
    });
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch statistics';
  }
};

/**
 * Create a new user (admin only)
 * @param {Object} userData - User data (name, email, password, role)
 * @returns {Promise} - Promise with created user data
 */
export const createUser = async (userData) => {
  try {
    const response = await axios.post(`${API_URL}/admin/users`, userData, {
      headers: await getAuthHeader()
    });
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to create user';
  }
};

/**
 * Update user role (admin only)
 * @param {number} userId - User ID
 * @param {string} role - New role (student/admin)
 * @returns {Promise} - Promise with success message
 */
export const updateUserRole = async (userId, role) => {
  try {
    const response = await axios.put(`${API_URL}/admin/users/${userId}/role`, { role }, {
      headers: await getAuthHeader()
    });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to update user role';
  }
};

/**
 * Delete a user (admin only)
 * @param {number} userId - User ID
 * @returns {Promise} - Promise with success message
 */
export const deleteUser = async (userId) => {
  try {
    const response = await axios.delete(`${API_URL}/admin/users/${userId}`, {
      headers: await getAuthHeader()
    });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to delete user';
  }
};

/**
 * Get leaderboard data (admin only)
 * @param {string} type - Leaderboard type (overall, quiz, coding)
 * @param {number} limit - Number of entries to fetch
 * @returns {Promise} - Promise with leaderboard data
 */
export const getLeaderboard = async (type = 'overall', limit = 10) => {
  try {
    console.log('Admin service: fetching leaderboard', { type, limit });
    const response = await axios.get(`${API_URL}/admin/leaderboard`, {
      headers: await getAuthHeader(),
      params: { type, limit }
    });
    console.log('Admin service: leaderboard response', response.data);
    return response.data.data;
  } catch (error) {
    console.error('Admin service: leaderboard error', error.response?.data || error.message);
    throw error.response?.data?.message || error.message || 'Failed to fetch leaderboard';
  }
};

/**
 * Get recent activity for leaderboard (admin only)
 * @param {number} limit - Number of activities to fetch
 * @returns {Promise} - Promise with recent activity data
 */
export const getRecentActivity = async (limit = 20) => {
  try {
    console.log('Admin service: fetching recent activity', { limit });
    const response = await axios.get(`${API_URL}/admin/leaderboard/recent-activity`, {
      headers: await getAuthHeader(),
      params: { limit }
    });
    console.log('Admin service: recent activity response', response.data);
    return response.data.data;
  } catch (error) {
    console.error('Admin service: recent activity error', error.response?.data || error.message);
    throw error.response?.data?.message || error.message || 'Failed to fetch recent activity';
  }
};