const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { Voter, Candidate, Vote } = require('../models');
const { v4: uuidv4 } = require('uuid'); // For generating unique vote 'sign'

// @route   POST /api/vote
// @desc    Allow an authenticated voter to cast a vote for a candidate
// @access  Private (requires JWT token)
router.post('/', protect, async (req, res) => {
  // Get authenticated voter's details from req.user (set by 'protect' middleware)
  const currentVoter = req.user;
  const voterPincode = currentVoter.pincode; // The pincode of the voter casting the vote

  const { candidate_id, level } = req.body;

  if (!candidate_id || !level) {
    return res.status(400).json({ message: 'Candidate ID and election level are required.' });
  }

  try {
    // 1. Find the candidate
    const candidate = await Candidate.findById(candidate_id).populate('voter_id', 'pincode'); // Populate candidate's voter details to get their pincode

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found.' });
    }

    // 2. Validate candidate's level matches requested level
    if (candidate.level !== level) {
      return res.status(400).json({
        message: `Candidate is standing for level ${candidate.level}, but vote requested for level ${level}.`
      });
    }

    // 3. Validate voter's pincode matches candidate's (implied) election pincode
    // A candidate's election area is determined by their registered voter's pincode.
    const candidateVoterPincode = candidate.voter_id ? candidate.voter_id.pincode : null;

    if (!candidateVoterPincode || voterPincode !== candidateVoterPincode) {
      return res.status(400).json({
        message: `You can only vote for candidates in your own pincode (${voterPincode}). This candidate is from pincode ${candidateVoterPincode || 'N/A'}.`
      });
    }

    // 4. Create the vote record
    const newVote = await Vote.create({
      voter_id: currentVoter._id,
      candidate_id: candidate._id,
      level: level,
      pincode: voterPincode, // Store the voter's pincode with the vote
      time: new Date(),
      sign: uuidv4(), // Generate a unique UUID for the vote signature
    });

    // 5. Increment candidate's vote count
    await Candidate.findByIdAndUpdate(
      candidate._id,
      { $inc: { vote_count: 1 } },
      { new: true } // Return the updated document
    );

    res.status(201).json({
      message: 'Vote cast successfully!',
      vote: {
        _id: newVote._id,
        voter_id: newVote.voter_id,
        candidate_id: newVote.candidate_id,
        level: newVote.level,
        pincode: newVote.pincode,
        time: newVote.time,
      }
    });

  } catch (error) {
    console.error('Error casting vote:', error);
    // Handle unique index violation (voter already voted for this level/pincode)
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already voted for this level in your pincode.' });
    }
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    res.status(500).json({ message: 'Server error while casting vote.' });
  }
});

module.exports = router;
