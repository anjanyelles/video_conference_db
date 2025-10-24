const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://localhost:5432/video_conference_db'
});

async function testConnection() {
  try {
    await client.connect();
    console.log('✅ Successfully connected to database!');
    
    const result = await client.query('SELECT current_database(), version()');
    console.log('Database:', result.rows[0].current_database);
    console.log('PostgreSQL version:', result.rows[0].version.split(',')[0]);
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Make sure PostgreSQL is running: `brew services start postgresql`');
    console.log('2. Check if database exists: `psql -l | grep video_conference_db`');
    console.log('3. Try creating database: `createdb video_conference_db`');
  } finally {
    await client.end();
  }
}

testConnection();