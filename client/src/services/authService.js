import axios from 'axios';
import { 
  auth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  googleProvider,
  signInWithPopup,
  updateProfile as firebaseUpdateProfile
} from '../config/firebase';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Get Firebase ID token for authenticated requests
 */
const getAuthHeader = async () => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};

/**
 * Axios instance with credentials enabled
 */
const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

/**
 * Sync Firebase user with backend database
 */
const syncUserWithBackend = async (firebaseUser) => {
  try {
    const token = await firebaseUser.getIdToken();
    const response = await axiosInstance.post('/auth/sync', {
      firebase_uid: firebaseUser.uid,
      name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
      email: firebaseUser.email,
      email_verified: firebaseUser.emailVerified
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  } catch (error) {
    console.error('Backend sync error:', error);
    throw error.response?.data?.message || 'Failed to sync user data';
  }
};

/**
 * Register a new user with email and password
 */
export const register = async ({ name, email, password }) => {
  try {
    // Create user in Firebase
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name
    await firebaseUpdateProfile(user, { displayName: name });

    // Send email verification with action code settings
    const actionCodeSettings = {
      url: window.location.origin + '/login?verified=true',
      handleCodeInApp: false
    };
    
    await sendEmailVerification(user, actionCodeSettings);
    
    console.log('Verification email sent to:', user.email);

    // Sync with backend
    await syncUserWithBackend(user);

    return {
      user: {
        uid: user.uid,
        name: name,
        email: user.email,
        emailVerified: user.emailVerified
      },
      message: 'Registration successful! Please check your email to verify your account.'
    };
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 'auth/email-already-in-use') {
      throw 'Email already in use';
    } else if (error.code === 'auth/weak-password') {
      throw 'Password should be at least 6 characters';
    } else if (error.code === 'auth/invalid-email') {
      throw 'Invalid email address';
    }
    throw error.message || 'Registration failed';
  }
};

/**
 * Login with email and password
 */
export const login = async ({ email, password }) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Check if email is verified
    if (!user.emailVerified) {
      // Sign out the user
      await signOut(auth);
      throw 'Please verify your email before logging in. Check your inbox for the verification link.';
    }

    // Sync with backend
    await syncUserWithBackend(user);

    return {
      user: {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        emailVerified: user.emailVerified
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    
    // If it's our custom error message, throw it directly
    if (typeof error === 'string') {
      throw error;
    }
    
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      throw 'Invalid email or password';
    } else if (error.code === 'auth/invalid-credential') {
      throw 'Invalid credentials';
    } else if (error.code === 'auth/too-many-requests') {
      throw 'Too many failed attempts. Please try again later.';
    }
    throw error.message || 'Login failed';
  }
};

/**
 * Sign in with Google
 */
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Sync with backend
    await syncUserWithBackend(user);

    return {
      user: {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        emailVerified: user.emailVerified
      }
    };
  } catch (error) {
    console.error('Google sign-in error:', error);
    if (error.code === 'auth/popup-closed-by-user') {
      throw 'Sign-in cancelled';
    } else if (error.code === 'auth/popup-blocked') {
      throw 'Popup blocked. Please allow popups for this site.';
    }
    throw error.message || 'Google sign-in failed';
  }
};

/**
 * Logout user
 */
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
    throw error.message || 'Logout failed';
  }
};

/**
 * Send password reset email
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { message: 'Password reset email sent! Check your inbox.' };
  } catch (error) {
    console.error('Password reset error:', error);
    if (error.code === 'auth/user-not-found') {
      throw 'No account found with this email';
    }
    throw error.message || 'Failed to send reset email';
  }
};

/**
 * Resend email verification
 */
export const resendVerificationEmail = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw 'No user logged in';
    
    await sendEmailVerification(user);
    return { message: 'Verification email sent! Check your inbox.' };
  } catch (error) {
    console.error('Email verification error:', error);
    throw error.message || 'Failed to send verification email';
  }
};

/**
 * Get current user profile from backend
 */
export const getUser = async () => {
  try {
    const headers = await getAuthHeader();
    const response = await axiosInstance.get('/auth/me', { headers });
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
    const headers = await getAuthHeader();
    const response = await axiosInstance.get('/auth/profile', { headers });
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
    const user = auth.currentUser;
    
    // Update Firebase profile
    if (userData.name && userData.name !== user.displayName) {
      await firebaseUpdateProfile(user, { displayName: userData.name });
    }

    // Update backend profile
    const headers = await getAuthHeader();
    const response = await axiosInstance.put('/auth/update-profile', userData, { headers });
    return response.data.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to update profile';
  }
};

/**
 * Get current Firebase user
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};
