/**
 * Controller for handling code submissions
 */
const judge0 = require('../utils/judge0');

/**
 * Run code without saving (for testing)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.runCode = async (req, res) => {
  try {
    const { code, language, input } = req.body;
    
    if (!code || !language) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide code and language'
      });
    }
    
    const result = await judge0.submitCode(code, language, input || '');
    
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Run code error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to run code. Please try again.'
    });
  }
};

/**
 * Submit code for a question
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.submitSolution = async (req, res) => {
  try {
    const questionId = req.params.questionId;
    const { code, language } = req.body;
    
    if (!code || !language) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide code and language'
      });
    }
    
    // Check if question exists
    const [questions] = await req.db.execute(
      'SELECT * FROM questions WHERE id = ?',
      [questionId]
    );
    
    if (questions.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Question not found'
      });
    }
    
    // Get all test cases for the question
    const [testCases] = await req.db.execute(
      'SELECT * FROM test_cases WHERE question_id = ?',
      [questionId]
    );
    
    if (testCases.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No test cases found for this question'
      });
    }
    
    // Validate code against test cases
    const results = await judge0.validateCode(code, language, testCases);
    
    // Check if all test cases passed
    const allPassed = results.every(result => result.passed);
    
    // Save submission
    const [submissionResult] = await req.db.execute(
      'INSERT INTO submissions (user_id, question_id, code, language, passed, test_case_results) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, questionId, code, language, allPassed, JSON.stringify(results)]
    );
    
    // Filter out hidden test cases for response
    const visibleResults = results.map(result => {
      if (result.hidden) {
        return {
          ...result,
          expectedOutput: 'Hidden',
          actualOutput: result.passed ? 'Correct' : 'Incorrect'
        };
      }
      return result;
    });
    
    res.status(200).json({
      status: 'success',
      message: allPassed ? 'All test cases passed!' : 'Some test cases failed',
      data: {
        submissionId: submissionResult.insertId,
        passed: allPassed,
        results: visibleResults
      }
    });
  } catch (error) {
    console.error('Submit solution error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit solution. Please try again.'
    });
  }
};

/**
 * Get user's submissions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserSubmissions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    // Fetch submissions for the user with pagination
    const [submissions] = await req.db.execute(
      'SELECT * FROM submissions WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?',
      [req.user.id, limit, offset]
    );
    // Get total count for pagination
    const [countRows] = await req.db.execute(
      'SELECT COUNT(*) as count FROM submissions WHERE user_id = ?',
      [req.user.id]
    );
    const total = countRows[0].count;
    res.status(200).json({
      status: 'success',
      data: {
        submissions,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get user submissions error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch submissions. Please try again.'
    });
  }
};