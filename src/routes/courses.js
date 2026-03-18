const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /courses
router.get('/', async (req, res) => {
  try {
    const courses = await db('courses').select('*').orderBy('id');
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /courses/:id
router.get('/:id', async (req, res) => {
  try {
    const course = await db('courses').where({ id: req.params.id }).first();
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /courses
router.post('/', async (req, res) => {
  const { title, description, instructor_id } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'title is required' });
  }
  if (!instructor_id || !Number.isInteger(Number(instructor_id))) {
    return res.status(400).json({ error: 'instructor_id is required and must be an integer' });
  }

  try {
    const instructor = await db('users').where({ id: instructor_id, role: 'instructor' }).first();
    if (!instructor) {
      return res.status(400).json({ error: 'instructor_id must reference a user with role "instructor"' });
    }

    const [course] = await db('courses')
      .insert({ title: title.trim(), description: description || null, instructor_id })
      .returning('*');
    res.status(201).json(course);
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'instructor_id does not reference an existing user' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /courses/:id
router.put('/:id', async (req, res) => {
  const { title, description, instructor_id } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'title is required' });
  }
  if (!instructor_id || !Number.isInteger(Number(instructor_id))) {
    return res.status(400).json({ error: 'instructor_id is required and must be an integer' });
  }

  try {
    const instructor = await db('users').where({ id: instructor_id, role: 'instructor' }).first();
    if (!instructor) {
      return res.status(400).json({ error: 'instructor_id must reference a user with role "instructor"' });
    }

    const [course] = await db('courses')
      .where({ id: req.params.id })
      .update({ title: title.trim(), description: description || null, instructor_id })
      .returning('*');
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /courses/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await db('courses').where({ id: req.params.id }).del();
    if (!deleted) return res.status(404).json({ error: 'Course not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
