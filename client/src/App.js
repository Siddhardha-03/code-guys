import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
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
import EmailVerificationBanner from './components/EmailVerificationBanner';
import EmailDebugger from './components/EmailDebugger';

// Context
import { ThemeProvider } from './contexts/ThemeContext';

// Services
import { auth } from './config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Check if email is verified
        if (!firebaseUser.emailVerified) {
          console.log('User email not verified, signing out...');
          await auth.signOut();
          setUser(null);
          setLoading(false);
          return;
        }

        try {
          // Get Firebase ID token
          const token = await firebaseUser.getIdToken();
          
          // Fetch user data from backend
          const response = await axios.get(`${API_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          setUser({
            ...response.data.data.user,
            firebase_uid: firebaseUser.uid,
            email_verified: firebaseUser.emailVerified
          });
        } catch (error) {
          console.error('Error fetching user:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData.user);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
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
            <EmailVerificationBanner user={user} />
            <main className="flex-grow pb-24">
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Home user={user} />} />
                  <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
                  <Route path="/register" element={user ? <Navigate to="/" /> : <Register onLogin={handleLogin} />} />
                  <Route path="/forgot-password" element={user ? <Navigate to="/" /> : <ForgotPassword />} />
                  <Route path="/email-debug" element={<EmailDebugger />} />
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