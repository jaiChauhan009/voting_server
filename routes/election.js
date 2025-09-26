const express = require('express');
const router = express.Router();
const { Voter, Candidate } = require('../models');

router.get('/winner/:level/:pincode', async (req, res) => {
  const { level, pincode } = req.params;

  if (!level || !pincode) {
    return res.status(400).json({ message: 'Election level and pincode are required.' });
  }

  try {
    const votersInPincode = await Voter.find({ pincode: pincode }).select('_id');
    const voterIds = votersInPincode.map(voter => voter._id);

    if (voterIds.length === 0) {
      return res.status(404).json({ message: `No voters found in pincode ${pincode}, so no candidates from this area.` });
    }

    const candidates = await Candidate.find({
      level: level,
      voter_id: { $in: voterIds } 
    }).populate('voter_id', 'username email pincode image');

    if (candidates.length === 0) {
      return res.status(404).json({ message: `No candidates found for level ${level} in pincode ${pincode}.` });
    }

    candidates.sort((a, b) => b.vote_count - a.vote_count);

    let winner = null;
    let tiedCandidates = [];

    if (candidates.length > 0) {
      const maxVotes = candidates[0].vote_count;
      tiedCandidates = candidates.filter(c => c.vote_count === maxVotes);

      if (tiedCandidates.length === 1) {
        winner = tiedCandidates[0];
        res.json({
          message: 'Winner declared!',
          level: level,
          pincode: pincode,
          winner: {
            candidate_id: winner.candidate_id,
            voter_details: winner.voter_id ? {
              username: winner.voter_id.username,
              email: winner.voter_id.email,
              pincode: winner.voter_id.pincode,
              image: winner.voter_id.image ? `data:${winner.voter_id.image.contentType};base64,${winner.voter_id.image.data.toString('base64')}` : null,
            } : null,
            vote_count: winner.vote_count,
            promises: winner.promises,
          }
        });
      } else {
        // Handle tie scenario
        res.json({
          message: 'It\'s a tie!',
          level: level,
          pincode: pincode,
          tiedCandidates: tiedCandidates.map(c => ({
            candidate_id: c.candidate_id,
            voter_details: c.voter_id ? {
              username: c.voter_id.username,
              email: c.voter_id.email,
              pincode: c.voter_id.pincode,
              image: c.voter_id.image ? `data:${c.voter_id.image.contentType};base64,${c.voter_id.image.data.toString('base64')}` : null,
            } : null,
            vote_count: c.vote_count,
            promises: c.promises,
          })),
        });
      }
    } else {
        res.status(404).json({ message: `No candidates found for level ${level} in pincode ${pincode}.` });
    }

  } catch (error) {
    console.error('Error determining winner:', error.message);
    res.status(500).json({ message: 'Server error while determining winner.' });
  }
});

module.exports = router;
