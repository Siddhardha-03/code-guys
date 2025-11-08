const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middlewares/auth');

/**
 * @route   GET /api/questions
 * @desc    Get all coding questions (with pagination)
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const difficulty = req.query.difficulty;
    const tag = req.query.tag;
    
    let query = `
      SELECT q.id, q.title, q.function_name, q.difficulty, q.question_type, q.tags, 
      (SELECT COUNT(*) FROM submissions s WHERE s.question_id = q.id) as attempt_count
      FROM questions q
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    // Add filters if provided
    if (difficulty) {
      query += ` AND q.difficulty = ?`;
      queryParams.push(difficulty);
    }
    
    if (tag) {
      query += ` AND (JSON_CONTAINS(q.tags, ?) OR JSON_CONTAINS(q.tags, ?))`;
      queryParams.push(`"${tag}"`);
      queryParams.push(`{"tags":["${tag}"]}`);
    }
    
    // Add pagination (newest questions first based on ID)
    query += ` ORDER BY q.id DESC LIMIT ${limit} OFFSET ${offset}`;
    
    // Execute query
    const [questions] = await req.db.execute(query, queryParams);
    
    // Parse JSON fields
    questions.forEach(question => {
      if (question.tags && typeof question.tags === 'string') {
        try {
          const parsed = JSON.parse(question.tags);
          question.tags = parsed.tags || [];
        } catch (e) {
          question.tags = [];
        }
      } else if (question.tags && typeof question.tags === 'object') {
        question.tags = question.tags.tags || [];
      } else {
        question.tags = [];
      }
      
      if (question.language_supported && typeof question.language_supported === 'string') {
        try {
          const parsed = JSON.parse(question.language_supported);
          question.language_supported = parsed.languages || [];
        } catch (e) {
          question.language_supported = [];
        }
      } else if (question.language_supported && typeof question.language_supported === 'object') {
        question.language_supported = question.language_supported.languages || [];
      } else {
        question.language_supported = [];
      }
    });
    
    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM questions WHERE 1=1`;
    const countParams = [];
    
    if (difficulty) {
      countQuery += ` AND difficulty = ?`;
      countParams.push(difficulty);
    }
    
    if (tag) {
      countQuery += ` AND JSON_CONTAINS(tags, ?)`;
      countParams.push(`"${tag}"`);
    }
    
    const [countResult] = await req.db.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    res.status(200).json({
      status: 'success',
      data: {
        questions,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get questions error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch questions. Please try again.'
    });
  }
});

/**
 * @route   GET /api/questions/:id
 * @desc    Get a single coding question with test cases
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const questionId = req.params.id;
    
    // Get question details
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
    
    const question = questions[0];
    
    // Parse JSON fields
    if (question.tags && typeof question.tags === 'string') {
      try {
        const parsed = JSON.parse(question.tags);
        question.tags = parsed.tags || [];
      } catch (e) {
        question.tags = [];
      }
    } else if (question.tags && typeof question.tags === 'object') {
      question.tags = question.tags.tags || [];
    } else {
      question.tags = [];
    }
    
    if (question.language_supported && typeof question.language_supported === 'string') {
      try {
        const parsed = JSON.parse(question.language_supported);
        question.language_supported = parsed.languages || [];
      } catch (e) {
        question.language_supported = [];
      }
    } else if (question.language_supported && typeof question.language_supported === 'object') {
      question.language_supported = question.language_supported.languages || [];
    } else {
      question.language_supported = [];
    }
    
    // Parse examples JSON field
    if (question.examples && typeof question.examples === 'string') {
      try {
        question.examples = JSON.parse(question.examples);
      } catch (e) {
        question.examples = [];
      }
    } else if (!question.examples) {
      question.examples = [];
    }
    
    // Get all test cases (both hidden and visible for practice)
    const [testCases] = await req.db.execute(
      'SELECT id, input, expected_output, hidden FROM test_cases WHERE question_id = ? ORDER BY hidden ASC, id ASC',
      [questionId]
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        question,
        testCases
      }
    });
  } catch (error) {
    console.error('Get question error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch question. Please try again.'
    });
  }
});

/**
 * @route   POST /api/questions
 * @desc    Create a new coding question
 * @access  Private (Admin only)
 */
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const { title, function_name, description, difficulty, question_type, parameter_schema, language_supported, tags, examples, testCases } = req.body;
    
    // Validate input
    if (!title || !description || !difficulty || !language_supported || !tags || !testCases) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide all required fields'
      });
    }
    
    // Start a transaction
    const connection = await req.db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Insert question
      const [questionResult] = await connection.execute(
        'INSERT INTO questions (title, function_name, description, difficulty, question_type, parameter_schema, language_supported, tags, examples, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          title,
          function_name && function_name.trim() ? function_name.trim() : null,
          description,
          difficulty,
          question_type || null,
          parameter_schema ? JSON.stringify(parameter_schema) : null,
          JSON.stringify(language_supported),
          JSON.stringify(tags),
          JSON.stringify(examples || []),
          req.user.id
        ]
      );
      
      const questionId = questionResult.insertId;
      
      // Insert test cases
      for (const testCase of testCases) {
        await connection.execute(
          'INSERT INTO test_cases (question_id, input, expected_output, hidden) VALUES (?, ?, ?, ?)',
          [questionId, testCase.input, testCase.expected_output, testCase.hidden || false]
        );
      }
      
      // Commit transaction
      await connection.commit();
      
      res.status(201).json({
        status: 'success',
        message: 'Question created successfully',
        data: {
          questionId
        }
      });
    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Create question error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create question. Please try again.'
    });
  }
});

