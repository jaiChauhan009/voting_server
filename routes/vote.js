// routes/vote.js (modifications)
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { Voter, Candidate, Vote } = require('../models');
const { v4: uuidv4 } = require('uuid');

router.post('/', protect, async (req, res) => {
  const currentVoter = req.user;
  const voterPincode = currentVoter.pincode;

  const { candidate_id, level } = req.body;

  if (!candidate_id || !level) {
    return res.status(400).json({ message: 'Candidate ID and election level are required.' });
  }

  try {
    const candidate = await Candidate.findById(candidate_id).populate('voter_id', 'pincode');

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found.' });
    }

    if (candidate.level !== level) {
      return res.status(400).json({
        message: `Candidate is standing for level ${candidate.level}, but vote requested for level ${level}.`
      });
    }

    const candidateVoterPincode = candidate.voter_id ? candidate.voter_id.pincode : null;

    if (!candidateVoterPincode || voterPincode !== candidateVoterPincode) {
      return res.status(400).json({
        message: `You can only vote for candidates in your own pincode (${voterPincode}). This candidate is from pincode ${candidateVoterPincode || 'N/A'}.`
      });
    }

    const newVote = await Vote.create({
      voter_id: currentVoter._id,
      candidate_id: candidate._id,
      level: level,
      pincode: voterPincode,
      time: new Date(),
      sign: uuidv4(),
    });

    const updatedCandidate = await Candidate.findByIdAndUpdate(
      candidate._id,
      { $inc: { vote_count: 1 } },
      { new: true } // Return the updated document
    );

    // Get the `io` instance from the app context
    const io = req.app.get('socketio');

    // Emit event to all connected clients in the specific room (level and pincode)
    // Clients will join rooms based on the election they are viewing.
    io.to(`election-${level}-${pincode}`).emit('voteUpdate', {
      candidateId: updatedCandidate._id,
      candidate_id_string: updatedCandidate.candidate_id, // Use string ID for client
      newVoteCount: updatedCandidate.vote_count,
      level: level,
      pincode: pincode
    });

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
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already voted for this level in your pincode.' });
    }
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    res.status(500).json({ message: 'Server error while casting vote.' });
  }
});

module.exports = router;