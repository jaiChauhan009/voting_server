const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/keys');
const { Voter } = require('../models'); // Import Voter model

// Helper function to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, jwtSecret, {
    expiresIn: '1h', // Token expires in 1 hour
  });
};

// @route   POST /api/auth/register
// @desc    Register a new voter (optional, for initial setup)
// @access  Public
router.post('/register', async (req, res) => {
  const { voter_id, username, email, password, pincode, image } = req.body;

  try {
    // Check if voter_id or email already exists
    let voterExists = await Voter.findOne({ $or: [{ voter_id }, { email }] });
    if (voterExists) {
      return res.status(400).json({ message: 'Voter ID or Email already registered' });
    }

    const voter = await Voter.create({
      voter_id,
      username,
      email,
      password, // Password will be hashed by the pre-save hook in Voter model
      pincode,
      // Handle image data if provided (assuming base64 or similar)
      image: image ? { data: Buffer.from(image.data, 'base64'), contentType: image.contentType } : undefined,
    });

    res.status(201).json({
      message: 'Voter registered successfully',
      voter: {
        _id: voter._id,
        voter_id: voter.voter_id,
        username: voter.username,
        email: voter.email,
        pincode: voter.pincode,
      },
      token: generateToken(voter._id),
    });
  } catch (error) {
    console.error('Voter registration failed:', error.message);
    res.status(500).json({ message: 'Server error during registration' });
  }
});


// @route   POST /api/auth/login
// @desc    Authenticate voter & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if voter exists by email
    const voter = await Voter.findOne({ email });

    if (!voter) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Compare passwords
    const isMatch = await voter.matchPassword(password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // If login successful, send token
    res.json({
      message: 'Login successful',
      _id: voter._id,
      voter_id: voter.voter_id,
      username: voter.username,
      email: voter.email,
      pincode: voter.pincode,
      token: generateToken(voter._id),
    });
  } catch (error) {
    console.error('Voter login failed:', error.message);
    res.status(500).json({ message: 'Server error during login' });
  }
});

module.exports = router;
