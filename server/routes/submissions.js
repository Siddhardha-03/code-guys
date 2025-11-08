const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middlewares/auth');
const judge0 = require('../utils/judge0');
const codeRunner = require('../utils/codeRunner');

/**
 * @route   POST /api/submissions/run
 * @desc    Run code without saving (for testing)
 * @access  Private
 */
router.post('/run', authenticate, async (req, res) => {
  try {
    const { code, language, input, questionId, testCaseId } = req.body;

    if (!code || !language) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide code and language'
      });
    }

    let wrappedSource = code;
    let expectedOutput = (input || '').trim();
    let testCaseInput = input || '';
    let hidden = false;
    let question = null;

    if (questionId) {
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

      question = questions[0];

      if (testCaseId) {
        const [testCaseRows] = await req.db.execute(
          'SELECT * FROM test_cases WHERE id = ? AND question_id = ?',
          [testCaseId, questionId]
        );

        if (testCaseRows.length === 0) {
          return res.status(404).json({
            status: 'error',
            message: 'Test case not found'
          });
        }

        const testCase = testCaseRows[0];
        testCaseInput = testCase.input || '';
        expectedOutput = (testCase.expected_output || '').trim();
        hidden = Boolean(testCase.hidden);
      }

      wrappedSource = codeRunner.buildWrappedCode({
        problem: question,
        code,
        language,
        testCaseInput
      });
    }

    const result = await judge0.submitCode(wrappedSource, language, '');

    const actualOutput = (result.stdout || '').trim();
    const errorOutput = (result.stderr || result.compileOutput || result.message || '').trim();
    const passed = !hidden && expectedOutput
      ? actualOutput === expectedOutput && !errorOutput
      : !errorOutput;

    res.status(200).json({
      status: 'success',
      data: {
        ...result,
        actualOutput,
        expectedOutput: hidden ? 'Hidden' : expectedOutput,
        input: testCaseInput,
        hidden,
        passed,
        error: errorOutput,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        compileOutput: result.compileOutput || ''
      }
    });
  } catch (error) {
    console.error('Run code error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to run code. Please try again.'
    });
  }
});

/**
 * @route   POST /api/submissions/:questionId
 * @desc    Submit code for a question
 * @access  Private
 */
router.post('/:questionId', authenticate, async (req, res) => {
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
    const question = questions[0];
    const results = await judge0.validateCode(code, language, testCases, { problem: question });
    
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
          actualOutput: result.passed ? 'Correct' : 'Incorrect',
          stdout: '',
          stderr: result.stderr,
          compileOutput: result.compileOutput
        };
      }
      return result;
    });
    
    res.status(201).json({
      status: 'success',
      data: {
        submissionId: submissionResult.insertId,
        passed: allPassed,
        results: visibleResults
      }
    });
  } catch (error) {
    console.error('Submit code error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit code. Please try again.'
    });
  }
});

/**
 * @route   GET /api/submissions/user
 * @desc    Get user's submissions
 * @access  Private
 */
router.get('/user', authenticate, async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10);
    if (!Number.isInteger(page) || page < 1) page = 1;

    let limit = parseInt(req.query.limit, 10);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      limit = 10;
    }

    const offset = (page - 1) * limit;
    
    // Get submissions with question details
    const submissionsQuery = `
      SELECT s.id, s.question_id, q.title, s.language, s.passed, s.submitted_at
      FROM submissions s
      JOIN questions q ON s.question_id = q.id
      WHERE s.user_id = ?
      ORDER BY s.submitted_at DESC
      LIMIT ${limit} OFFSET ${offset}`;

    const [submissions] = await req.db.execute(submissionsQuery, [req.user.id]);
    
    // Get total count for pagination
    const [countResult] = await req.db.execute(
      'SELECT COUNT(*) as total FROM submissions WHERE user_id = ?',
      [req.user.id]
    );
    
    const total = countResult[0].total;
    
    res.status(200).json({
      status: 'success',
      data: {
        submissions,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get submissions error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch submissions. Please try again.'
    });
  }
});

