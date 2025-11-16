import React, { useState } from 'react';
import { auth } from '../config/firebase';
import { sendEmailVerification } from 'firebase/auth';

const EmailVerificationBanner = ({ user }) => {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [dismissed, setDismissed] = useState(false);

  // Don't show banner if user is verified or banner is dismissed
  if (!user || user.email_verified || dismissed) {
    return null;
  }

  const handleResendVerification = async () => {
    setSending(true);
    setMessage('');

    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await sendEmailVerification(currentUser);
        setMessage('Verification email sent! Please check your inbox.');
      }
    } catch (error) {
      console.error('Error sending verification email:', error);
      setMessage('Failed to send verification email. Please try again later.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-yellow-50 border-b border-yellow-200">
      <div className="max-w-7xl mx-auto py-3 px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap">
          <div className="w-0 flex-1 flex items-center">
            <span className="flex p-2 rounded-lg bg-yellow-100">
              <svg className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            <p className="ml-3 font-medium text-yellow-800 text-sm sm:text-base">
              {message || 'Please verify your email address to access all features.'}
            </p>
          </div>
          <div className="order-3 mt-2 flex-shrink-0 w-full sm:order-2 sm:mt-0 sm:w-auto">
            <button
              onClick={handleResendVerification}
              disabled={sending}
              className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Sending...' : 'Resend verification email'}
            </button>
          </div>
          <div className="order-2 flex-shrink-0 sm:order-3 sm:ml-3">
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="-mr-1 flex p-2 rounded-md hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationBanner;