/**
 * @route   PUT /api/questions/:id
 * @desc    Update a coding question
 * @access  Private (Admin only)
 */
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const questionId = req.params.id;
    const { title, function_name, description, difficulty, question_type, parameter_schema, language_supported, tags, examples, testCases } = req.body;
    
    // Validate required fields
    if (!title?.trim() || !description?.trim() || !difficulty) {
      return res.status(400).json({
        status: 'error',
        message: 'Title, description, and difficulty are required'
      });
    }

    // Check if question exists
    const [questions] = await req.db.execute(
      'SELECT id FROM questions WHERE id = ?',
      [questionId]
    );
    
    if (questions.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Question not found'
      });
    }

    // Safely prepare JSON data with defaults
    const safeLanguageSupported = language_supported || { languages: ['javascript'] };
    const safeTags = tags || { tags: [] };
    const safeExamples = examples || [];
    const safeQuestionType = typeof question_type === 'string' && question_type.trim() ? question_type.trim() : null;
    const safeParameterSchema = parameter_schema ? JSON.stringify(parameter_schema) : null;

    // Update question
    await req.db.execute(
      'UPDATE questions SET title = ?, function_name = ?, description = ?, difficulty = ?, question_type = ?, parameter_schema = ?, language_supported = ?, tags = ?, examples = ? WHERE id = ?',
      [
        title.trim(),
        function_name && function_name.trim() ? function_name.trim() : null,
        description.trim(),
        difficulty,
        safeQuestionType,
        safeParameterSchema,
        JSON.stringify(safeLanguageSupported),
        JSON.stringify(safeTags),
        JSON.stringify(safeExamples),
        questionId
      ]
    );

    // Handle test cases if provided
    if (testCases && Array.isArray(testCases) && testCases.length > 0) {
      // Remove existing test cases
      await req.db.execute('DELETE FROM test_cases WHERE question_id = ?', [questionId]);
      
      // Insert new test cases
      for (const testCase of testCases) {
        if (testCase.input !== undefined && testCase.expected_output !== undefined) {
          await req.db.execute(
            'INSERT INTO test_cases (question_id, input, expected_output, hidden) VALUES (?, ?, ?, ?)',
            [questionId, testCase.input, testCase.expected_output, Boolean(testCase.hidden)]
          );
        }
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Question updated successfully'
    });

  } catch (error) {
    console.error('Question update error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update question. Please try again.'
    });
  }
});

