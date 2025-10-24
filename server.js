const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, initDB } = require('./db');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Determine allowed origins based on environment
const allowedOrigins = [
  'http://localhost:5174',
  'http://localhost:5173',
  process.env.FRONTEND_URL // Add your deployed frontend URL in env vars
].filter(Boolean);

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 5004;

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in production, or restrict as needed
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

// Root route - Health check
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    message: 'Video Conference API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      auth: '/api/auth/login',
      users: '/api/users',
      departments: '/api/departments',
      analytics: {
        meetings: '/api/analytics/meetings',
        activity: '/api/analytics/activity'
      }
    }
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    res.json({ 
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Authentication
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      `SELECT u.*, d.name as department_name 
       FROM users u 
       LEFT JOIN departments d ON u.department_id = d.id 
       WHERE u.email = $1 AND u.is_active = true`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Log activity
    await pool.query(
      'INSERT INTO user_activity (user_id, activity_type, description) VALUES ($1, $2, $3)',
      [user.id, 'login', 'User logged in successfully']
    );

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        is_hr: user.is_hr,
        department_id: user.department_id 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_hr: user.is_hr,
        department_id: user.department_id,
        department_name: user.department_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Users API (HR only)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    if (!req.user.is_hr) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT u.id, u.email, u.name, u.is_hr, u.is_active, u.last_login, 
              u.created_at, d.name as department_name, d.id as department_id
       FROM users u 
       LEFT JOIN departments d ON u.department_id = d.id 
       ORDER BY u.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    if (!req.user.is_hr) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { email, password, name, department_id, is_hr } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password, name, department_id, is_hr) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, name, is_hr, department_id, created_at`,
      [email, hashedPassword, name, department_id, is_hr || false]
    );

    // Log activity
    await pool.query(
      'INSERT INTO user_activity (user_id, activity_type, description) VALUES ($1, $2, $3)',
      [req.user.id, 'create_user', `Created user: ${email}`]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.is_hr) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { id } = req.params;
    const { email, name, department_id, is_hr, is_active } = req.body;

    const result = await pool.query(
      `UPDATE users 
       SET email = $1, name = $2, department_id = $3, is_hr = $4, is_active = $5 
       WHERE id = $6 
       RETURNING id, email, name, is_hr, department_id, is_active`,
      [email, name, department_id, is_hr, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log activity
    await pool.query(
      'INSERT INTO user_activity (user_id, activity_type, description) VALUES ($1, $2, $3)',
      [req.user.id, 'update_user', `Updated user: ${email}`]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.is_hr) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, email',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log activity
    await pool.query(
      'INSERT INTO user_activity (user_id, activity_type, description) VALUES ($1, $2, $3)',
      [req.user.id, 'delete_user', `Deleted user: ${result.rows[0].email}`]
    );

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Department switching (for employees)
app.put('/api/users/:id/department', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { department_id } = req.body;

    // Users can only change their own department unless they're HR
    if (parseInt(id) !== req.user.id && !req.user.is_hr) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `UPDATE users SET department_id = $1 WHERE id = $2 
       RETURNING id, email, name, department_id`,
      [department_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log activity
    await pool.query(
      'INSERT INTO user_activity (user_id, activity_type, description) VALUES ($1, $2, $3)',
      [req.user.id, 'switch_department', `Switched to department ID: ${department_id}`]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Switch department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Departments
app.get('/api/departments', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM departments ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Analytics (HR only)
app.get('/api/analytics/meetings', authenticateToken, async (req, res) => {
  try {
    if (!req.user.is_hr) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const meetingsResult = await pool.query(`
      SELECT 
        d.name as department_name,
        COUNT(m.id) as total_meetings,
        COALESCE(AVG(m.duration), 0) as avg_duration,
        COALESCE(SUM(m.participant_count), 0) as total_participants,
        COUNT(DISTINCT m.host_id) as unique_hosts
      FROM departments d
      LEFT JOIN meetings m ON d.id = m.department_id
      GROUP BY d.id, d.name
      ORDER BY d.name
    `);

    const recentMeetings = await pool.query(`
      SELECT m.*, d.name as department_name, u.name as host_name
      FROM meetings m
      LEFT JOIN departments d ON m.department_id = d.id
      LEFT JOIN users u ON m.host_id = u.id
      ORDER BY m.start_time DESC
      LIMIT 10
    `);

    res.json({
      by_department: meetingsResult.rows,
      recent_meetings: recentMeetings.rows
    });
  } catch (error) {
    console.error('Get meetings analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/analytics/activity', authenticateToken, async (req, res) => {
  try {
    if (!req.user.is_hr) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const activityResult = await pool.query(`
      SELECT 
        u.name as user_name,
        u.email,
        d.name as department_name,
        COUNT(ua.id) as total_activities,
        MAX(ua.timestamp) as last_activity
      FROM users u
      LEFT JOIN user_activity ua ON u.id = ua.user_id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.is_active = true
      GROUP BY u.id, u.name, u.email, d.name
      ORDER BY last_activity DESC
    `);

    const recentActivity = await pool.query(`
      SELECT ua.*, u.name as user_name, u.email
      FROM user_activity ua
      LEFT JOIN users u ON ua.user_id = u.id
      ORDER BY ua.timestamp DESC
      LIMIT 20
    `);

    res.json({
      user_activity: activityResult.rows,
      recent_activity: recentActivity.rows
    });
  } catch (error) {
    console.error('Get activity analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Socket.io for real-time communication
const roomUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (data) => {
    const { roomId, user } = data;
    
    socket.join(roomId);
    
    if (!roomUsers.has(roomId)) {
      roomUsers.set(roomId, new Map());
    }
    
    const room = roomUsers.get(roomId);
    room.set(socket.id, user);
    
    // Notify others in the room
    socket.to(roomId).emit('user-joined', {
      socketId: socket.id,
      user: user
    });
    
    // Send current room users to the new user
    const users = Array.from(room.entries()).map(([id, userData]) => ({
      socketId: id,
      user: userData
    }));
    
    socket.emit('room-users', users);
    
    console.log(`User ${user.name} joined room ${roomId}`);
  });

  socket.on('signal', (data) => {
    socket.to(data.target).emit('signal', {
      signal: data.signal,
      callerId: data.callerId
    });
  });

  socket.on('toggle-video', (data) => {
    socket.to(data.roomId).emit('user-toggled-video', {
      socketId: socket.id,
      videoEnabled: data.videoEnabled
    });
  });

  socket.on('toggle-audio', (data) => {
    socket.to(data.roomId).emit('user-toggled-audio', {
      socketId: socket.id,
      audioEnabled: data.audioEnabled
    });
  });

  socket.on('share-screen', (data) => {
    socket.to(data.roomId).emit('user-sharing-screen', {
      socketId: socket.id,
      isSharing: data.isSharing
    });
  });

  socket.on('send-message', (data) => {
    socket.to(data.roomId).emit('receive-message', {
      user: data.user,
      message: data.message,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove user from all rooms
    for (const [roomId, room] of roomUsers.entries()) {
      if (room.has(socket.id)) {
        const user = room.get(socket.id);
        room.delete(socket.id);
        
        // Notify others
        socket.to(roomId).emit('user-left', {
          socketId: socket.id,
          user: user
        });
        
        console.log(`User ${user.name} left room ${roomId}`);
        
        // Clean up empty rooms
        if (room.size === 0) {
          roomUsers.delete(roomId);
        }
      }
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'POST /api/auth/login',
      'GET /api/users',
      'GET /api/departments',
      'GET /api/analytics/meetings',
      'GET /api/analytics/activity'
    ]
  });
});

// Initialize database and start server
initDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});