import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

const Navbar = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="flex justify-between items-center">
          {/* Logo and site name - Left */}
          <Link to="/" className="navbar-brand">
            <span className="mr-2">🧑‍💻</span>
            <span>CodeGuy</span>
          </Link>

          {/* Everything else - Right */}
          <div className="flex items-center gap-6">
            {/* Navigation links */}
            <div className="hidden md:flex items-center gap-6">
              <Link to="/practice" className="nav-link">
                Practice
              </Link>
              <Link to="/compiler" className="nav-link">
                Compiler
              </Link>
              <Link to="/quizzes" className="nav-link">
                Quizzes
              </Link>
              {user && (
                <Link to="/dashboard" className="nav-link">
                  Dashboard
                </Link>
              )}
              {user && user.role === 'admin' && (
                <Link to="/admin" className="nav-link">
                  Admin
                </Link>
              )}
            </div>

            {/* Theme toggle and auth buttons */}
            <div className="flex items-center gap-4">
              <ThemeToggle />
              {user ? (
                <div className="flex items-center gap-3">
                  {/* Profile Avatar */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <span className="hidden md:inline text-sm font-medium">{user.name}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="btn btn-ghost btn-sm flex items-center gap-1"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      <polyline points="16,17 21,12 16,7"/>
                      <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login" className="btn btn-ghost btn-sm flex items-center gap-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                      <polyline points="10,17 15,12 10,7"/>
                      <line x1="15" y1="12" x2="3" y2="12"/>
                    </svg>
                    Login
                  </Link>
                  <Link to="/register" className="btn btn-primary btn-sm">
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;