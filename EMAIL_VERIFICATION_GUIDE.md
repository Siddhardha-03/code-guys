# Email Verification Troubleshooting Guide

## Current Setup

### Email Verification is Now ENFORCED
- ✅ Users **MUST verify their email** before logging in
- ✅ Login will fail with error message if email is not verified
- ✅ "Resend verification email" button appears on login page
- ✅ App.js automatically signs out unverified users

## Why You Might Not Receive Verification Emails

### 1. Firebase Email Provider Not Enabled
**Most Common Issue!**

Go to Firebase Console:
1. Visit: https://console.firebase.google.com/project/code-guy/authentication/providers
2. Click on "Email/Password" provider
3. Make sure BOTH are enabled:
   - ✅ Email/Password
   - ✅ Email link (passwordless sign-in) - **This enables email sending**

### 2. Email Templates Not Configured
Firebase Console → Authentication → Templates:
1. Click "Email verification"
2. Customize the template (optional)
3. Make sure it's enabled

### 3. Check Spam/Junk Folder
- Gmail often puts Firebase emails in spam
- Check "Promotions" tab in Gmail
- Add `noreply@code-guy.firebaseapp.com` to contacts

### 4. Firebase Sending Limits
**Free Plan Limits:**
- 10 emails per day for testing
- After 10, you need to upgrade to Blaze plan

Check quota:
1. Firebase Console → Authentication → Usage
2. Look for "Email verification sent" count

### 5. Domain Verification (Production)
For production apps, verify your domain:
1. Firebase Console → Authentication → Settings
2. Add your domain to "Authorized domains"

## How to Test Email Verification

### Option 1: Use Console to Check Email Status
```javascript
// In browser console after registration
firebase.auth().currentUser.emailVerified
// Should return: false (before verification)
// Should return: true (after clicking link)
```

### Option 2: Check Firebase Console
1. Firebase Console → Authentication → Users
2. Find your user
3. Check "Email Verified" column

### Option 3: Resend Verification
1. Try to login with unverified account
2. Click "Resend verification email" button
3. Check email and spam folder

## Verification Email Settings in Code

### Current Configuration
```javascript
const actionCodeSettings = {
  url: window.location.origin + '/login?verified=true',
  handleCodeInApp: false
};

await sendEmailVerification(user, actionCodeSettings);
```

### What This Does:
- Sends verification email with a link
- After clicking link, user is redirected to `/login?verified=true`
- User can then login normally

## Quick Fix: Manual Email Verification (Development Only)

If you need to test the app without email verification during development:

### Temporary Disable (NOT RECOMMENDED FOR PRODUCTION)

**Option A: Comment out verification check in login**
```javascript
// In client/src/services/authService.js - login function
// Comment these lines:
/*
if (!user.emailVerified) {
  await signOut(auth);
  throw 'Please verify your email before logging in...';
}
*/
```

**Option B: Verify user manually in Firebase Console**
1. Firebase Console → Authentication → Users
2. Click on your user
3. Click "..." menu → Verify email

## Production Checklist

Before deploying:
- [ ] Upgrade to Firebase Blaze plan (pay-as-you-go)
- [ ] Configure custom email templates
- [ ] Add production domain to authorized domains
- [ ] Set up email quota alerts
- [ ] Test verification flow end-to-end
- [ ] Configure proper error handling
- [ ] Set up email deliverability monitoring

## Current Flow

1. **Registration**
   - User registers → Firebase creates account
   - `sendEmailVerification()` called automatically
   - User sees success message
   - Email verification link sent to inbox

2. **Login Attempt (Unverified)**
   - User tries to login
   - System checks `user.emailVerified`
   - If `false`: Login blocked with error
   - "Resend verification email" button shown

3. **Email Verification**
   - User clicks link in email
   - Firebase verifies email
   - `user.emailVerified` becomes `true`
   - User can now login successfully

4. **Login Success (Verified)**
   - User logs in
   - System checks verification
   - Access granted
   - User synced to MySQL database

## Support

If verification emails still don't work:
1. Check Firebase Console logs
2. Check browser console for errors
3. Verify Firebase project settings
4. Check email quota in Firebase Console
5. Try with different email provider (Gmail, Outlook, etc.)
