const express = require('express');
const db = require('../db');

const router = express.Router();

// POST /enrollments
router.post('/', async (req, res) => {
  const { user_id, course_id } = req.body;

  if (!user_id || !Number.isInteger(Number(user_id))) {
    return res.status(400).json({ error: 'user_id is required and must be an integer' });
  }
  if (!course_id || !Number.isInteger(Number(course_id))) {
    return res.status(400).json({ error: 'course_id is required and must be an integer' });
  }

  try {
    const user = await db('users').where({ id: user_id }).first();
    if (!user) return res.status(400).json({ error: 'user_id does not reference an existing user' });

    const course = await db('courses').where({ id: course_id }).first();
    if (!course) return res.status(400).json({ error: 'course_id does not reference an existing course' });

    const [enrollment] = await db('enrollments')
      .insert({ user_id, course_id })
      .returning('*');
    res.status(201).json(enrollment);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'User is already enrolled in this course' });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /enrollments/:userId
router.get('/:userId', async (req, res) => {
  try {
    const user = await db('users').where({ id: req.params.userId }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const enrollments = await db('enrollments')
      .join('courses', 'enrollments.course_id', 'courses.id')
      .where('enrollments.user_id', req.params.userId)
      .select(
        'enrollments.id',
        'enrollments.user_id',
        'enrollments.enrolled_at',
        'courses.id as course_id',
        'courses.title as course_title',
        'courses.description as course_description',
        'courses.instructor_id',
        'courses.created_at as course_created_at'
      )
      .orderBy('enrollments.enrolled_at', 'desc');

    res.json(enrollments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
