const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // For password hashing

const VoterSchema = new mongoose.Schema({
  voter_id: { // This will be the unique string ID for the voter/user
    type: String,
    required: [true, 'Voter ID is required'],
    unique: true,
    trim: true,
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
  },
  pincode: {
    type: String,
    required: [true, 'Pincode is required'],
    trim: true,
  },
  image: {
    data: Buffer,      // For storing image binary data
    contentType: String // For storing image MIME type (e.g., 'image/jpeg', 'image/png')
  },
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Hash password before saving (pre-save hook)
VoterSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password (for login)
VoterSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Voter', VoterSchema);