/**
 * @route   GET /api/submissions/:id
 * @desc    Get a specific submission
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const submissionId = req.params.id;
    
    // Get submission
    const [submissions] = await req.db.execute(
      `SELECT s.*, q.title, q.description 
       FROM submissions s 
       JOIN questions q ON s.question_id = q.id 
       WHERE s.id = ?`,
      [submissionId]
    );
    
    if (submissions.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Submission not found'
      });
    }
    
    const submission = submissions[0];
    
    // Check if user is authorized to view this submission
    if (submission.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to view this submission'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        submission
      }
    });
  } catch (error) {
    console.error('Get submission error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch submission. Please try again.'
    });
  }
});

/**
 * @route   GET /api/submissions/question/:questionId
 * @desc    Get submissions for a specific question
 * @access  Private
 */
router.get('/question/:questionId', authenticate, async (req, res) => {
  try {
    const questionId = req.params.questionId;
    let page = parseInt(req.query.page, 10);
    if (!Number.isInteger(page) || page < 1) page = 1;

    let limit = parseInt(req.query.limit, 10);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      limit = 10;
    }

    const offset = (page - 1) * limit;
    
    // Get submissions for the question (only user's own submissions unless admin)
    let query, params;
    if (req.user.role === 'admin') {
      query = `SELECT s.id, s.user_id, u.name as user_name, s.language, s.passed, s.submitted_at
               FROM submissions s
               JOIN users u ON s.user_id = u.id
               WHERE s.question_id = ?
               ORDER BY s.submitted_at DESC
               LIMIT ${limit} OFFSET ${offset}`;
      params = [questionId];
    } else {
      query = `SELECT s.id, s.user_id, s.language, s.passed, s.submitted_at, s.code, s.test_case_results
               FROM submissions s
               WHERE s.question_id = ? AND s.user_id = ?
               ORDER BY s.submitted_at DESC
               LIMIT ${limit} OFFSET ${offset}`;
      params = [questionId, req.user.id];
    }
    
    const [submissions] = await req.db.execute(query, params);
    
    // Get total count for pagination
    let countQuery, countParams;
    if (req.user.role === 'admin') {
      countQuery = 'SELECT COUNT(*) as total FROM submissions WHERE question_id = ?';
      countParams = [questionId];
    } else {
      countQuery = 'SELECT COUNT(*) as total FROM submissions WHERE question_id = ? AND user_id = ?';
      countParams = [questionId, req.user.id];
    }
    
    const [countResult] = await req.db.execute(countQuery, countParams);
    
    const total = countResult[0].total;
    
    res.status(200).json({
      status: 'success',
      data: {
        submissions,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get question submissions error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch submissions. Please try again.'
    });
  }
});

/**
 * @route   GET /api/submissions/stats/user
 * @desc    Get user submission statistics
 * @access  Private
 */
router.get('/stats/user', authenticate, async (req, res) => {
  try {
    // Get total submissions count
    const [totalResult] = await req.db.execute(
      'SELECT COUNT(*) as total FROM submissions WHERE user_id = ?',
      [req.user.id]
    );
    
    // Get successful submissions count
    const [passedResult] = await req.db.execute(
      'SELECT COUNT(*) as passed FROM submissions WHERE user_id = ? AND passed = true',
      [req.user.id]
    );
    
    // Get unique solved questions count
    const [solvedResult] = await req.db.execute(
      `SELECT COUNT(DISTINCT question_id) as solved 
       FROM submissions 
       WHERE user_id = ? AND passed = true`,
      [req.user.id]
    );
    
    // Get submissions by difficulty
    const [difficultyResult] = await req.db.execute(
      `SELECT q.difficulty, COUNT(*) as count, SUM(s.passed) as passed 
       FROM submissions s 
       JOIN questions q ON s.question_id = q.id 
       WHERE s.user_id = ? 
       GROUP BY q.difficulty`,
      [req.user.id]
    );
    
    // Get recent submissions
    const [recentSubmissions] = await req.db.execute(
      `SELECT s.id, s.question_id, q.title, s.language, s.passed, s.submitted_at 
       FROM submissions s 
       JOIN questions q ON s.question_id = q.id 
       WHERE s.user_id = ? 
       ORDER BY s.submitted_at DESC 
       LIMIT 5`,
      [req.user.id]
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        total: totalResult[0].total,
        passed: passedResult[0].passed,
        solved: solvedResult[0].solved,
        byDifficulty: difficultyResult,
        recentSubmissions
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch statistics. Please try again.'
    });
  }
});

module.exports = router;