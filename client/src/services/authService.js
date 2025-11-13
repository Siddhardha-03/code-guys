import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Set up axios with token
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Axios instance with credentials enabled
 */
const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important for cookies
});

/**
 * Register a new user
 */
export const register = async (userData) => {
  try {
    const response = await axiosInstance.post('/auth/register', userData);
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Registration failed';
  }
};

/**
 * Login a user
 */
export const login = async (credentials) => {
  try {
    const response = await axiosInstance.post('/auth/login', credentials);
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Login failed';
  }
};

/**
 * Get current user profile
 */
export const getUser = async () => {
  try {
    const response = await axiosInstance.get('/auth/me', {
      headers: getAuthHeader()
    });
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch user profile';
  }
};

/**
 * Get user profile with detailed information
 */
export const getUserProfile = async () => {
  try {
    const response = await axiosInstance.get('/auth/profile', {
      headers: getAuthHeader()
    });
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch user profile';
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (userData) => {
  try {
    const response = await axiosInstance.put('/auth/update-profile', userData, {
      headers: getAuthHeader()
    });
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to update profile';
  }
};
