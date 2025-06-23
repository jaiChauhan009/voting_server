// server.js (modifications)
const express = require('express');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const candidateRoutes = require('./routes/candidate');
const voteRoutes = require('./routes/vote');
const electionRoutes = require('./routes/election');
require('dotenv').config();
const http = require('http'); // Import http module
const { Server } = require('socket.io'); // Import Server from socket.io

const app = express();
const server = http.createServer(app); // Create an HTTP server from your Express app
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for development, restrict in production
    methods: ["GET", "POST"]
  }
});

// Pass io instance to vote route
app.set('socketio', io); // A way to pass `io` object to routes

// Connect Database
connectDB();

// Init Middleware: Body parser to accept JSON data
app.use(express.json({ limit: '10mb' }));

// Route Middlewares
app.use('/api/auth', authRoutes);
app.use('/api/candidate', candidateRoutes);
app.use('/api/vote', voteRoutes);
app.use('/api/election', electionRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Simple root route
app.get('/', (req, res) => {
  res.send('Voting Backend API is running...');
});

const PORT = process.env.PORT || 5000;

// Use server.listen instead of app.listen
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));