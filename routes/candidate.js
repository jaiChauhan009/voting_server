const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth'); // Import authentication middleware
const { Candidate, Voter } = require('../models'); // Import Candidate and Voter models

// @route   POST /api/candidate/register
// @desc    Register an authenticated voter as a candidate
// @access  Private (requires JWT token)
router.post('/register', protect, async (req, res) => {
  const { candidate_id, voter_sign, year, level, promises } = req.body;

  try {
    // req.user is populated by the protect middleware with the authenticated voter's document
    const voter = req.user;

    // Check if a candidate with this candidate_id already exists
    let existingCandidateById = await Candidate.findOne({ candidate_id });
    if (existingCandidateById) {
      return res.status(400).json({ message: 'Candidate ID already exists.' });
    }

    // Check if this voter is already a candidate for this year and level
    // The unique compound index on CandidateSchema already handles this,
    // but an explicit check provides a clearer error message.
    let existingCandidateForVoter = await Candidate.findOne({
      voter_id: voter._id,
      year: year,
      level: level
    });

    if (existingCandidateForVoter) {
      return res.status(400).json({
        message: `You are already registered as a candidate for level ${level} in year ${year}.`
      });
    }

    // Create new Candidate document
    const candidate = await Candidate.create({
      candidate_id,
      voter_id: voter._id, // Link to the authenticated voter's _id
      voter_sign,
      year,
      level,
      promises: promises || [], // Ensure promises is an array, even if empty
    });

    // --- START MODIFICATION ---
    // Populate the voter_id field to include voter details in the response
    const populatedCandidate = await Candidate.findById(candidate._id)
      .populate('voter_id', 'voter_id username email pincode image') // Select specific fields from Voter
      .lean(); // Use .lean() for faster, plain JavaScript objects (if you don't need Mongoose methods on populated data)
    // --- END MODIFICATION ---

    // Successfully created candidate
    res.status(201).json({
      message: 'Candidate registered successfully',
      candidate: {
        _id: populatedCandidate._id,
        candidate_id: populatedCandidate.candidate_id,
        // Now voter_id will be the populated object instead of just the ID
        voter_id: populatedCandidate.voter_id,
        voter_sign: populatedCandidate.voter_sign,
        year: populatedCandidate.year,
        level: populatedCandidate.level,
        vote_count: populatedCandidate.vote_count,
        promises: populatedCandidate.promises,
        createdAt: populatedCandidate.createdAt, // Include timestamps from the populated document
        updatedAt: populatedCandidate.updatedAt
      },
    });

  } catch (error) {
    console.error('Candidate registration failed:', error.message);
    // Mongoose validation errors or duplicate key errors from indexes will be caught here
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    if (error.code === 11000) { // MongoDB duplicate key error
      return res.status(400).json({ message: 'Duplicate entry: Candidate ID might already exist, or voter is already a candidate for this election context.' });
    }
    res.status(500).json({ message: 'Server error during candidate registration' });
  }
});

// @route   GET /api/candidate/:id
// @desc    Get candidate details by candidate_id
// @access  Public (or Private, depending on app requirements)
router.get('/:candidate_id', async (req, res) => {
  try {
    // Populate voter_id to get voter details (username, email, pincode, image)
    const candidate = await Candidate.findOne({ candidate_id: req.params.candidate_id }).populate('voter_id', '-password');

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    res.json({
      message: 'Candidate fetched successfully',
      candidate: {
        _id: candidate._id,
        candidate_id: candidate.candidate_id,
        voter_sign: candidate.voter_sign,
        year: candidate.year,
        level: candidate.level,
        vote_count: candidate.vote_count,
        promises: candidate.promises,
        // The populated voter details will be under candidate.voter_id
        voterDetails: candidate.voter_id ? {
          _id: candidate.voter_id._id,
          voter_id: candidate.voter_id.voter_id, // Original string voter_id
          username: candidate.voter_id.username,
          email: candidate.voter_id.email,
          pincode: candidate.voter_id.pincode,
          // image: candidate.voter_id.image // Include if needed, but often not for general API
        } : null
      }
    });
  } catch (error) {
    console.error('Error fetching candidate:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PATCH /api/candidate/:candidate_id/promises/:promise_index/not-fulfilled
// @desc    Increment the 'not_fulfilled_count' for a specific promise of a candidate
// @access  Private (requires JWT token, any authenticated user can mark)
router.patch('/:candidate_id/promises/:promise_index/not-fulfilled', protect, async (req, res) => {
  try {
    const { candidate_id, promise_index } = req.params;

    // Find the candidate by their candidate_id
    const candidate = await Candidate.findOne({ candidate_id });

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found.' });
    }

    // Check if the promise_index is valid
    if (promise_index < 0 || promise_index >= candidate.promises.length) {
      return res.status(400).json({ message: 'Invalid promise index.' });
    }

    // Increment the specific promise's not_fulfilled_count using $inc
    // Mongoose positional operator ($) updates the first element that matches the query
    const updatedCandidate = await Candidate.findOneAndUpdate(
      { _id: candidate._id, [`promises.${promise_index}`]: { $exists: true } }, // Find the candidate and ensure the promise exists
      { $inc: { [`promises.${promise_index}.not_fulfilled_count`]: 1 } },
      { new: true } // Return the updated document
    );

    if (!updatedCandidate) {
      return res.status(500).json({ message: 'Failed to update promise count.' });
    }

    res.json({
      message: 'Promise marked as not fulfilled.',
      promise: updatedCandidate.promises[promise_index]
    });

  } catch (error) {
    console.error('Error marking promise as not fulfilled:', error.message);
    res.status(500).json({ message: 'Server error while updating promise status.' });
  }
});

module.exports = router;