-- Add Firebase authentication fields to users table

USE campus_platform;

-- Add firebase_uid column (unique identifier from Firebase)
ALTER TABLE users 
ADD COLUMN firebase_uid VARCHAR(128) UNIQUE DEFAULT NULL AFTER id;

-- Add email_verified column (tracks Firebase email verification status)
ALTER TABLE users 
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE AFTER email;

-- Add last_signed_in column if it doesn't exist
ALTER TABLE users 
ADD COLUMN last_signed_in TIMESTAMP NULL DEFAULT NULL AFTER created_at;

-- Make password nullable (for Google sign-in users who don't have passwords)
ALTER TABLE users 
MODIFY COLUMN password TEXT NULL;

-- Add index on firebase_uid for faster lookups
CREATE INDEX idx_firebase_uid ON users(firebase_uid);

-- Update existing admin user to mark as email verified
UPDATE users SET email_verified = TRUE WHERE role = 'admin';
