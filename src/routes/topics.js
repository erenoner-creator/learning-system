const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /topics?course_id=
router.get('/', async (req, res) => {
  try {
    const query = db('topics').select('*').orderBy('order_index');
    if (req.query.course_id) {
      query.where({ course_id: req.query.course_id });
    }
    const topics = await query;
    res.json(topics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /topics/:id
router.get('/:id', async (req, res) => {
  try {
    const topic = await db('topics').where({ id: req.params.id }).first();
    if (!topic) return res.status(404).json({ error: 'Topic not found' });
    res.json(topic);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /topics
router.post('/', async (req, res) => {
  const { course_id, title, order_index } = req.body;

  if (!course_id || !Number.isInteger(Number(course_id))) {
    return res.status(400).json({ error: 'course_id is required and must be an integer' });
  }
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'title is required' });
  }
  if (order_index === undefined || order_index === null || !Number.isInteger(Number(order_index))) {
    return res.status(400).json({ error: 'order_index is required and must be an integer' });
  }

  try {
    const course = await db('courses').where({ id: course_id }).first();
    if (!course) return res.status(400).json({ error: 'course_id does not reference an existing course' });

    const [topic] = await db('topics')
      .insert({ course_id, title: title.trim(), order_index })
      .returning('*');
    res.status(201).json(topic);
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'course_id does not reference an existing course' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /topics/:id
router.put('/:id', async (req, res) => {
  const { course_id, title, order_index } = req.body;

  if (!course_id || !Number.isInteger(Number(course_id))) {
    return res.status(400).json({ error: 'course_id is required and must be an integer' });
  }
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'title is required' });
  }
  if (order_index === undefined || order_index === null || !Number.isInteger(Number(order_index))) {
    return res.status(400).json({ error: 'order_index is required and must be an integer' });
  }

  try {
    const course = await db('courses').where({ id: course_id }).first();
    if (!course) return res.status(400).json({ error: 'course_id does not reference an existing course' });

    const [topic] = await db('topics')
      .where({ id: req.params.id })
      .update({ course_id, title: title.trim(), order_index })
      .returning('*');
    if (!topic) return res.status(404).json({ error: 'Topic not found' });
    res.json(topic);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /topics/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await db('topics').where({ id: req.params.id }).del();
    if (!deleted) return res.status(404).json({ error: 'Topic not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
