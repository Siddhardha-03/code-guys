import React, { useState } from 'react';
import { auth } from '../config/firebase';
import { sendEmailVerification } from 'firebase/auth';

const EmailDebugger = () => {
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [userInfo, setUserInfo] = useState(null);

  const checkCurrentUser = () => {
    const user = auth.currentUser;
    if (user) {
      setUserInfo({
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        createdAt: user.metadata.creationTime,
        lastSignIn: user.metadata.lastSignInTime
      });
      setStatus('User found!');
    } else {
      setStatus('No user logged in');
      setUserInfo(null);
    }
  };

  const sendTestEmail = async () => {
    setError('');
    setStatus('');
    
    try {
      const user = auth.currentUser;
      if (!user) {
        setError('No user logged in. Please register/login first.');
        return;
      }

      setStatus('Sending email...');
      
      const actionCodeSettings = {
        url: window.location.origin + '/login?verified=true',
        handleCodeInApp: false
      };
      
      await sendEmailVerification(user, actionCodeSettings);
      
      setStatus(`✅ Verification email sent to: ${user.email}`);
    } catch (err) {
      console.error('Email send error:', err);
      setError(`Error: ${err.code} - ${err.message}`);
    }
  };

  const checkFirebaseConfig = () => {
    setStatus(`
Firebase Configuration:
- Project ID: code-guy
- Auth Domain: code-guy.firebaseapp.com
- API Key: ${auth.app.options.apiKey ? '✅ Present' : '❌ Missing'}
- Auth Initialized: ${auth ? '✅ Yes' : '❌ No'}
    `);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6 mt-8">
      <h2 className="text-2xl font-bold mb-6">📧 Email Debugging Tool</h2>
      
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <h3 className="font-bold text-yellow-800 mb-2">⚠️ Most Common Issue</h3>
          <p className="text-sm text-yellow-700">
            Firebase Console → Authentication → Sign-in method → Email/Password → 
            Enable <strong>"Email link (passwordless sign-in)"</strong>
          </p>
          <a 
            href="https://console.firebase.google.com/project/code-guy/authentication/providers"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline text-sm mt-2 inline-block"
          >
            Open Firebase Console →
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={checkCurrentUser}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          >
            Check Current User
          </button>
          
          <button
            onClick={sendTestEmail}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
          >
            Send Test Email
          </button>
          
          <button
            onClick={checkFirebaseConfig}
            className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded"
          >
            Check Firebase Config
          </button>
        </div>

        {status && (
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h3 className="font-bold text-blue-800 mb-2">Status:</h3>
            <pre className="text-sm text-blue-700 whitespace-pre-wrap">{status}</pre>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <h3 className="font-bold text-red-800 mb-2">Error:</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {userInfo && (
          <div className="bg-green-50 border border-green-200 rounded p-4">
            <h3 className="font-bold text-green-800 mb-2">User Information:</h3>
            <div className="text-sm text-green-700 space-y-1">
              <p><strong>UID:</strong> {userInfo.uid}</p>
              <p><strong>Email:</strong> {userInfo.email}</p>
              <p><strong>Email Verified:</strong> {userInfo.emailVerified ? '✅ Yes' : '❌ No'}</p>
              <p><strong>Display Name:</strong> {userInfo.displayName || 'Not set'}</p>
              <p><strong>Created:</strong> {userInfo.createdAt}</p>
              <p><strong>Last Sign In:</strong> {userInfo.lastSignIn}</p>
            </div>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded p-4">
          <h3 className="font-bold text-gray-800 mb-2">📋 Checklist</h3>
          <ul className="text-sm text-gray-700 space-y-2">
            <li>✅ Check Firebase Console Email/Password settings</li>
            <li>✅ Check spam/junk folder in your email</li>
            <li>✅ Check Gmail Promotions tab</li>
            <li>✅ Wait 5-10 minutes for email delivery</li>
            <li>✅ Check Firebase quota (10 emails/day on free plan)</li>
            <li>✅ Try different email provider (Gmail, Outlook, etc.)</li>
          </ul>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded p-4">
          <h3 className="font-bold text-gray-800 mb-2">🔗 Useful Links</h3>
          <ul className="text-sm space-y-2">
            <li>
              <a 
                href="https://console.firebase.google.com/project/code-guy/authentication/providers"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Firebase Authentication Settings
              </a>
            </li>
            <li>
              <a 
                href="https://console.firebase.google.com/project/code-guy/authentication/users"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Firebase Users List
              </a>
            </li>
            <li>
              <a 
                href="https://console.firebase.google.com/project/code-guy/authentication/templates"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Email Templates
              </a>
            </li>
            <li>
              <a 
                href="https://console.firebase.google.com/project/code-guy/authentication/usage"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Check Usage/Quota
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EmailDebugger;