/**
 * @route   DELETE /api/questions/:id
 * @desc    Delete a coding question
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const questionId = req.params.id;
    
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
    
    // Start a transaction
    const connection = await req.db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Delete test cases first (due to foreign key constraint)
      await connection.execute(
        'DELETE FROM test_cases WHERE question_id = ?',
        [questionId]
      );
      
      // Delete submissions
      await connection.execute(
        'DELETE FROM submissions WHERE question_id = ?',
        [questionId]
      );
      
      // Delete question
      await connection.execute(
        'DELETE FROM questions WHERE id = ?',
        [questionId]
      );
      
      // Commit transaction
      await connection.commit();
      
      res.status(200).json({
        status: 'success',
        message: 'Question deleted successfully'
      });
    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Delete question error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete question. Please try again.'
    });
  }
});

/**
 * @route   POST /api/questions/:id/test-cases
 * @desc    Add test cases to a question
 * @access  Private (Admin only)
 */
router.post('/:id/test-cases', authenticate, isAdmin, async (req, res) => {
  try {
    const questionId = req.params.id;
    const { testCases } = req.body;
    
    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide valid test cases'
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
    
    // Insert test cases
    for (const testCase of testCases) {
      await req.db.execute(
        'INSERT INTO test_cases (question_id, input, expected_output, hidden) VALUES (?, ?, ?, ?)',
        [questionId, testCase.input, testCase.expected_output, testCase.hidden || false]
      );
    }
    
    res.status(201).json({
      status: 'success',
      message: 'Test cases added successfully'
    });
  } catch (error) {
    console.error('Add test cases error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add test cases. Please try again.'
    });
  }
});

/**
 * @route   GET /api/questions/:id/all-test-cases
 * @desc    Get all test cases for a question (including hidden ones)
 * @access  Private (Admin only)
 */
router.get('/:id/all-test-cases', authenticate, isAdmin, async (req, res) => {
  try {
    const questionId = req.params.id;
    console.log('Fetching test cases for question:', questionId);
    
    // Get all test cases
    const [testCases] = await req.db.execute(
      'SELECT * FROM test_cases WHERE question_id = ? ORDER BY id',
      [questionId]
    );
    
    console.log('Found test cases:', testCases);
    
    res.status(200).json({
      status: 'success',
      data: {
        testCases
      }
    });
  } catch (error) {
    console.error('Get test cases error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch test cases. Please try again.'
    });
  }
});

/**
 * @route   PUT /api/questions/:questionId/test-cases/:testCaseId/toggle-hidden
 * @desc    Toggle hidden status of a test case
 * @access  Private (Admin only)
 */
router.put('/:questionId/test-cases/:testCaseId/toggle-hidden', authenticate, isAdmin, async (req, res) => {
  try {
    const { questionId, testCaseId } = req.params;
    
    // Get current hidden status
    const [testCase] = await req.db.execute(
      'SELECT hidden FROM test_cases WHERE id = ? AND question_id = ?',
      [testCaseId, questionId]
    );
    
    if (testCase.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Test case not found'
      });
    }
    
    // Toggle hidden status
    const newHiddenStatus = !testCase[0].hidden;
    await req.db.execute(
      'UPDATE test_cases SET hidden = ? WHERE id = ? AND question_id = ?',
      [newHiddenStatus, testCaseId, questionId]
    );
    
    res.status(200).json({
      status: 'success',
      message: `Test case ${newHiddenStatus ? 'hidden' : 'made visible'}`,
      data: {
        testCaseId,
        hidden: newHiddenStatus
      }
    });
  } catch (error) {
    console.error('Toggle test case visibility error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to toggle test case visibility. Please try again.'
    });
  }
});

