const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
  // Reference to the Voter document who cast the vote
  voter_id: {
    type: mongoose.Schema.Types.ObjectId, // This stores the _id of the Voter document
    ref: 'Voter', // References the 'Voter' model
    required: [true, 'Voter ID is required for a vote'],
    index: true, // For faster queries
  },
  // Reference to the Candidate document who received the vote
  candidate_id: {
    type: mongoose.Schema.Types.ObjectId, // This stores the _id of the Candidate document
    ref: 'Candidate', // References the 'Candidate' model
    required: [true, 'Candidate ID is required for a vote'],
    index: true, // For faster queries
  },
  level: {
    type: Number,
    required: [true, 'Election level is required for a vote'],
    enum: {
      values: [1, 2, 3],
      message: 'Election level must be 1 (local), 2 (state), or 3 (national)',
    },
  },
  pincode: { // Voter's pincode at the time of voting (crucial for unique vote constraint)
    type: String,
    required: [true, 'Pincode is required for a vote'],
    trim: true,
    index: true, // For faster queries
  },
  time: {
    type: Date,
    required: true,
    default: Date.now, // Defaults to the current timestamp
  },
  sign: { // Unique identifier for the vote transaction (e.g., UUID, hash)
    type: String,
    required: [true, 'Vote signature/unique identifier is required'],
    unique: true, // Ensures each vote record is unique by its sign
    trim: true,
  },
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false } // Only track creation time for votes
});

// Compound unique index for Vote: A voter can only cast ONE vote per level per pincode
VoteSchema.index(
  { voter_id: 1, level: 1, pincode: 1 },
  { unique: true, message: 'You have already voted for this level in your pincode.' }
);

module.exports = mongoose.model('Vote', VoteSchema);
