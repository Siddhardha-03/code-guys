import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { updateProfile } from '../services/authService';
import { getUserStats, getUserSubmissions } from '../services/questionService';
import { getUserQuizStats, getUserQuizSubmissions } from '../services/quizService';

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState({
    solvedProblems: 0,
    completedQuizzes: 0,
    totalScore: 0,
    streak: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchUserStats = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch both submission and quiz stats in parallel
      const [submissionStats, quizStats] = await Promise.all([
        getUserStats().catch(() => ({ total: 0, passed: 0, averageScore: 0 })),
        getUserQuizStats().catch(() => ({ total: 0, averageScore: 0 }))
      ]);

      setStats({
        solvedProblems: submissionStats.passed || 0,
        completedQuizzes: quizStats.total || 0,
        totalScore: Math.round(((submissionStats.averageScore || 0) + (quizStats.averageScore || 0)) / 2),
        streak: calculateStreak() // We'll implement this based on recent activity
      });
    } catch (err) {
      console.error('Error fetching user stats:', err);
      // Set default values on error
      setStats({
        solvedProblems: 0,
        completedQuizzes: 0,
        totalScore: 0,
        streak: 0
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRecentActivity = useCallback(async () => {
    try {
      // Fetch recent submissions and quiz submissions
      const [submissions, quizSubmissions] = await Promise.all([
        getUserSubmissions({ limit: 5 }).catch(() => ({ submissions: [] })),
        getUserQuizSubmissions().catch(() => ({ submissions: [] }))
      ]);

      // Combine and format the activities
      const activities = [];
      
      // Add coding submissions
      if (submissions.submissions) {
        submissions.submissions.forEach(submission => {
          activities.push({
            id: submission.question_id,
            type: 'problem',
            title: submission.question_title || submission.title || `Problem ${submission.question_id}`,
            date: submission.submitted_at,
            status: submission.passed ? 'solved' : 'attempted'
          });
        });
      }

      // Add quiz submissions
      if (quizSubmissions.submissions) {
        quizSubmissions.submissions.forEach(submission => {
          activities.push({
            id: submission.quiz_id,
            type: 'quiz',
            title: submission.quiz_title || submission.title || `Quiz ${submission.quiz_id}`,
            date: submission.submitted_at,
            status: 'completed',
            score: submission.score,
            totalQuestions: submission.total_questions
          });
        });
      }

      // Sort by date (most recent first) and take top 5
      activities.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecentActivity(activities.slice(0, 5));
    } catch (err) {
      console.error('Error fetching recent activity:', err);
      setRecentActivity([]);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserStats();
      fetchRecentActivity();
    }
  }, [user, fetchUserStats, fetchRecentActivity]);

  const calculateStreak = () => {
    // Simple streak calculation - could be enhanced
    // For now, return a default value
    return 0;
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm({
      ...profileForm,
      [name]: value
    });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setUpdating(true);

    try {
      await updateProfile(profileForm);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.toString());
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (!user) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded" role="alert">
        <span className="block sm:inline">Please log in to view your dashboard.</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stats cards */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-4xl font-bold text-primary-600 mb-2">{stats.solvedProblems}</div>
          <div className="text-gray-500">Problems Solved</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-4xl font-bold text-primary-600 mb-2">{stats.completedQuizzes}</div>
          <div className="text-gray-500">Quizzes Completed</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-4xl font-bold text-primary-600 mb-2">{stats.totalScore}</div>
          <div className="text-gray-500">Total Score</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-4xl font-bold text-primary-600 mb-2">{stats.streak}</div>
          <div className="text-gray-500">Day Streak</div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <Link 
                          to={activity.type === 'problem' ? `/practice/${activity.id}` : `/quizzes/${activity.id}`}
                          className="text-primary-600 hover:text-primary-800 font-medium"
                        >
                          {activity.title}
                        
                        </Link>
                        <div className="text-sm text-gray-500 mt-1">
                          {formatDate(activity.date)}
                        </div>
                      </div>
                      <div>
                        {activity.status === 'solved' && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Solved
                          </span>
                        )}
                        {activity.status === 'attempted' && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Attempted
                          </span>
                        )}
                        {activity.status === 'completed' && (
                          <div className="flex flex-col items-end">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Completed
                            </span>
                            {typeof activity.score === 'number' && typeof activity.totalQuestions === 'number' && (
                              <span className="text-sm font-medium mt-1">
                                Score: {activity.score}/{activity.totalQuestions}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No recent activity. Start solving problems or taking quizzes!
              </p>
            )}
            
            <div className="mt-4 flex justify-between">
              <Link 
                to="/practice"
                className="text-primary-600 hover:text-primary-800 text-sm font-medium"
              >
                Practice Problems
              </Link>
              <Link 
                to="/quizzes"
                className="text-primary-600 hover:text-primary-800 text-sm font-medium"
              >
                Take Quizzes
              </Link>
            </div>
          </div>
        </div>
        
        {/* Profile section */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Profile</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4" role="alert">
              <span className="block sm:inline">{success}</span>
            </div>
          )}
          
          <form onSubmit={handleProfileSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                Full Name
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="name"
                type="text"
                name="name"
                value={profileForm.name}
                onChange={handleProfileChange}
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                Email Address
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="email"
                type="email"
                name="email"
                value={profileForm.email}
                onChange={handleProfileChange}
                required
              />
            </div>
            
            <div className="flex items-center justify-between">
              <button
                className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                type="submit"
                disabled={updating}
              >
                {updating ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </span>
                ) : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;