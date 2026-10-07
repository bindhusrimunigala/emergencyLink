require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const emergencyRoutes = require('./routes/emergencies');
const ambulanceRoutes = require('./routes/ambulances');
const hospitalRoutes = require('./routes/hospitals');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const pool = require('./config/db');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/emergencies', emergencyRoutes);
app.use('/api/ambulances', ambulanceRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use(errorHandler);

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication required'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  const { id, role } = socket.user;
  console.log(`Socket connected: ${socket.id} | User: ${id} | Role: ${role}`);

  // Join role-based rooms
  socket.join(`user:${id}`);
  socket.join(`role:${role}`);

  // Driver joins their ambulance room
  if (role === 'driver') {
    pool.query('SELECT id FROM ambulances WHERE driver_id = $1', [id])
      .then(result => {
        if (result.rows.length > 0) {
          socket.join(`ambulance:${result.rows[0].id}`);
          socket.ambulanceId = result.rows[0].id;
        }
      })
      .catch(console.error);
  }

  // Hospital staff joins hospital room
  if (role === 'hospital_staff') {
    pool.query('SELECT hospital_id FROM hospital_staff WHERE user_id = $1', [id])
      .then(result => {
        if (result.rows.length > 0) {
          socket.join(`hospital:${result.rows[0].hospital_id}`);
        }
      })
      .catch(console.error);
  }

  // Real-time location update from driver
  socket.on('location:update', async (data) => {
    try {
      const { latitude, longitude, speed } = data;
      const ambulanceId = socket.ambulanceId;

      if (!ambulanceId) return;

      // Update DB
      await pool.query(
        `UPDATE ambulances
         SET current_latitude = $1, current_longitude = $2,
             last_location_update = NOW(), updated_at = NOW()
         WHERE id = $3`,
        [latitude, longitude, ambulanceId]
      );

      // Log history
      const activeEmergency = await pool.query(
        `SELECT id FROM emergency_requests
         WHERE assigned_ambulance_id = $1 AND status NOT IN ('completed','cancelled')
         LIMIT 1`,
        [ambulanceId]
      );

      await pool.query(
        `INSERT INTO location_history (ambulance_id, emergency_request_id, latitude, longitude, speed)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          ambulanceId,
          activeEmergency.rows[0]?.id || null,
          latitude, longitude, speed || null
        ]
      );

      // Broadcast to everyone tracking this ambulance
      io.to(`ambulance:${ambulanceId}`).emit('ambulance:location', {
        ambulanceId,
        latitude,
        longitude,
        speed,
        timestamp: new Date().toISOString()
      });

      // Broadcast to admins
      io.to('role:admin').emit('ambulance:location', {
        ambulanceId,
        latitude,
        longitude,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      console.error('Location update error:', err.message);
    }
  });

  // Patient tracks their emergency
  socket.on('emergency:track', (emergencyId) => {
    socket.join(`emergency:${emergencyId}`);
    console.log(`User ${id} tracking emergency ${emergencyId}`);
  });

  // Emergency status change notification (emitted by server-side logic)
  socket.on('emergency:status_update', async (data) => {
    const { emergencyId, status } = data;
    io.to(`emergency:${emergencyId}`).emit('emergency:updated', { emergencyId, status });
    io.to('role:admin').emit('emergency:updated', { emergencyId, status });
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Make io accessible to controllers
app.set('io', io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 EmergencyLink server running on port ${PORT}`);
  console.log(`📡 Socket.io enabled`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, server, io };
