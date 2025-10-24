// const { Client } = require('pg');

// async function createDatabase() {
//   // First connect to default postgres database
//   const client = new Client({
//     host: 'localhost',
//     port: 5432,
//     user: 'postgres', // Change if you have different username
//     database: 'postgres'
//   });

//   try {
//     await client.connect();
//     console.log('Connected to PostgreSQL');

//     // Check if database exists
//     const result = await client.query(`
//       SELECT 1 FROM pg_database WHERE datname = 'video_conference_db'
//     `);

//     if (result.rows.length === 0) {
//       // Create database
//       await client.query('CREATE DATABASE video_conference_db');
//       console.log('Database "video_conference_db" created successfully');
//     } else {
//       console.log('Database "video_conference_db" already exists');
//     }

//   } catch (error) {
//     console.error('Error:', error.message);
    
//     // Try with common alternative connection strings
//     const alternatives = [
//       { user: process.env.USER }, // current system user
//       { user: 'postgres', password: 'postgres' },
//       { user: 'postgres', password: 'password' },
//     ];

//     for (const config of alternatives) {
//       try {
//         const altClient = new Client({ ...config, database: 'postgres' });
//         await altClient.connect();
//         console.log(`Connected with user: ${config.user}`);
        
//         const result = await altClient.query(`
//           SELECT 1 FROM pg_database WHERE datname = 'video_conference_db'
//         `);

//         if (result.rows.length === 0) {
//           await altClient.query('CREATE DATABASE video_conference_db');
//           console.log('Database "video_conference_db" created successfully');
//         } else {
//           console.log('Database "video_conference_db" already exists');
//         }
        
//         await altClient.end();
//         break;
//       } catch (altError) {
//         console.log(`Failed with user ${config.user}:`, altError.message);
//       }
//     }
//   } finally {
//     await client.end();
//     process.exit();
//   }
// }

// createDatabase();