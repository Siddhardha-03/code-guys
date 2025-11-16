import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCmz6BMReZW8XNJa54wU2j4Z_IeHCyilf8",
  authDomain: "code-guy.firebaseapp.com",
  projectId: "code-guy",
  storageBucket: "code-guy.firebasestorage.app",
  messagingSenderId: "490751208380",
  appId: "1:490751208380:web:d5cf322310a2e4f11e99b9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// Export auth methods
export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup,
  updateProfile,
  onAuthStateChanged
};

export default app;
