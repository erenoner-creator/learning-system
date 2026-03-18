const express = require('express');
const db = require('../db');

const router = express.Router();

// POST /study-logs
router.post('/', async (req, res) => {
  const { user_id, topic_id, duration_minutes } = req.body;

  if (!user_id || !Number.isInteger(Number(user_id))) {
    return res.status(400).json({ error: 'user_id is required and must be an integer' });
  }
  if (!topic_id || !Number.isInteger(Number(topic_id))) {
    return res.status(400).json({ error: 'topic_id is required and must be an integer' });
  }
  if (
    duration_minutes === undefined ||
    duration_minutes === null ||
    !Number.isInteger(Number(duration_minutes)) ||
    Number(duration_minutes) <= 0
  ) {
    return res.status(400).json({ error: 'duration_minutes is required and must be a positive integer' });
  }

  try {
    const user = await db('users').where({ id: user_id }).first();
    if (!user) return res.status(400).json({ error: 'user_id does not reference an existing user' });

    const topic = await db('topics').where({ id: topic_id }).first();
    if (!topic) return res.status(400).json({ error: 'topic_id does not reference an existing topic' });

    const [log] = await db('study_logs')
      .insert({ user_id, topic_id, duration_minutes })
      .returning('*');
    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /study-logs/:userId
router.get('/:userId', async (req, res) => {
  try {
    const user = await db('users').where({ id: req.params.userId }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const logs = await db('study_logs')
      .join('topics', 'study_logs.topic_id', 'topics.id')
      .where('study_logs.user_id', req.params.userId)
      .select(
        'study_logs.id',
        'study_logs.user_id',
        'study_logs.topic_id',
        'study_logs.duration_minutes',
        'study_logs.logged_at',
        'topics.title as topic_title',
        'topics.course_id'
      )
      .orderBy('study_logs.logged_at', 'desc');

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
