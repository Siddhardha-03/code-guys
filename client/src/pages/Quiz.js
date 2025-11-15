import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getQuizzes } from '../services/quizService';

const Quiz = ({ user }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });

  const fetchQuizzes = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };
      
      const data = await getQuizzes(params);
      setQuizzes(data.quizzes);
      setPagination(prev => ({
        ...prev,
        total: data.total
      }));
    } catch (err) {
      setError('Failed to load quizzes. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    // Reset to first page when filters change
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchQuizzes();
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto px-3 sm:px-4">
      <h1 className="text-2xl sm:text-3xl font-bold text-center">Coding Quizzes</h1>
      <p className="text-sm sm:text-base text-gray-600 text-center">Test your knowledge with our collection of programming quizzes.</p>
      
      {/* Filters */}
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-3 sm:gap-4 justify-center">
          <div className="w-full md:w-auto">
            <label htmlFor="search" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="search"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search by title or description"
                className="w-full md:w-72 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm sm:text-base py-1.5 sm:py-2 px-2 sm:px-3"
              />
              <button
                type="submit"
                className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Search
              </button>
            </div>
          </div>

          <div className="w-full md:w-auto">
            <label htmlFor="category" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm sm:text-base py-1.5 sm:py-2 px-2 sm:px-3"
            >
              <option value="">All Categories</option>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="algorithms">Algorithms</option>
              <option value="data-structures">Data Structures</option>
              <option value="web-development">Web Development</option>
            </select>
          </div>
        </form>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {/* Quizzes grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 justify-items-stretch">
            {quizzes.length > 0 ? (
              quizzes.map((quiz) => (
                <div key={quiz.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-semibold mb-2">{quiz.title}</h2>
                    <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 line-clamp-2">{quiz.description}</p>
                    
                    <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        {quiz.duration || 60} minutes
                      </div>
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        {quiz.questionCount} questions
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {quiz.category && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                          {quiz.category}
                        </span>
                      )}
                      {quiz.userStatus && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium 
                          ${quiz.userStatus === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                        >
                          {quiz.userStatus === 'completed' ? '✓ Completed' : 'Attempted'}
                        </span>
                      )}
                      {typeof quiz.bestScore === 'number' && typeof quiz.questionCount === 'number' && quiz.bestScore > 0 && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Best: {quiz.bestScore}/{quiz.questionCount}
                        </span>
                      )}
                      {quiz.attemptsCount && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {quiz.attemptsCount} attempt{quiz.attemptsCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    
                    <Link 
                      to={`/quizzes/${quiz.id}`} 
                      className="block w-full text-center px-3 sm:px-4 py-1.5 sm:py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      {quiz.userStatus === 'completed' ? 'Retake Quiz' : quiz.userStatus === 'in_progress' ? 'Continue Quiz' : 'Start Quiz'}
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-500">No quizzes found matching your criteria.</p>
              </div>
            )}
          </div>
          
          {/* Pagination */}
          {quizzes.length > 0 && (
            <div className="flex justify-center mt-4 sm:mt-6">
              <nav className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-2 sm:px-3 py-1 rounded-md border border-gray-300 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                >
                  Previous
                </button>
                <span className="text-gray-700 text-xs sm:text-sm">
                  Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                  className="px-2 sm:px-3 py-1 rounded-md border border-gray-300 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                >
                  Next
                </button>
              </nav>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Quiz;