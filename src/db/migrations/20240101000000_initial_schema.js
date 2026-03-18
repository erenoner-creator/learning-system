exports.up = async function (knex) {
  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('name', 255).notNullable();
    t.string('email', 255).notNullable().unique();
    t.enu('role', ['student', 'instructor']).notNullable();
  });

  await knex.schema.createTable('courses', (t) => {
    t.increments('id').primary();
    t.string('title', 255).notNullable();
    t.text('description');
    t.integer('instructor_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index('instructor_id');
  });

  await knex.schema.createTable('topics', (t) => {
    t.increments('id').primary();
    t.integer('course_id').notNullable().references('id').inTable('courses').onDelete('CASCADE');
    t.string('title', 255).notNullable();
    t.integer('order_index').notNullable();
    t.index('course_id');
  });

  await knex.schema.createTable('cards', (t) => {
    t.increments('id').primary();
    t.integer('topic_id').notNullable().references('id').inTable('topics').onDelete('CASCADE');
    t.text('front').notNullable();
    t.text('back').notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index('topic_id');
  });

  await knex.schema.createTable('enrollments', (t) => {
    t.increments('id').primary();
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('course_id').notNullable().references('id').inTable('courses').onDelete('CASCADE');
    t.timestamp('enrolled_at').defaultTo(knex.fn.now());
    t.unique(['user_id', 'course_id']);
    t.index('user_id');
    t.index('course_id');
  });

  await knex.schema.createTable('quiz_sessions', (t) => {
    t.increments('id').primary();
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('topic_id').notNullable().references('id').inTable('topics').onDelete('CASCADE');
    t.timestamp('started_at').defaultTo(knex.fn.now());
    t.timestamp('completed_at').nullable();
    t.index('user_id');
    t.index('topic_id');
  });

  await knex.schema.createTable('card_reviews', (t) => {
    t.increments('id').primary();
    t.integer('card_id').notNullable().references('id').inTable('cards').onDelete('CASCADE');
    t.integer('quiz_session_id').notNullable().references('id').inTable('quiz_sessions').onDelete('CASCADE');
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.boolean('was_correct').notNullable();
    t.timestamp('reviewed_at').defaultTo(knex.fn.now());
    t.index('quiz_session_id');
    t.index('card_id');
    t.index('user_id');
  });

  await knex.schema.createTable('study_logs', (t) => {
    t.increments('id').primary();
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('topic_id').notNullable().references('id').inTable('topics').onDelete('CASCADE');
    t.integer('duration_minutes').notNullable();
    t.timestamp('logged_at').defaultTo(knex.fn.now());
    t.index('user_id');
    t.index('topic_id');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('study_logs');
  await knex.schema.dropTableIfExists('card_reviews');
  await knex.schema.dropTableIfExists('quiz_sessions');
  await knex.schema.dropTableIfExists('enrollments');
  await knex.schema.dropTableIfExists('cards');
  await knex.schema.dropTableIfExists('topics');
  await knex.schema.dropTableIfExists('courses');
  await knex.schema.dropTableIfExists('users');
};
