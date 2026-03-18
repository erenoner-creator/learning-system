const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /users
router.get('/', async (req, res) => {
  try {
    const users = await db('users').select('*').orderBy('id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /users/:id
router.get('/:id', async (req, res) => {
  try {
    const user = await db('users').where({ id: req.params.id }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /users
router.post('/', async (req, res) => {
  const { name, email, role } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'name is required' });
  }
  if (!email || typeof email !== 'string' || email.trim() === '') {
    return res.status(400).json({ error: 'email is required' });
  }
  if (!role || !['student', 'instructor'].includes(role)) {
    return res.status(400).json({ error: 'role must be "student" or "instructor"' });
  }

  try {
    const [user] = await db('users')
      .insert({ name: name.trim(), email: email.trim(), role })
      .returning('*');
    res.status(201).json(user);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /users/:id
router.put('/:id', async (req, res) => {
  const { name, email, role } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'name is required' });
  }
  if (!email || typeof email !== 'string' || email.trim() === '') {
    return res.status(400).json({ error: 'email is required' });
  }
  if (!role || !['student', 'instructor'].includes(role)) {
    return res.status(400).json({ error: 'role must be "student" or "instructor"' });
  }

  try {
    const [user] = await db('users')
      .where({ id: req.params.id })
      .update({ name: name.trim(), email: email.trim(), role })
      .returning('*');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /users/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await db('users').where({ id: req.params.id }).del();
    if (!deleted) return res.status(404).json({ error: 'User not found' });
    res.status(204).send();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ error: 'Cannot delete user: referenced by existing records' });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