/**
 * @route   GET /api/questions/test-connection
 * @desc    Test database connection and basic functionality
 * @access  Private (Admin only)
 */
router.get('/test-connection', authenticate, isAdmin, async (req, res) => {
  try {
    console.log('Testing database connection...');
    
    // Test basic query
    const [result] = await req.db.execute('SELECT 1 as test');
    console.log('Database test result:', result);
    
    // Test questions table access
    const [questions] = await req.db.execute('SELECT COUNT(*) as count FROM questions');
    console.log('Questions count:', questions[0].count);
    
    // Test test_cases table access
    const [testCases] = await req.db.execute('SELECT COUNT(*) as count FROM test_cases');
    console.log('Test cases count:', testCases[0].count);
    
    res.status(200).json({
      status: 'success',
      data: {
        message: 'Database connection working',
        questionsCount: questions[0].count,
        testCasesCount: testCases[0].count
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/questions/test-update
 * @desc    Test question update with minimal data
 * @access  Private (Admin only)
 */
router.post('/test-update', authenticate, isAdmin, async (req, res) => {
  try {
    console.log('=== TESTING QUESTION UPDATE ===');
    console.log('Request body:', req.body);
    
    const { questionId, title, description, difficulty } = req.body;
    
    if (!questionId || !title || !description || !difficulty) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields for test'
      });
    }
    
    // Test if question exists
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
    
    console.log('Found question:', questions[0]);
    
    // Test simple update
    const updateResult = await req.db.execute(
      'UPDATE questions SET title = ?, description = ?, difficulty = ? WHERE id = ?',
      [title, description, difficulty, questionId]
    );
    
    console.log('Update result:', updateResult);
    
    res.status(200).json({
      status: 'success',
      data: {
        message: 'Test update successful',
        affectedRows: updateResult.affectedRows
      }
    });
  } catch (error) {
    console.error('Test update error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: error.stack
    });
  }
});

/**
 * @route   POST /api/questions/:id/debug-test-cases
 * @desc    Debug endpoint to test test cases operations
 * @access  Private (Admin only)
 */
router.post('/:id/debug-test-cases', authenticate, isAdmin, async (req, res) => {
  try {
    const questionId = req.params.id;
    const { testCases } = req.body;
    
    console.log('=== DEBUG TEST CASES OPERATION ===');
    console.log('Question ID:', questionId);
    console.log('Test cases received:', testCases);
    
    // Check current test cases
    const [currentTestCases] = await req.db.execute(
      'SELECT * FROM test_cases WHERE question_id = ?',
      [questionId]
    );
    console.log('Current test cases in DB:', currentTestCases);
    
    // Delete existing test cases
    const deleteResult = await req.db.execute(
      'DELETE FROM test_cases WHERE question_id = ?',
      [questionId]
    );
    console.log('Delete result:', deleteResult);
    
    // Insert new test cases
    if (testCases && Array.isArray(testCases)) {
      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        console.log(`Inserting test case ${i + 1}:`, testCase);
        
        const insertResult = await req.db.execute(
          'INSERT INTO test_cases (question_id, input, expected_output, hidden) VALUES (?, ?, ?, ?)',
          [questionId, testCase.input, testCase.expected_output, Boolean(testCase.hidden)]
        );
        console.log(`Insert result for test case ${i + 1}:`, insertResult);
      }
    }
    
    // Verify final state
    const [finalTestCases] = await req.db.execute(
      'SELECT * FROM test_cases WHERE question_id = ?',
      [questionId]
    );
    console.log('Final test cases in DB:', finalTestCases);
    
    res.status(200).json({
      status: 'success',
      data: {
        message: 'Debug operation completed',
        originalCount: currentTestCases.length,
        newCount: finalTestCases.length,
        testCases: finalTestCases
      }
    });
  } catch (error) {
    console.error('Debug test cases error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;