require('dotenv').config();

module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'supersecretjwtkeyforvotingapp', // Fallback for development
};
