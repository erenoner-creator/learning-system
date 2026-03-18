exports.seed = async function (knex) {
  // Clear all tables in reverse dependency order
  await knex('study_logs').del();
  await knex('card_reviews').del();
  await knex('quiz_sessions').del();
  await knex('enrollments').del();
  await knex('cards').del();
  await knex('topics').del();
  await knex('courses').del();
  await knex('users').del();

  // Users
  const [instructor1, instructor2, student1, student2] = await knex('users')
    .insert([
      { name: 'Alice Instructor', email: 'alice@example.com', role: 'instructor' },
      { name: 'Bob Instructor', email: 'bob@example.com', role: 'instructor' },
      { name: 'Carol Student', email: 'carol@example.com', role: 'student' },
      { name: 'Dave Student', email: 'dave@example.com', role: 'student' },
    ])
    .returning('*');

  // Courses
  const [course1, course2] = await knex('courses')
    .insert([
      {
        title: 'Introduction to JavaScript',
        description: 'Learn the fundamentals of JavaScript programming.',
        instructor_id: instructor1.id,
      },
      {
        title: 'Python for Beginners',
        description: 'A beginner-friendly introduction to Python.',
        instructor_id: instructor2.id,
      },
    ])
    .returning('*');

  // Topics for course 1
  const [topic1, topic2, topic3] = await knex('topics')
    .insert([
      { course_id: course1.id, title: 'Variables and Data Types', order_index: 1 },
      { course_id: course1.id, title: 'Functions and Scope', order_index: 2 },
      { course_id: course1.id, title: 'Arrays and Objects', order_index: 3 },
    ])
    .returning('*');

  // Topics for course 2
  await knex('topics').insert([
    { course_id: course2.id, title: 'Python Basics', order_index: 1 },
    { course_id: course2.id, title: 'Control Flow', order_index: 2 },
  ]);

  // Cards for topic1 (5 cards)
  await knex('cards').insert([
    { topic_id: topic1.id, front: 'What is a variable?', back: 'A named container that stores a value.' },
    { topic_id: topic1.id, front: 'What are the primitive types in JavaScript?', back: 'string, number, boolean, null, undefined, symbol, bigint' },
    { topic_id: topic1.id, front: 'How do you declare a constant?', back: 'Using the `const` keyword.' },
    { topic_id: topic1.id, front: 'What is the difference between `let` and `var`?', back: '`let` is block-scoped; `var` is function-scoped.' },
    { topic_id: topic1.id, front: 'What does `typeof` return for `null`?', back: '"object" — a known quirk of JavaScript.' },
  ]);

  // Cards for topic2 (5 cards)
  await knex('cards').insert([
    { topic_id: topic2.id, front: 'What is a function?', back: 'A reusable block of code that performs a specific task.' },
    { topic_id: topic2.id, front: 'What is a closure?', back: 'A function that retains access to its outer scope even after the outer function has returned.' },
    { topic_id: topic2.id, front: 'What is hoisting?', back: 'JavaScript moves declarations to the top of their scope before execution.' },
    { topic_id: topic2.id, front: 'What is an arrow function?', back: 'A concise function syntax: `(args) => expression`.' },
    { topic_id: topic2.id, front: 'What does `return` do?', back: 'Exits the function and optionally sends a value back to the caller.' },
  ]);

  // Cards for topic3 (5 cards)
  await knex('cards').insert([
    { topic_id: topic3.id, front: 'How do you create an array?', back: 'Using `[]` or `new Array()`.' },
    { topic_id: topic3.id, front: 'What is `Array.map()`?', back: 'Returns a new array by applying a function to each element.' },
    { topic_id: topic3.id, front: 'How do you access an object property?', back: 'Using dot notation `obj.key` or bracket notation `obj["key"]`.' },
    { topic_id: topic3.id, front: 'What is destructuring?', back: 'Syntax to unpack values from arrays or properties from objects.' },
    { topic_id: topic3.id, front: 'What does `Array.filter()` do?', back: 'Returns a new array with elements that pass the test function.' },
  ]);

  // Enrollments
  await knex('enrollments').insert([
    { user_id: student1.id, course_id: course1.id },
    { user_id: student2.id, course_id: course1.id },
    { user_id: student1.id, course_id: course2.id },
  ]);
};
