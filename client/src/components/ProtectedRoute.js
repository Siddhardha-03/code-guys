import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute component to protect routes that require authentication
 * Redirects to login page if user is not authenticated
 */
const ProtectedRoute = ({ user, children }) => {
  if (!user) {
    // User is not authenticated, redirect to login
    return <Navigate to="/login" replace />;
  }

  // User is authenticated, render the protected component
  return children;
};

export default ProtectedRoute;