const mongoose = require('mongoose');

// Sub-document schema for Promises
const PromiseSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Promise text is required'],
    trim: true,
  },
  not_fulfilled_count: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
}, { _id: false }); // No _id needed for embedded sub-documents

const CandidateSchema = new mongoose.Schema({
  candidate_id: {
    type: String,
    required: [true, 'Candidate ID is required'],
    unique: true,
    trim: true,
  },
  // Reference to the Voter (User) document.
  // This is the correct way to link to Voter details without duplicating.
  voter_id: { // Changed from userDetails for consistency with VoterSchema name
    type: mongoose.Schema.Types.ObjectId, // This stores the _id of the Voter document
    ref: 'Voter', // References the 'Voter' model
    required: [true, 'Voter ID is required for a candidate'],
  },
  voter_sign: { // Electoral symbol or category
    type: Number,
    required: [true, 'Voter sign/symbol is required'],
    enum: {
      values: [1, 2, 3, 4, 5],
      message: 'Voter sign must be between 1 and 5',
    },
  },
  year: {
    type: Number,
    required: [true, 'Election year is required'],
    min: [new Date().getFullYear(), 'Election year cannot be in the past'],
  },
  level: {
    type: Number,
    required: [true, 'Election level is required'],
    enum: {
      values: [1, 2, 3],
      message: 'Election level must be 1 (local), 2 (state), or 3 (national)',
    },
  },
  vote_count: {
    type: Number,
    required: true,
    default: 0,
    min: 0, // Vote count cannot be negative
  },
  promises: [PromiseSchema], // Array of embedded Promise sub-documents
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Compound unique index for Candidate: A voter can only be a candidate once per year and level
CandidateSchema.index(
  { voter_id: 1, year: 1, level: 1 },
  { unique: true, message: 'This voter is already a candidate for this election level and year.' }
);

module.exports = mongoose.model('Candidate', CandidateSchema);
