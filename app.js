const express = require('express');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const candidateRoutes = require('./routes/candidate');
const voteRoutes = require('./routes/vote'); // New
const electionRoutes = require('./routes/election'); // New
require('dotenv').config(); // Load environment variables

const app = express();

// Connect Database
connectDB();

// Init Middleware: Body parser to accept JSON data
// Increased limit for potentially larger image data in Voter schema
app.use(express.json({ limit: '10mb' }));

// Add this at the very end of your server.js, after all routes

app.use('/api/auth', authRoutes);
app.use('/api/candidate', candidateRoutes);
app.use('/api/vote', voteRoutes); // New voting route
app.use('/api/election', electionRoutes); // New election results route
app.use((err, req, res, next) => {
  console.error(err.stack); // Log the error stack for debugging
  res.status(500).send('Something broke!'); // Generic error message
});
// Simple root route
app.get('/', (req, res) => {
  res.send('Voting Backend API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
