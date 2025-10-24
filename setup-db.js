const { Client } = require('pg');
require('dotenv').config();

async function setupDatabase() {
  // First connect to default postgres database to create our database
  const client = new Client({
    connectionString: 'postgresql://localhost:5432/postgres'
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    // Create database if it doesn't exist
    try {
      await client.query('CREATE DATABASE lakshya_meet');
      console.log('Database "lakshya_meet" created successfully');
    } catch (error) {
      if (error.code === '42P04') {
        console.log('Database "lakshya_meet" already exists');
      } else {
        throw error;
      }
    }

    await client.end();

    // Now connect to the new database and create tables
    const dbClient = new Client({
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/lakshya_meet'
    });

    await dbClient.connect();
    console.log('Connected to lakshya_meet database');

    // Create tables
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        is_break_room BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await dbClient.query(`
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

    await dbClient.query(`
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

    await dbClient.query(`
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

    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS user_activity (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        activity_type VARCHAR(50) NOT NULL,
        description TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default departments
    await dbClient.query(`
      INSERT INTO departments (name, description, is_break_room) VALUES
      ('Resume & Technical Recruiter', 'Technical recruitment and resume screening department', false),
      ('HR Department', 'Human resources management and operations', false),
      ('Tea Break Room', 'Informal chat space for tea breaks', true),
      ('Coffee Break Room', 'Informal chat space for coffee breaks', true)
      ON CONFLICT (name) DO NOTHING;
    `);

    // Insert default HR user
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    await dbClient.query(`
      INSERT INTO users (email, password, name, department_id, is_hr) VALUES
      ('hr@lakshyameet.com', $1, 'HR Admin', 2, true)
      ON CONFLICT (email) DO NOTHING;
    `, [hashedPassword]);

    // Insert sample employees
    const employeePassword = bcrypt.hashSync('employee123', 10);
    await dbClient.query(`
      INSERT INTO users (email, password, name, department_id, is_hr) VALUES
      ('john@lakshyameet.com', $1, 'John Doe', 1, false),
      ('jane@lakshyameet.com', $1, 'Jane Smith', 1, false),
      ('mike@lakshyameet.com', $1, 'Mike Johnson', 2, false),
      ('sara@lakshyameet.com', $1, 'Sarah Wilson', 3, false)
      ON CONFLICT (email) DO NOTHING;
    `, [employeePassword]);

    console.log('Database setup completed successfully!');
    console.log('');
    console.log('Default login credentials:');
    console.log('HR Admin: hr@lakshyameet.com / admin123');
    console.log('Employee: john@lakshyameet.com / employee123');

  } catch (error) {
    console.error('Database setup failed:', error);
  } finally {
    await dbClient.end();
    process.exit();
  }
}

setupDatabase();