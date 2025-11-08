import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { getUsers, getPlatformStats, deleteQuestion, deleteQuiz } from '../services/adminService';
import { getQuestions } from '../services/questionService';
import { getQuizzes } from '../services/quizService';
import QuestionForm from '../components/QuestionForm';
import QuizForm from '../components/QuizForm';
import Leaderboard from '../components/Leaderboard';

const AdminPanel = ({ user }) => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    // Set active tab based on current path
    const path = location.pathname.split('/').pop();
    if (path === 'admin') {
      setActiveTab('dashboard');
    } else if (path === 'users') {
      setActiveTab('users');
    } else if (path === 'questions') {
      setActiveTab('questions');
    } else if (path === 'quizzes') {
      setActiveTab('quizzes');
    } else if (path === 'leaderboard') {
      setActiveTab('leaderboard');
    }
  }, [location]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Panel</h1>
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="border-b">
          <nav className="-mb-px flex">
            <Link
              to="/admin"
              className={`py-4 px-6 border-b-2 font-medium text-sm ${activeTab === 'dashboard' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </Link>
            <Link
              to="/admin/users"
              className={`py-4 px-6 border-b-2 font-medium text-sm ${activeTab === 'users' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('users')}
            >
              Users
            </Link>
            <Link
              to="/admin/questions"
              className={`py-4 px-6 border-b-2 font-medium text-sm ${activeTab === 'questions' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('questions')}
            >
              Questions
            </Link>
            <Link
              to="/admin/quizzes"
              className={`py-4 px-6 border-b-2 font-medium text-sm ${activeTab === 'quizzes' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('quizzes')}
            >
              Quizzes
            </Link>
            <Link
              to="/admin/leaderboard"
              className={`py-4 px-6 border-b-2 font-medium text-sm ${activeTab === 'leaderboard' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('leaderboard')}
            >
              🏆 Leaderboard
            </Link>
          </nav>
        </div>
        
        <div className="p-6">
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UsersManagement />} />
            <Route path="questions" element={<QuestionsManagement />} />
            <Route path="quizzes" element={<QuizzesManagement />} />
            <Route path="leaderboard" element={<Leaderboard />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await getPlatformStats();
      setStats(data);
    } catch (err) {
      setError('Failed to load statistics. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
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
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">No statistics available</div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Platform Statistics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-3xl font-bold text-primary-600 mb-2">{stats.totalUsers}</div>
          <div className="text-gray-500">Total Users</div>
          <div className="text-sm text-gray-400 mt-1">Registered users</div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-3xl font-bold text-primary-600 mb-2">{stats.totalQuestions}</div>
          <div className="text-gray-500">Coding Questions</div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-3xl font-bold text-primary-600 mb-2">{stats.totalQuizzes}</div>
          <div className="text-gray-500">Quizzes</div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-3xl font-bold text-primary-600 mb-2">{stats.totalSubmissions}</div>
          <div className="text-gray-500">Total Submissions</div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-3xl font-bold text-primary-600 mb-2">{stats.recentSubmissions?.length || 0}</div>
          <div className="text-gray-500">Recent Submissions</div>
        </div>
      </div>
    </div>
  );
};

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data.users);
    } catch (err) {
      setError('Failed to load users. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
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
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">No users found</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Users Management</h2>
        <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
          Add User
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created At
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button className="text-primary-600 hover:text-primary-900 mr-3">Edit</button>
                  <button className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const QuestionsManagement = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const data = await getQuestions({ page: 1, limit: 100 });
      setQuestions(data.questions || []);
    } catch (err) {
      setError('Failed to load questions. Please try again.');
      console.error('Questions fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        await deleteQuestion(id);
        setQuestions(questions.filter(q => q.id !== id));
      } catch (err) {
        setError('Failed to delete question. Please try again.');
      }
    }
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setShowForm(true);
  };

  const handleFormSave = () => {
    setShowForm(false);
    setEditingQuestion(null);
    fetchQuestions();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingQuestion(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Questions Management</h2>
        <button 
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Add Question
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Difficulty
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tags
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {questions.map((question) => (
              <tr key={question.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium ">{question.title}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${question.difficulty === 'Easy' ? 'bg-green-100 text-green-800' : 
                      question.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                      question.difficulty === 'Hard' ? 'bg-red-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
                  >
                    {question.difficulty}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-wrap gap-1">
                    {question.tags && Array.isArray(question.tags) && question.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button 
                    onClick={() => handleEditQuestion(question)}
                    className="text-primary-600 hover:text-primary-900 mr-3"
                  >
                    Edit
                  </button>
                  <button 
                    className="text-red-600 hover:text-red-900"
                    onClick={() => handleDeleteQuestion(question.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {showForm && (
        <QuestionForm
          question={editingQuestion}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      )}
    </div>
  );
};

const QuizzesManagement = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const data = await getQuizzes();
      setQuizzes(data.quizzes || []);
    } catch (err) {
      setError('Failed to load quizzes. Please try again.');
      console.error('Quizzes fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuiz = async (id) => {
    if (window.confirm('Are you sure you want to delete this quiz?')) {
      try {
        await deleteQuiz(id);
        setQuizzes(quizzes.filter(q => q.id !== id));
      } catch (err) {
        setError('Failed to delete quiz. Please try again.');
      }
    }
  };

  const handleEditQuiz = (quiz) => {
    setEditingQuiz(quiz);
    setShowForm(true);
  };

  const handleFormSave = () => {
    setShowForm(false);
    setEditingQuiz(null);
    fetchQuizzes();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingQuiz(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Quizzes Management</h2>
        <button 
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Add Quiz
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Difficulty
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Questions
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {quizzes.map((quiz) => (
              <tr key={quiz.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{quiz.title}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary-100 text-primary-800">
                    {quiz.category}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${quiz.difficulty === 'easy' ? 'bg-green-100 text-green-800' : 
                      quiz.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'}`}
                  >
                    {quiz.difficulty}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {quiz.questionCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button 
                    onClick={() => handleEditQuiz(quiz)}
                    className="text-primary-600 hover:text-primary-900 mr-3"
                  >
                    Edit
                  </button>
                  <button 
                    className="text-red-600 hover:text-red-900"
                    onClick={() => handleDeleteQuiz(quiz.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {showForm && (
        <QuizForm
          quiz={editingQuiz}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      )}
    </div>
  );
};

export default AdminPanel;