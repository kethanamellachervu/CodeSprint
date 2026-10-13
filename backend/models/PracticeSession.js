const mongoose = require('mongoose');

const practiceSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  problemId: {
    type: String,
    required: [true, 'Problem ID is required'],
    trim: true,
    index: true
  },
  contestId: {
    type: Number
  },
  index: {
    type: String,
    trim: true
  },
  name: {
    type: String,
    trim: true,
    default: 'Untitled Problem'
  },
  rating: {
    type: Number,
    default: null
  },
  level: {
    type: String,
    enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'Unrated'],
    default: 'Unrated'
  },
  tags: [{
    type: String,
    trim: true
  }],
  startTime: {
    type: Date,
    default: null
  },
  endTime: {
    type: Date,
    default: Date.now
  },
  durationSeconds: {
    type: Number,
    required: [true, 'Duration in seconds is required'],
    min: [0, 'Duration cannot be negative']
  },
  targetTimeSeconds: {
    type: Number,
    default: 900 // 15 mins
  },
  status: {
    type: String,
    enum: ['solved', 'unsolved'],
    required: [true, 'Session status is required']
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('PracticeSession', practiceSessionSchema);
