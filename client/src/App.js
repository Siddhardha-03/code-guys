import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Practice from './pages/Practice';
import ProblemDetail from './pages/ProblemDetail';
import Compiler from './pages/Compiler';
import Quiz from './pages/Quiz';
import QuizDetail from './pages/QuizDetail';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Context
import { ThemeProvider } from './contexts/ThemeContext';

// Services
import { getUser } from './services/authService';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      getUser()
        .then(data => {
          setUser(data.user);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching user:', err);
          localStorage.removeItem('token');
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData.user);
    localStorage.setItem('token', userData.token);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <Router>
          <div className="flex flex-col min-h-screen">
            <Navbar user={user} onLogout={handleLogout} />
            <main className="flex-grow pb-24">
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Home user={user} />} />
                  <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
                  <Route path="/register" element={user ? <Navigate to="/" /> : <Register onLogin={handleLogin} />} />
                  <Route path="/practice" element={<Practice user={user} />} />
                  <Route path="/practice/:id" element={<ProblemDetail user={user} />} />
                  <Route path="/compiler" element={<Compiler user={user} />} />
                  <Route path="/quizzes" element={<Quiz user={user} />} />
                  <Route path="/quizzes/:id" element={<QuizDetail user={user} />} />
                  
                  {/* Protected routes */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute user={user}>
                      <Dashboard user={user} />
                    </ProtectedRoute>
                  } />
                  
                  {/* Admin routes */}
                  <Route path="/admin/*" element={
                    <AdminRoute user={user}>
                      <AdminPanel user={user} />
                    </AdminRoute>
                  } />
                  
                  {/* Catch all route */}
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </ErrorBoundary>
            </main>
            <Footer />
          </div>
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;