import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Set up axios with token
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Register a new user
 * @param {Object} userData - User data (name, email, password)
 * @returns {Promise} - Promise with user data and token
 */
export const register = async (userData) => {
  try {
    const response = await axios.post(`${API_URL}/auth/register`, userData);
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Registration failed';
  }
};

/**
 * Login a user
 * @param {Object} credentials - User credentials (email, password)
 * @returns {Promise} - Promise with user data and token
 */
export const login = async (credentials) => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, credentials);
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Login failed';
  }
};

/**
 * Get current user profile
 * @returns {Promise} - Promise with user data
 */
export const getUser = async () => {
  try {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: getAuthHeader()
    });
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch user profile';
  }
};

/**
 * Get user profile with detailed information
 * @returns {Promise} - Promise with detailed user data
 */
export const getUserProfile = async () => {
  try {
    const response = await axios.get(`${API_URL}/auth/profile`, {
      headers: getAuthHeader()
    });
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch user profile';
  }
};

/**
 * Update user profile
 * @param {Object} userData - User data to update
 * @returns {Promise} - Promise with updated user data
 */
export const updateProfile = async (userData) => {
  try {
    const response = await axios.put(`${API_URL}/auth/update-profile`, userData, {
      headers: getAuthHeader()
    });
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to update profile';
  }
};