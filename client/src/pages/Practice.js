import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getQuestions } from '../services/questionService';
import { getUserSubmissions } from '../services/submissionService';

const DEFAULT_TAGS = [
  'array',
  'hash table',
  'string',
  'linked list',
  'tree',
  'graph',
  'dynamic programming',
  'sorting',
  'recursion',
  'binary search',
  'two pointers',
  'sliding window',
  'stack',
  'queue',
  'heap',
  'greedy',
  'backtracking',
  'math',
  'bit manipulation'
];

const Practice = ({ user }) => {
  const [questions, setQuestions] = useState([]);
  const [availableTags, setAvailableTags] = useState(DEFAULT_TAGS);
  const [displayedQuestions, setDisplayedQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    difficulty: '',
    tag: '',
    status: '' // all, solved, unsolved
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0
  });
  const [userSubmissions, setUserSubmissions] = useState(new Map());
  const [stats, setStats] = useState({
    total: 0,
    solved: 0,
    attempted: 0
  });

  // Fetch user submissions for progress tracking
  const fetchUserSubmissions = useCallback(async () => {
    if (!user) return;
    
    try {
      const submissions = await getUserSubmissions();
      const submissionMap = new Map();
      let solvedCount = 0;
      let attemptedCount = 0;
      
      submissions.forEach(sub => {
        const questionId = sub.question_id;
        const existing = submissionMap.get(questionId);
        
        if (!existing || sub.submitted_at > existing.submitted_at) {
          submissionMap.set(questionId, sub);
        }
        
        if (sub.passed) solvedCount++;
        attemptedCount++;
      });
      
      setUserSubmissions(submissionMap);
      setStats(prev => ({
        ...prev,
        solved: solvedCount,
        attempted: attemptedCount
      }));
    } catch (err) {
      console.error('Failed to fetch user submissions:', err);
    }
  }, [user]);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        ...filters
      };
      
      const data = await getQuestions(params);
      let questionsData = data?.questions || [];
      questionsData.sort((a, b) => {
        const idA = Number(a.id) || 0;
        const idB = Number(b.id) || 0;
        return idA - idB;
      });
      const totalFromServer = data?.total ?? questionsData.length;

      // Filter by submission status if needed
      if (filters.status && user) {
        questionsData = questionsData.filter(q => {
          const submission = userSubmissions.get(q.id);
          if (filters.status === 'solved') {
            return submission && submission.passed;
          } else if (filters.status === 'unsolved') {
            return !submission || !submission.passed;
          }
          return true;
        });
      }
      
      setQuestions(questionsData);
      setPagination(prev => ({
        ...prev,
        total: totalFromServer
      }));
      setStats(prev => ({
        ...prev,
        total: totalFromServer
      }));

      const tagsSet = new Set(DEFAULT_TAGS);
      questionsData.forEach(question => {
        if (Array.isArray(question.tags)) {
          question.tags.forEach(tag => tagsSet.add(tag));
        }
      });
      setAvailableTags(Array.from(tagsSet).sort());
      setError('');
    } catch (err) {
      setError('Failed to load questions. Please try again.');
      console.error('Questions fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters, searchTerm, userSubmissions, user]);

  useEffect(() => {
    fetchUserSubmissions();
  }, [fetchUserSubmissions]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    const handleProgressUpdate = async () => {
      await fetchUserSubmissions();
      await fetchQuestions();
    };

    const refreshIfNeeded = async () => {
      const needsRefresh = localStorage.getItem('practiceNeedsRefresh');
      if (needsRefresh) {
        await handleProgressUpdate();
        localStorage.removeItem('practiceNeedsRefresh');
      }
    };

    refreshIfNeeded();
    window.addEventListener('practiceProgressUpdated', handleProgressUpdate);

    return () => {
      window.removeEventListener('practiceProgressUpdated', handleProgressUpdate);
    };
  }, [fetchUserSubmissions, fetchQuestions]);

  useEffect(() => {
    let filtered = [...questions].sort((a, b) => {
      const idA = Number(a.id) || 0;
      const idB = Number(b.id) || 0;
      return idA - idB;
    });

    if (filters.difficulty) {
      filtered = filtered.filter(question => (question.difficulty || '').toLowerCase() === filters.difficulty.toLowerCase());
    }

    if (filters.tag) {
      filtered = filtered.filter(question => Array.isArray(question.tags) && question.tags.map(tag => tag.toLowerCase()).includes(filters.tag.toLowerCase()));
    }

    if (filters.status && user) {
      filtered = filtered.filter(question => {
        const submission = userSubmissions.get(question.id);
        if (filters.status === 'solved') {
          return submission?.passed;
        }
        if (filters.status === 'unsolved') {
          return !submission || !submission.passed;
        }
        return true;
      });
    }

    const trimmedSearch = searchTerm.trim();
    const isNumericSearch = /^\d+$/.test(trimmedSearch);

    if (trimmedSearch) {
      const needle = trimmedSearch.toLowerCase();
      const searchNumber = isNumericSearch ? parseInt(trimmedSearch, 10) : null;

      filtered = filtered.filter((question) => {
        const titleMatch = question.title?.toLowerCase().includes(needle);
        const descriptionText = question.description?.replace(/<[^>]*>/g, '').toLowerCase();
        const descriptionMatch = descriptionText?.includes(needle);
        const tagMatch = Array.isArray(question.tags) && question.tags.some(tag => tag.toLowerCase().includes(needle));
        const idMatch = isNumericSearch && question.id === searchNumber;
        const idContains = question.id != null && question.id.toString().includes(trimmedSearch);
        return titleMatch || descriptionMatch || tagMatch || idMatch || (isNumericSearch && idContains);
      });
    }

    const annotated = filtered.map((question) => ({
      question,
      displayNumber: question.id
    }));

    const solvedCount = annotated.filter(({ question }) => {
      const submission = userSubmissions.get(question.id);
      return submission?.passed;
    }).length;

    const attemptedCount = annotated.filter(({ question }) => {
      const submission = userSubmissions.get(question.id);
      return submission && !submission.passed;
    }).length;

    const totalFiltered = annotated.length;
    const limit = pagination.limit;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / limit) || 1);
    const nextPage = Math.min(pagination.page, totalPages);

    const startIndex = (nextPage - 1) * limit;
    const endIndex = startIndex + limit;

    setStats(prev => ({
      ...prev,
      total: totalFiltered,
      solved: solvedCount,
      attempted: attemptedCount
    }));

    setPagination(prev => {
      const updated = {
        ...prev,
        page: nextPage,
        total: totalFiltered
      };
      const samePage = updated.page === prev.page;
      const sameTotal = updated.total === prev.total;
      const sameLimit = updated.limit === prev.limit;
      return samePage && sameTotal && sameLimit ? prev : updated;
    });

    setDisplayedQuestions(annotated.slice(startIndex, endIndex));

  }, [questions, searchTerm, filters, pagination.page, pagination.limit, userSubmissions, user]);

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

  const handlePageChange = (newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    // Reset to first page when search changes
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      difficulty: '',
      tag: '',
      status: ''
    });
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
  };

  const getSubmissionStatus = (questionId) => {
    const submission = userSubmissions.get(questionId);
    if (!submission) return 'not-attempted';
    return submission.passed ? 'solved' : 'attempted';
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'hard':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getActionButtonClass = (status) => {
    if (status === 'solved') {
      return 'status-button status-button--solved';
    }
    if (status === 'attempted') {
      return 'status-button status-button--continue';
    }
    return 'status-button status-button--solve';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 pb-24">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="space-y-6">
        {/* Header with Stats */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Practice Coding Problems</h1>
          <p className="text-sm sm:text-base text-gray-600 mb-4">Sharpen your skills with our curated collection of coding challenges</p>
          
          {user && (
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-4">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-xs sm:text-sm text-gray-500">Total Problems</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.solved}</div>
                <div className="text-xs sm:text-sm text-gray-500">Solved</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.attempted}</div>
                <div className="text-xs sm:text-sm text-gray-500">Attempted</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-purple-600">
                  {stats.total > 0 ? Math.round((stats.solved / stats.total) * 100) : 0}%
                </div>
                <div className="text-xs sm:text-sm text-gray-500">Success Rate</div>
              </div>
            </div>
          )}
        </div>
        
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="sm:col-span-2 lg:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search Problems
              </label>
              <div className="relative">
                <input
                  id="search"
                  type="text"
                  placeholder="Search by title or description..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Difficulty Filter */}
            <div>
              <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty
              </label>
              <select
                id="difficulty"
                name="difficulty"
                value={filters.difficulty}
                onChange={handleFilterChange}
                className="w-full py-2 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            
            {/* Topic Filter */}
            <div>
              <label htmlFor="tag" className="block text-sm font-medium text-gray-700 mb-1">
                Topic
              </label>
              <select
                id="tag"
                name="tag"
                value={filters.tag}
                onChange={handleFilterChange}
                className="w-full py-2 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
              >
                <option value="">All Topics</option>
                {availableTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag.charAt(0).toUpperCase() + tag.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Status Filter (only show if user is logged in) */}
            {user && (
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="w-full py-2 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                >
                  <option value="">All Problems</option>
                  <option value="solved">Solved</option>
                  <option value="unsolved">Unsolved</option>
                </select>
              </div>
            )}
          </div>
          
          {/* Clear Filters Button */}
          {(searchTerm || filters.difficulty || filters.tag || filters.status) && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
        
        {/* Error message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}
        
        {/* Loading state */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Questions list */}
            <div className="grid grid-cols-1 gap-4">
              {displayedQuestions.length > 0 ? (
                displayedQuestions.map(({ question, displayNumber }) => {
                  const status = getSubmissionStatus(question.id);
                  return (
                    <div key={question.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div className="flex-1 w-full sm:w-auto">
                          <div className="flex items-center gap-2 sm:gap-3 mb-2">
                            <span className="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-semibold text-sm">
                              {displayNumber}
                            </span>
                            {/* Status Indicator */}
                            {user && (
                              <div className="flex-shrink-0">
                                {status === 'solved' && (
                                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                                {status === 'attempted' && (
                                  <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                                {status === 'not-attempted' && (
                                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Question Title */}
                            <Link 
                              to={`/practice/${question.id}`} 
                              className="text-base sm:text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2"
                            >
                              {question.title}
                            </Link>
                          </div>
                          
                          {/* Description Preview */}
                          {question.description && (
                            <p className="text-gray-600 text-xs sm:text-sm mb-3 line-clamp-2">
                              {question.description.replace(/<[^>]*>/g, '').substring(0, 150)}...
                            </p>
                          )}
                          
                          {/* Tags and Difficulty */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(question.difficulty)}`}>
                              {question.difficulty}
                            </span>
                            {question.tags && Array.isArray(question.tags) && question.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md">
                                {tag}
                              </span>
                            ))}
                            {question.tags && question.tags.length > 3 && (
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-md">
                                +{question.tags.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Action Button */}
                        <div className="flex-shrink-0 w-full sm:w-auto">
                          <Link 
                            to={`/practice/${question.id}`} 
                            className={`${getActionButtonClass(status)} w-full sm:w-auto text-center`}
                          >
                            {status === 'solved' ? 'Solved ✓' : status === 'attempted' ? 'Continue' : 'Solve'}
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl sm:text-6xl mb-4">🔍</div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No problems found</h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-4">No questions match your current filters.</p>
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
            
            {/* Pagination */}
            {questions.length > 0 && Math.ceil(pagination.total / pagination.limit) > 1 && (
              <div className="flex justify-center items-center mt-8">
                <nav className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">Prev</span>
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.ceil(pagination.total / pagination.limit) }, (_, i) => i + 1)
                      .filter(page => {
                        const current = pagination.page;
                        return page === 1 || page === Math.ceil(pagination.total / pagination.limit) || 
                               (page >= current - 1 && page <= current + 1);
                      })
                      .map((page, index, array) => {
                        if (index > 0 && array[index - 1] < page - 1) {
                          return (
                            <React.Fragment key={`ellipsis-${page}`}>
                              <span className="px-1 sm:px-2 py-1 text-gray-500 text-xs sm:text-sm">...</span>
                              <button
                                onClick={() => handlePageChange(page)}
                                className={`px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md ${
                                  pagination.page === page
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            </React.Fragment>
                          );
                        }
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md ${
                              pagination.page === page
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                    className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <span className="sm:hidden">Next</span>
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
};

export default Practice;