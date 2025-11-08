import React, { useState, useEffect, useCallback } from 'react';
import { getLeaderboard, getRecentActivity } from '../services/adminService';

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);
  const [activeTab, setActiveTab] = useState('overall');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLeaderboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching leaderboard data for tab:', activeTab);
      const data = await getLeaderboard(activeTab, 15);
      console.log('Received leaderboard data:', data);
      setLeaderboardData(data || {});
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
      setError(`Failed to load leaderboard data: ${err.toString()}`);
      setLeaderboardData({});
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const fetchRecentActivity = useCallback(async () => {
    try {
      console.log('Fetching recent activity...');
      const data = await getRecentActivity(15);
      console.log('Received recent activity:', data);
      setRecentActivity(data.recentActivity || []);
    } catch (err) {
      console.error('Failed to load recent activity:', err);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboardData();
  }, [fetchLeaderboardData]);

  useEffect(() => {
    fetchRecentActivity();
  }, [fetchRecentActivity]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const renderQuizLeaderboard = () => {
    if (!leaderboardData.quiz || leaderboardData.quiz.length === 0) {
      return <div className="text-center py-8 text-gray-500">No quiz data available</div>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quizzes</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Best Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attempts</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leaderboardData.quiz.map((user, index) => (
              <tr key={user.id} className={index < 3 ? 'bg-yellow-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {getRankIcon(index + 1)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Avg: {user.avg_score}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.quizzes_completed}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  Best: {user.highest_score}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.total_attempts}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderCodingLeaderboard = () => {
    if (!leaderboardData.coding || leaderboardData.coding.length === 0) {
      return <div className="text-center py-8 text-gray-500">No coding data available</div>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solved</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attempted</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submissions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leaderboardData.coding.map((user, index) => (
              <tr key={user.id} className={index < 3 ? 'bg-yellow-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {getRankIcon(index + 1)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {user.problems_solved}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.problems_attempted}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.success_rate >= 70 ? 'bg-green-100 text-green-800' : 
                    user.success_rate >= 50 ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-red-100 text-red-800'
                  }`}>
                    {user.success_rate}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.total_submissions}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderOverallStats = () => {
    if (!leaderboardData.stats) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{leaderboardData.stats.total_active_users}</div>
          <div className="text-sm text-blue-800">Active Users</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{leaderboardData.stats.total_quizzes}</div>
          <div className="text-sm text-green-800">Total Quizzes</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{leaderboardData.stats.total_questions}</div>
          <div className="text-sm text-purple-800">Coding Questions</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{leaderboardData.stats.total_submissions}</div>
          <div className="text-sm text-orange-800">Total Submissions</div>
        </div>
      </div>
    );
  };

  const renderRecentActivity = () => {
    if (recentActivity.length === 0) {
      return <div className="text-center py-8 text-gray-500">No recent activity</div>;
    }

    return (
      <div className="space-y-3">
        {recentActivity.map((activity, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`w-2 h-2 rounded-full ${
                activity.activity_type === 'quiz' ? 'bg-blue-500' : 'bg-green-500'
              }`}></div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {activity.user_name}
                </div>
                <div className="text-xs text-gray-500">
                  {activity.activity_type === 'quiz' 
                    ? `Completed "${activity.quiz_title}" with score ${activity.score}`
                    : `${activity.passed ? 'Solved' : 'Attempted'} "${activity.question_title}"`
                  }
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-400">
              {formatDate(activity.submitted_at)}
            </div>
          </div>
        ))}
      </div>
    );
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1>
        <button
          onClick={fetchLeaderboardData}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          Refresh
        </button>
      </div>

      {activeTab === 'overall' && renderOverallStats()}

      <div className="bg-white shadow-sm rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {['overall', 'quiz', 'coding'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'overall' ? 'Overall' : tab === 'quiz' ? 'Quiz Champions' : 'Coding Masters'}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overall' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">🏆 Quiz Champions</h3>
                {renderQuizLeaderboard()}
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">💻 Coding Masters</h3>
                {renderCodingLeaderboard()}
              </div>
            </div>
          )}
          {activeTab === 'quiz' && renderQuizLeaderboard()}
          {activeTab === 'coding' && renderCodingLeaderboard()}
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">📈 Recent Activity</h3>
        {renderRecentActivity()}
      </div>
    </div>
  );
};

export default Leaderboard;
