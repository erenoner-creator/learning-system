const express = require('express');
const db = require('../db');

const router = express.Router();

// POST /quiz-sessions — start a quiz session
router.post('/', async (req, res) => {
  const { user_id, topic_id } = req.body;

  if (!user_id || !Number.isInteger(Number(user_id))) {
    return res.status(400).json({ error: 'user_id is required and must be an integer' });
  }
  if (!topic_id || !Number.isInteger(Number(topic_id))) {
    return res.status(400).json({ error: 'topic_id is required and must be an integer' });
  }

  try {
    const user = await db('users').where({ id: user_id }).first();
    if (!user) return res.status(400).json({ error: 'user_id does not reference an existing user' });

    const topic = await db('topics').where({ id: topic_id }).first();
    if (!topic) return res.status(400).json({ error: 'topic_id does not reference an existing topic' });

    const [session] = await db('quiz_sessions')
      .insert({ user_id, topic_id })
      .returning('*');
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /quiz-sessions/:id/complete — mark session as completed
router.patch('/:id/complete', async (req, res) => {
  try {
    const session = await db('quiz_sessions').where({ id: req.params.id }).first();
    if (!session) return res.status(404).json({ error: 'Quiz session not found' });
    if (session.completed_at) {
      return res.status(409).json({ error: 'Quiz session is already completed' });
    }

    const [updated] = await db('quiz_sessions')
      .where({ id: req.params.id })
      .update({ completed_at: db.fn.now() })
      .returning('*');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /quiz-sessions/:sessionId/reviews — submit a card review
router.post('/:sessionId/reviews', async (req, res) => {
  const { card_id, user_id, was_correct } = req.body;

  if (!card_id || !Number.isInteger(Number(card_id))) {
    return res.status(400).json({ error: 'card_id is required and must be an integer' });
  }
  if (!user_id || !Number.isInteger(Number(user_id))) {
    return res.status(400).json({ error: 'user_id is required and must be an integer' });
  }
  if (typeof was_correct !== 'boolean') {
    return res.status(400).json({ error: 'was_correct is required and must be a boolean' });
  }

  try {
    const session = await db('quiz_sessions').where({ id: req.params.sessionId }).first();
    if (!session) return res.status(404).json({ error: 'Quiz session not found' });

    const card = await db('cards').where({ id: card_id }).first();
    if (!card) return res.status(400).json({ error: 'card_id does not reference an existing card' });

    if (card.topic_id !== session.topic_id) {
      return res.status(400).json({ error: 'card does not belong to the topic of this quiz session' });
    }

    const user = await db('users').where({ id: user_id }).first();
    if (!user) return res.status(400).json({ error: 'user_id does not reference an existing user' });

    const [review] = await db('card_reviews')
      .insert({ card_id, quiz_session_id: req.params.sessionId, user_id, was_correct })
      .returning('*');
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /quiz-sessions/:sessionId/reviews — get all reviews for a session
router.get('/:sessionId/reviews', async (req, res) => {
  try {
    const session = await db('quiz_sessions').where({ id: req.params.sessionId }).first();
    if (!session) return res.status(404).json({ error: 'Quiz session not found' });

    const reviews = await db('card_reviews')
      .where({ quiz_session_id: req.params.sessionId })
      .select('*')
      .orderBy('reviewed_at');
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
