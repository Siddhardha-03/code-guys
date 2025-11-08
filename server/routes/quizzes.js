const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middlewares/auth');

/**
 * @route   GET /api/quizzes
 * @desc    Get all quizzes (with pagination)
 * @access  Public (with optional authentication for progress data)
 */
router.get('/', (req, res, next) => {
  // Try to authenticate, but don't fail if no token
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    const jwt = require('jsonwebtoken');
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      // Invalid token, but continue without user data
      req.user = null;
    }
  }
  next();
}, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const category = req.query.category;
    const search = (req.query.search || '').trim();
    
    let query = `
      SELECT q.id, q.title, q.description, q.category, q.scheduled_time, 
             COALESCE(q.duration, 60) AS duration,
             (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS questionCount,
             COALESCE(uqp.status, 'not_started') AS userStatus,
             COALESCE(uqp.score, 0) AS currentScore,
             COALESCE(uqp.best_score, 0) AS bestScore,
             COALESCE(uqp.attempts_count, 0) AS attemptsCount
      FROM quizzes q
      LEFT JOIN user_quiz_progress uqp ON q.id = uqp.quiz_id AND uqp.user_id = ?
      WHERE 1=1
    `;
    
    const queryParams = [req.user?.id || null];
    
    // Add filters if provided
    if (category) {
      query += ` AND q.category = ?`;
      queryParams.push(category);
    }
    if (search) {
      query += ` AND (q.title LIKE ? OR q.description LIKE ?)`;
      const likeTerm = `%${search}%`;
      queryParams.push(likeTerm, likeTerm);
    }
    
    // Add pagination
    query += ` ORDER BY q.scheduled_time DESC LIMIT ${limit} OFFSET ${offset}`;
    
    // Execute query with error handling
    let quizzes;
    try {
      [quizzes] = await req.db.execute(query, queryParams);
    } catch (error) {
      console.log('Error with progress query, falling back to simple query:', error.message);
      // Fallback query without user progress
      const fallbackQuery = `
        SELECT q.id, q.title, q.description, q.category, q.scheduled_time, 
               COALESCE(q.duration, 60) AS duration,
               (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS questionCount,
               'not_started' AS userStatus,
               0 AS currentScore,
               0 AS bestScore,
               0 AS attemptsCount
        FROM quizzes q
        WHERE 1=1
        ${category ? 'AND q.category = ?' : ''}
        ${search ? 'AND (q.title LIKE ? OR q.description LIKE ?)' : ''}
        ORDER BY q.scheduled_time DESC LIMIT ${limit} OFFSET ${offset}
      `;
      const fallbackParams = [];
      if (category) fallbackParams.push(category);
      if (search) {
        const likeTerm = `%${search}%`;
        fallbackParams.push(likeTerm, likeTerm);
      }
      [quizzes] = await req.db.execute(fallbackQuery, fallbackParams);
    }
    
    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM quizzes WHERE 1=1`;
    const countParams = [];
    
    if (category) {
      countQuery += ` AND category = ?`;
      countParams.push(category);
    }
    if (search) {
      countQuery += ` AND (title LIKE ? OR description LIKE ?)`;
      const likeTerm = `%${search}%`;
      countParams.push(likeTerm, likeTerm);
    }
    
    const [countResult] = await req.db.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    res.status(200).json({
      status: 'success',
      data: {
        quizzes,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get quizzes error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch quizzes. Please try again.'
    });
  }
});

/**
 * @route   GET /api/quizzes/:id
 * @desc    Get a single quiz with questions
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const quizId = req.params.id;
    
    // Get quiz details
    const [quizzes] = await req.db.execute(
      'SELECT * FROM quizzes WHERE id = ?',
      [quizId]
    );
    
    if (quizzes.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Quiz not found'
      });
    }
    
    const quiz = quizzes[0];
    
    // Get quiz questions
    const [questions] = await req.db.execute(
      'SELECT id, question, options, difficulty FROM quiz_questions WHERE quiz_id = ?',
      [quizId]
    );
    
    // Parse JSON fields
    questions.forEach(question => {
      if (question.options && typeof question.options === 'string') {
        try {
          const parsed = JSON.parse(question.options);
          question.options = parsed.options || [];
        } catch (e) {
          question.options = [];
        }
      } else if (question.options && typeof question.options === 'object') {
        question.options = question.options.options || [];
      } else {
        question.options = [];
      }
    });
    
    // Check if user has already taken this quiz
    const [submissions] = await req.db.execute(
      'SELECT * FROM quiz_submissions WHERE user_id = ? AND quiz_id = ?',
      [req.user.id, quizId]
    );
    
    const hasSubmitted = submissions.length > 0;
    let userSubmission = null;
    
    if (hasSubmitted) {
      userSubmission = submissions[0];
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        quiz,
        questions,
        hasSubmitted,
        userSubmission
      }
    });
  } catch (error) {
    console.error('Get quiz error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch quiz. Please try again.'
    });
  }
});

/**
 * @route   POST /api/quizzes
 * @desc    Create a new quiz
 * @access  Private (Admin only)
 */
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const { title, description, category, scheduled_time, duration, questions } = req.body;
    
    // Validate input
    if (!title || !description || !category || !scheduled_time || !questions) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide all required fields'
      });
    }
    
    const parseScheduledTime = (value) => {
      if (!value) return null;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      const pad = (num) => String(num).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };

    const formattedScheduledTime = parseScheduledTime(scheduled_time) || parseScheduledTime(new Date());

    // Start a transaction
    const connection = await req.db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Insert quiz
      const [quizResult] = await connection.execute(
        'INSERT INTO quizzes (title, description, category, scheduled_time, duration, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [title, description, category, formattedScheduledTime, duration || 60, req.user.id]
      );
      
      const quizId = quizResult.insertId;
      
      // Insert quiz questions
      for (const question of questions) {
        const optionArray = Array.isArray(question.options)
          ? question.options
          : Array.isArray(question.options?.options)
            ? question.options.options
            : [];

        await connection.execute(
          'INSERT INTO quiz_questions (quiz_id, question, options, correct_option, difficulty) VALUES (?, ?, ?, ?, ?)',
          [
            quizId,
            question.question,
            JSON.stringify({ options: optionArray }),
            Number(question.correct_option) || 0,
            question.difficulty || 'Medium'
          ]
        );
      }
      
      // Commit transaction
      await connection.commit();
      
      res.status(201).json({
        status: 'success',
        message: 'Quiz created successfully',
        data: {
          quizId
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
    console.error('Create quiz error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create quiz. Please try again.'
    });
  }
});

/**
 * @route   PUT /api/quizzes/:id
 * @desc    Update a quiz
 * @access  Private (Admin only)
 */
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const quizId = req.params.id;
    const { title, description, category, scheduled_time, duration, questions } = req.body;

    const parseScheduledTime = (value) => {
      if (!value) return null;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      const pad = (num) => String(num).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };

    const [quizzes] = await req.db.execute(
      'SELECT * FROM quizzes WHERE id = ?',
      [quizId]
    );

    if (quizzes.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Quiz not found'
      });
    }

    const existingQuiz = quizzes[0];

    const updatedTitle = typeof title === 'string' ? title.trim() : existingQuiz.title;
    const updatedDescription = typeof description === 'string' ? description.trim() : existingQuiz.description;
    const updatedCategory = typeof category === 'string' ? category.trim() : existingQuiz.category;
    const formattedScheduledTime = parseScheduledTime(scheduled_time) || existingQuiz.scheduled_time;
    const numericDuration = Number(duration);
    const updatedDuration = Number.isFinite(numericDuration) && numericDuration > 0 ? numericDuration : (existingQuiz.duration || 60);

    const connection = await req.db.getConnection();
    await connection.beginTransaction();

    try {
      await connection.execute(
        'UPDATE quizzes SET title = ?, description = ?, category = ?, scheduled_time = ?, duration = ? WHERE id = ?',
        [updatedTitle, updatedDescription, updatedCategory, formattedScheduledTime, updatedDuration, quizId]
      );

      if (Array.isArray(questions)) {
        await connection.execute('DELETE FROM quiz_questions WHERE quiz_id = ?', [quizId]);

        for (const question of questions) {
          const optionArray = Array.isArray(question?.options)
            ? question.options
            : Array.isArray(question?.options?.options)
              ? question.options.options
              : [];

          const questionText = typeof question?.question === 'string' ? question.question.trim() : '';
          const correctOption = Number(question?.correct_option);
          const normalizedCorrectOption = Number.isInteger(correctOption) ? correctOption : 0;
          const difficulty = question?.difficulty || 'Medium';

          await connection.execute(
            'INSERT INTO quiz_questions (quiz_id, question, options, correct_option, difficulty) VALUES (?, ?, ?, ?, ?)',
            [
              quizId,
              questionText,
              JSON.stringify({ options: optionArray.map((option) => option ?? '') }),
              normalizedCorrectOption,
              difficulty
            ]
          );
        }
      }

      await connection.commit();

      res.status(200).json({
        status: 'success',
        message: 'Quiz updated successfully'
      });
    } catch (transactionError) {
      await connection.rollback();
      throw transactionError;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Update quiz error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update quiz. Please try again.'
    });
  }
});

/**
 * @route   DELETE /api/quizzes/:id
 * @desc    Delete a quiz
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const quizId = req.params.id;
    
    // Check if quiz exists
    const [quizzes] = await req.db.execute(
      'SELECT * FROM quizzes WHERE id = ?',
      [quizId]
    );
    
    if (quizzes.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Quiz not found'
      });
    }
    
    // Start a transaction
    const connection = await req.db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Delete quiz questions first (due to foreign key constraint)
      await connection.execute(
        'DELETE FROM quiz_questions WHERE quiz_id = ?',
        [quizId]
      );
      
      // Delete quiz submissions
      await connection.execute(
        'DELETE FROM quiz_submissions WHERE quiz_id = ?',
        [quizId]
      );
      
      // Delete quiz
      await connection.execute(
        'DELETE FROM quizzes WHERE id = ?',
        [quizId]
      );
      
      // Commit transaction
      await connection.commit();
      
      res.status(200).json({
        status: 'success',
        message: 'Quiz deleted successfully'
      });
    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Delete quiz error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete quiz. Please try again.'
    });
  }
});

/**
 * @route   POST /api/quizzes/:id/questions
 * @desc    Add questions to a quiz
 * @access  Private (Admin only)
 */
router.post('/:id/questions', authenticate, isAdmin, async (req, res) => {
  try {
    const quizId = req.params.id;
    const { questions } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide valid questions'
      });
    }
    
    // Check if quiz exists
    const [quizzes] = await req.db.execute(
      'SELECT * FROM quizzes WHERE id = ?',
      [quizId]
    );
    
    if (quizzes.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Quiz not found'
      });
    }
    
    // Insert questions
    for (const question of questions) {
      const optionArray = Array.isArray(question.options)
        ? question.options
        : Array.isArray(question.options?.options)
          ? question.options.options
          : [];

      await req.db.execute(
        'INSERT INTO quiz_questions (quiz_id, question, options, correct_option, difficulty) VALUES (?, ?, ?, ?, ?)',
        [
          quizId,
          question.question,
          JSON.stringify({ options: optionArray }),
          Number(question.correct_option) || 0,
          question.difficulty || 'Medium'
        ]
      );
    }
    
    res.status(201).json({
      status: 'success',
      message: 'Questions added successfully'
    });
  } catch (error) {
    console.error('Add questions error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add questions. Please try again.'
    });
  }
});

/**
 * @route   POST /api/quizzes/:id/submit
 * @desc    Submit quiz answers
 * @access  Private
 */
router.post('/:id/submit', authenticate, async (req, res) => {
  try {
    const quizId = req.params.id;
    const { answers } = req.body;
    
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide valid answers'
      });
    }
    
    // Check if quiz exists
    const [quizzes] = await req.db.execute(
      'SELECT * FROM quizzes WHERE id = ?',
      [quizId]
    );
    
    if (quizzes.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Quiz not found'
      });
    }
    
    // Get all questions for the quiz
    const [questions] = await req.db.execute(
      'SELECT * FROM quiz_questions WHERE quiz_id = ?',
      [quizId]
    );

    if (!questions || questions.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Quiz has no questions configured.'
      });
    }

    let score = 0;
    const questionResults = [];

    for (const question of questions) {
      let options = [];
      if (question.options && typeof question.options === 'string') {
        try {
          const parsed = JSON.parse(question.options);
          options = parsed.options || [];
        } catch (e) {
          options = [];
        }
      } else if (question.options && typeof question.options === 'object') {
        options = question.options.options || [];
      }

      const answerKey = Object.prototype.hasOwnProperty.call(answers, question.id)
        ? question.id
        : Object.prototype.hasOwnProperty.call(answers, String(question.id))
          ? String(question.id)
          : null;

      const userAnswerIndex = answerKey !== null ? Number(answers[answerKey]) : undefined;
      const isCorrect = userAnswerIndex !== undefined && userAnswerIndex === Number(question.correct_option);

      if (isCorrect) {
        score += 1;
      }

      questionResults.push({
        question: question.question,
        options,
        userAnswerIndex: Number.isInteger(userAnswerIndex) ? userAnswerIndex : null,
        correctAnswerIndex: Number(question.correct_option),
        userAnswer: userAnswerIndex !== undefined && options[userAnswerIndex] !== undefined ? options[userAnswerIndex] : 'No answer',
        correctAnswer: options[Number(question.correct_option)] ?? 'Unknown',
        isCorrect
      });
    }

    const totalQuestions = questions.length;
    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    // Save submission
    await req.db.execute(
      'INSERT INTO quiz_submissions (user_id, quiz_id, score, answers) VALUES (?, ?, ?, ?)',
      [req.user.id, quizId, score, JSON.stringify(answers)]
    );

    // Update or insert user quiz progress
    await req.db.execute(
      `INSERT INTO user_quiz_progress 
       (user_id, quiz_id, status, score, total_questions, attempts_count, best_score) 
       VALUES (?, ?, 'completed', ?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE
       status = 'completed',
       score = ?,
       total_questions = ?,
       attempts_count = attempts_count + 1,
       best_score = GREATEST(best_score, ?)` ,
      [req.user.id, quizId, score, totalQuestions, score,
       score, totalQuestions, score]
    );

    res.status(201).json({
      status: 'success',
      message: 'Quiz submitted successfully',
      data: {
        score: percentage,
        correctAnswers: score,
        totalQuestions,
        questionResults
      }
    });
  } catch (error) {
    console.error('Submit quiz error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit quiz. Please try again.'
    });
  }
});

/**
 * @route   GET /api/quizzes/submissions/user
 * @desc    Get user's quiz submissions
 * @access  Private
 */
router.get('/submissions/user', authenticate, async (req, res) => {
  try {
    // Get user's quiz submissions
    const [submissions] = await req.db.execute(
      `SELECT qs.id, qs.quiz_id, q.title, qs.score, qs.submitted_at,
       (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) as total_questions
       FROM quiz_submissions qs
       JOIN quizzes q ON qs.quiz_id = q.id
       WHERE qs.user_id = ?
       ORDER BY qs.submitted_at DESC`,
      [req.user.id]
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        submissions
      }
    });
  } catch (error) {
    console.error('Get quiz submissions error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch quiz submissions. Please try again.'
    });
  }
});

/**
 * @route   GET /api/quizzes/:id/results
 * @desc    Get quiz results (for admin)
 * @access  Private (Admin only)
 */
router.get('/:id/results', authenticate, isAdmin, async (req, res) => {
  try {
    const quizId = req.params.id;
    
    // Get quiz details
    const [quizzes] = await req.db.execute(
      'SELECT * FROM quizzes WHERE id = ?',
      [quizId]
    );
    
    if (quizzes.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Quiz not found'
      });
    }
    
    // Get quiz submissions with user details
    const [submissions] = await req.db.execute(
      `SELECT qs.id, qs.user_id, u.name as user_name, qs.score, qs.submitted_at,
       (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = ?) as total_questions
       FROM quiz_submissions qs
       JOIN users u ON qs.user_id = u.id
       WHERE qs.quiz_id = ?
       ORDER BY qs.score DESC, qs.submitted_at ASC`,
      [quizId, quizId]
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        quiz: quizzes[0],
        submissions
      }
    });
  } catch (error) {
    console.error('Get quiz results error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch quiz results. Please try again.'
    });
  }
});

/**
 * @route   GET /api/quizzes/stats/user
 * @desc    Get user quiz statistics
 * @access  Private
 */
router.get('/stats/user', authenticate, async (req, res) => {
  try {
    // Get total quizzes taken
    const [totalResult] = await req.db.execute(
      'SELECT COUNT(*) as total FROM quiz_submissions WHERE user_id = ?',
      [req.user.id]
    );
    
    // Get average score
    const [avgResult] = await req.db.execute(
      `SELECT AVG(qs.score / (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = qs.quiz_id) * 100) as average_score
       FROM quiz_submissions qs
       WHERE qs.user_id = ?`,
      [req.user.id]
    );
    
    // Get category breakdown
    const [categoryResult] = await req.db.execute(
      `SELECT q.category, COUNT(*) as count, AVG(qs.score / (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = qs.quiz_id) * 100) as average_score
       FROM quiz_submissions qs
       JOIN quizzes q ON qs.quiz_id = q.id
       WHERE qs.user_id = ?
       GROUP BY q.category`,
      [req.user.id]
    );
    
    // Get recent quiz submissions
    const [recentSubmissions] = await req.db.execute(
      `SELECT qs.id, qs.quiz_id, q.title, qs.score, qs.submitted_at,
       (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) as total_questions
       FROM quiz_submissions qs
       JOIN quizzes q ON qs.quiz_id = q.id
       WHERE qs.user_id = ?
       ORDER BY qs.submitted_at DESC
       LIMIT 5`,
      [req.user.id]
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        total: totalResult[0].total,
        averageScore: avgResult[0].average_score || 0,
        byCategory: categoryResult,
        recentSubmissions
      }
    });
  } catch (error) {
    console.error('Get user quiz stats error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch statistics. Please try again.'
    });
  }
});

module.exports = router;