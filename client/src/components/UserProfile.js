import React, { useState, useEffect } from 'react';
import { getUserProfile } from '../services/authService';

const UserProfile = ({ user }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await getUserProfile();
      setProfile(data.user);
    } catch (err) {
      setError('Failed to load profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">User Profile</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <p className="mt-1 text-sm text-gray-900">{profile?.name}</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <p className="mt-1 text-sm text-gray-900">{profile?.email}</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Role</label>
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            profile?.role === 'admin' 
              ? 'bg-purple-100 text-purple-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {profile?.role}
          </span>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Member Since</label>
          <p className="mt-1 text-sm text-gray-900">{formatDate(profile?.created_at)}</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Last Signed In</label>
          <p className="mt-1 text-sm text-gray-900">{formatDate(profile?.last_signed_in)}</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Account Status</label>
          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            Active
          </span>
        </div>
      </div>
      
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-500">Quizzes Taken</p>
            <p className="text-2xl font-bold text-gray-900">-</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-500">Problems Solved</p>
            <p className="text-2xl font-bold text-gray-900">-</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-500">Average Score</p>
            <p className="text-2xl font-bold text-gray-900">-</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
