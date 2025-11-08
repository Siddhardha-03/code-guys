import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * AdminRoute component to protect routes that require admin privileges
 * Redirects to home page if user is not authenticated or not an admin
 */
const AdminRoute = ({ user, children }) => {
  if (!user || user.role !== 'admin') {
    // User is not authenticated or not an admin, redirect to home
    return <Navigate to="/" replace />;
  }

  // User is authenticated and is an admin, render the protected component
  return children;
};

export default AdminRoute;