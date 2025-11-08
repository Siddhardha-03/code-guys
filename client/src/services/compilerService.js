import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Execute code in the online compiler
 * @param {Object} data - Code data (code, language, input)
 * @returns {Promise} - Promise with execution result
 */
export const executeCode = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/compiler/execute`, data);
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to execute code';
  }
};

/**
 * Get supported languages
 * @returns {Promise} - Promise with languages data
 */
export const getLanguages = async () => {
  try {
    const response = await axios.get(`${API_URL}/compiler/languages`);
    return response.data.data.languages;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch languages';
  }
};

/**
 * Get code template for a language
 * @param {string} language - Language ID
 * @returns {Promise} - Promise with template data
 */
export const getTemplate = async (language) => {
  try {
    const response = await axios.get(`${API_URL}/compiler/templates/${language}`);
    return response.data.data.template;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch template';
  }
};