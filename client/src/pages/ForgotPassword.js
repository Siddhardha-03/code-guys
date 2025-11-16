import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { resetPassword } from '../services/authService';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await resetPassword(email);
      setSuccess(response.message);
      setEmail(''); // Clear the form
    } catch (err) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden mt-4 sm:mt-8">
      <div className="px-4 sm:px-6 py-6 sm:py-8">
        <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-800 mb-4">Reset Password</h2>
        
        <p className="text-center text-gray-600 text-sm sm:text-base mb-6 sm:mb-8">
          Enter your email address and we'll send you a link to reset your password.
        </p>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded mb-4 text-sm sm:text-base" role="alert">
            <span className="block">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-3 sm:px-4 py-2 sm:py-3 rounded mb-4 text-sm sm:text-base" role="alert">
            <span className="block">{success}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-gray-700 text-xs sm:text-sm font-bold mb-2" htmlFor="email">
              Email Address
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 sm:py-2.5 px-3 text-sm sm:text-base text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="email"
              type="email"
              name="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="flex items-center justify-between mb-6">
            <button
              className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 sm:py-2.5 px-4 rounded focus:outline-none focus:shadow-outline w-full text-sm sm:text-base"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </span>
              ) : 'Send Reset Link'}
            </button>
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-gray-600 text-sm">
              Remember your password?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-800">
                Back to Login
              </Link>
            </p>
            <p className="text-gray-600 text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-600 hover:text-primary-800">
                Register here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
