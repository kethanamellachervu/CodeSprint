const mongoose = require('mongoose');

const solvedProblemItemSchema = new mongoose.Schema({
  problemId: {
    type: String,
    required: true,
    trim: true
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
    trim: true
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
  solvedAt: {
    type: Date,
    default: Date.now
  },
  timeSpentSeconds: {
    type: Number,
    default: 0
  }
}, { _id: false });

const progressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  solvedProblems: [solvedProblemItemSchema],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Update lastUpdated timestamp on save
progressSchema.pre('save', function (next) {
  this.lastUpdated = Date.now();
  next();
});

module.exports = mongoose.model('Progress', progressSchema);
