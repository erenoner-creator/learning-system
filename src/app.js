const express = require('express');

const usersRouter = require('./routes/users');
const coursesRouter = require('./routes/courses');
const topicsRouter = require('./routes/topics');
const cardsRouter = require('./routes/cards');
const enrollmentsRouter = require('./routes/enrollments');
const quizSessionsRouter = require('./routes/quizSessions');
const studyLogsRouter = require('./routes/studyLogs');

const app = express();

app.use(express.json());

app.use('/users', usersRouter);
app.use('/courses', coursesRouter);
app.use('/topics', topicsRouter);
app.use('/cards', cardsRouter);
app.use('/enrollments', enrollmentsRouter);
app.use('/quiz-sessions', quizSessionsRouter);
app.use('/study-logs', studyLogsRouter);

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LMS API listening on port ${PORT}`);
});

module.exports = app;
