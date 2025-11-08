const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');

router.get('/:questionId', authenticate, async (req, res) => {
  try {
    const questionId = parseInt(req.params.questionId, 10);
    const language = (req.query.language || 'javascript').toLowerCase();

    if (!Number.isInteger(questionId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid question id'
      });
    }

    const [draftRows] = await req.db.execute(
      'SELECT code FROM code_drafts WHERE user_id = ? AND question_id = ? AND language = ? LIMIT 1',
      [req.user.id, questionId, language]
    );

    const draft = draftRows.length > 0 ? draftRows[0] : null;

    res.status(200).json({
      status: 'success',
      data: {
        code: draft ? draft.code : null
      }
    });
  } catch (error) {
    console.error('Get code draft error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch code draft'
    });
  }
});

router.post('/:questionId', authenticate, async (req, res) => {
  try {
    const questionId = parseInt(req.params.questionId, 10);
    const { language, code } = req.body;

    if (!Number.isInteger(questionId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid question id'
      });
    }

    if (!language || typeof language !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'Language is required'
      });
    }

    await req.db.execute(
      `INSERT INTO code_drafts (user_id, question_id, language, code)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE code = VALUES(code), updated_at = CURRENT_TIMESTAMP`,
      [req.user.id, questionId, language.toLowerCase(), code ?? '']
    );

    res.status(200).json({
      status: 'success',
      message: 'Draft saved successfully'
    });
  } catch (error) {
    console.error('Save code draft error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to save code draft'
    });
  }
});

module.exports = router;
