const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /cards?topic_id=
router.get('/', async (req, res) => {
  try {
    const query = db('cards').select('*').orderBy('id');
    if (req.query.topic_id) {
      query.where({ topic_id: req.query.topic_id });
    }
    const cards = await query;
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /cards/:id
router.get('/:id', async (req, res) => {
  try {
    const card = await db('cards').where({ id: req.params.id }).first();
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /cards
router.post('/', async (req, res) => {
  const { topic_id, front, back } = req.body;

  if (!topic_id || !Number.isInteger(Number(topic_id))) {
    return res.status(400).json({ error: 'topic_id is required and must be an integer' });
  }
  if (!front || typeof front !== 'string' || front.trim() === '') {
    return res.status(400).json({ error: 'front is required' });
  }
  if (!back || typeof back !== 'string' || back.trim() === '') {
    return res.status(400).json({ error: 'back is required' });
  }

  try {
    const topic = await db('topics').where({ id: topic_id }).first();
    if (!topic) return res.status(400).json({ error: 'topic_id does not reference an existing topic' });

    const [card] = await db('cards')
      .insert({ topic_id, front: front.trim(), back: back.trim() })
      .returning('*');
    res.status(201).json(card);
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'topic_id does not reference an existing topic' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /cards/:id
router.put('/:id', async (req, res) => {
  const { topic_id, front, back } = req.body;

  if (!topic_id || !Number.isInteger(Number(topic_id))) {
    return res.status(400).json({ error: 'topic_id is required and must be an integer' });
  }
  if (!front || typeof front !== 'string' || front.trim() === '') {
    return res.status(400).json({ error: 'front is required' });
  }
  if (!back || typeof back !== 'string' || back.trim() === '') {
    return res.status(400).json({ error: 'back is required' });
  }

  try {
    const topic = await db('topics').where({ id: topic_id }).first();
    if (!topic) return res.status(400).json({ error: 'topic_id does not reference an existing topic' });

    const [card] = await db('cards')
      .where({ id: req.params.id })
      .update({ topic_id, front: front.trim(), back: back.trim() })
      .returning('*');
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /cards/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await db('cards').where({ id: req.params.id }).del();
    if (!deleted) return res.status(404).json({ error: 'Card not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
