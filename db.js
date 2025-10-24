// const { Pool } = require('pg');
// require('dotenv').config();

// // Use environment variable or default connection string
// const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/video_conference_db';

// const pool = new Pool({
//   connectionString: connectionString,
// });

// // Test connection
// pool.on('connect', () => {
//   console.log('Connected to PostgreSQL database');
// });

// pool.on('error', (err) => {
//   console.error('Database connection error:', err);
// });

// // Database schema and initial data
// const initDB = async () => {
//   try {
//     console.log('Initializing database...');

//     // Create tables
//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS departments (
//         id SERIAL PRIMARY KEY,
//         name VARCHAR(100) NOT NULL UNIQUE,
//         description TEXT,
//         is_break_room BOOLEAN DEFAULT FALSE,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//       );
//     `);

//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS users (
//         id SERIAL PRIMARY KEY,
//         email VARCHAR(255) UNIQUE NOT NULL,
//         password VARCHAR(255) NOT NULL,
//         name VARCHAR(100) NOT NULL,
//         department_id INTEGER REFERENCES departments(id),
//         is_hr BOOLEAN DEFAULT FALSE,
//         is_active BOOLEAN DEFAULT TRUE,
//         last_login TIMESTAMP,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//       );
//     `);

//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS meetings (
//         id SERIAL PRIMARY KEY,
//         room_id VARCHAR(100) NOT NULL,
//         department_id INTEGER REFERENCES departments(id),
//         host_id INTEGER REFERENCES users(id),
//         participant_count INTEGER DEFAULT 0,
//         start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         end_time TIMESTAMP,
//         duration INTEGER DEFAULT 0,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//       );
//     `);

//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS meeting_participants (
//         id SERIAL PRIMARY KEY,
//         meeting_id INTEGER REFERENCES meetings(id),
//         user_id INTEGER REFERENCES users(id),
//         join_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         leave_time TIMESTAMP,
//         duration INTEGER DEFAULT 0,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//       );
//     `);

//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS user_activity (
//         id SERIAL PRIMARY KEY,
//         user_id INTEGER REFERENCES users(id),
//         activity_type VARCHAR(50) NOT NULL,
//         description TEXT,
//         timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//       );
//     `);

//     // Insert default departments
//     await pool.query(`
//       INSERT INTO departments (name, description, is_break_room) VALUES
//       ('Resume & Technical Recruiter', 'Technical recruitment and resume screening department', false),
//       ('HR Department', 'Human resources management and operations', false),
//       ('Tea Break Room', 'Informal chat space for tea breaks', true),
//       ('Coffee Break Room', 'Informal chat space for coffee breaks', true)
//       ON CONFLICT (name) DO NOTHING;
//     `);

//     // Insert default HR user
//     const hashedPassword = require('bcryptjs').hashSync('admin123', 10);
//     await pool.query(`
//       INSERT INTO users (email, password, name, department_id, is_hr) VALUES
//       ('hr@company.com', $1, 'HR Admin', 2, true)
//       ON CONFLICT (email) DO NOTHING;
//     `, [hashedPassword]);

//     // Insert sample employees
//     const employeePassword = require('bcryptjs').hashSync('employee123', 10);
//     await pool.query(`
//       INSERT INTO users (email, password, name, department_id, is_hr) VALUES
//       ('john@company.com', $1, 'John Doe', 1, false),
//       ('jane@company.com', $1, 'Jane Smith', 1, false),
//       ('mike@company.com', $1, 'Mike Johnson', 2, false),
//       ('sara@company.com', $1, 'Sarah Wilson', 3, false)
//       ON CONFLICT (email) DO NOTHING;
//     `, [employeePassword]);

//     console.log('Database initialized successfully');
//   } catch (error) {
//     console.error('Error initializing database:', error.message);
//     throw error;
//   }
// };

// module.exports = { pool, initDB };


const { Pool } = require('pg');
require('dotenv').config();

// Direct configuration with credentials
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'video_conference_db',
  password: 'Anjan$123',
  port: 5432,
});

// Test connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

// Database schema and initial data
const initDB = async () => {
  try {
    console.log('Initializing database...');

    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        is_break_room BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        department_id INTEGER REFERENCES departments(id),
        is_hr BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS meetings (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(100) NOT NULL,
        department_id INTEGER REFERENCES departments(id),
        host_id INTEGER REFERENCES users(id),
        participant_count INTEGER DEFAULT 0,
        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMP,
        duration INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS meeting_participants (
        id SERIAL PRIMARY KEY,
        meeting_id INTEGER REFERENCES meetings(id),
        user_id INTEGER REFERENCES users(id),
        join_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        leave_time TIMESTAMP,
        duration INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_activity (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        activity_type VARCHAR(50) NOT NULL,
        description TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default departments
    await pool.query(`
      INSERT INTO departments (name, description, is_break_room) VALUES
      ('Resume & Technical Recruiter', 'Technical recruitment and resume screening department', false),
      ('HR Department', 'Human resources management and operations', false),
      ('Tea Break Room', 'Informal chat space for tea breaks', true),
      ('Coffee Break Room', 'Informal chat space for coffee breaks', true)
      ON CONFLICT (name) DO NOTHING;
    `);

    // Insert default HR user
    const hashedPassword = require('bcryptjs').hashSync('admin123', 10);
    await pool.query(`
      INSERT INTO users (email, password, name, department_id, is_hr) VALUES
      ('hr@company.com', $1, 'HR Admin', 2, true)
      ON CONFLICT (email) DO NOTHING;
    `, [hashedPassword]);

    // Insert sample employees
    const employeePassword = require('bcryptjs').hashSync('employee123', 10);
    await pool.query(`
      INSERT INTO users (email, password, name, department_id, is_hr) VALUES
      ('john@company.com', $1, 'John Doe', 1, false),
      ('jane@company.com', $1, 'Jane Smith', 1, false),
      ('mike@company.com', $1, 'Mike Johnson', 2, false),
      ('sara@company.com', $1, 'Sarah Wilson', 3, false)
      ON CONFLICT (email) DO NOTHING;
    `, [employeePassword]);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error.message);
    throw error;
  }
};

module.exports = { pool, initDB };