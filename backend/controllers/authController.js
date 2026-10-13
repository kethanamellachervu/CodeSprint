const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Progress = require('../models/Progress');
const memoryStore = require('../utils/memoryStore');

/**
 * Generate signed JWT
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'codesprint_jwt_secret_dev_key', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const { username, email, password, cfHandle, preferredStage, targetPerDay } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email and password'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Check if connected to MongoDB Atlas
    if (mongoose.connection.readyState === 1) {
      const existingEmail = await User.findOne({ email: cleanEmail });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists'
        });
      }

      const existingUsername = await User.findOne({ username: cleanUsername });
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: 'This username is already taken. Please choose another'
        });
      }

      const user = await User.create({
        username: cleanUsername,
        email: cleanEmail,
        password,
        cfHandle: cfHandle ? cfHandle.trim() : '',
        preferredStage: preferredStage || 'Intermediate',
        targetPerDay: targetPerDay ? Number(targetPerDay) : 3
      });

      await Progress.create({
        user: user._id,
        solvedProblems: []
      });

      const token = generateToken(user._id);

      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          cfHandle: user.cfHandle,
          preferredStage: user.preferredStage,
          targetPerDay: user.targetPerDay,
          createdAt: user.createdAt
        }
      });
    } else {
      // Memory Store Fallback
      const existing = await memoryStore.findUserByEmailOrUsername(cleanEmail) ||
                       await memoryStore.findUserByEmailOrUsername(cleanUsername);
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Username or email already in use'
        });
      }

      const user = await memoryStore.createUser({
        username: cleanUsername,
        email: cleanEmail,
        password,
        cfHandle,
        preferredStage,
        targetPerDay
      });

      const token = generateToken(user._id);

      return res.status(201).json({
        success: true,
        message: 'Account created successfully (local mode)',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          cfHandle: user.cfHandle,
          preferredStage: user.preferredStage,
          targetPerDay: user.targetPerDay,
          createdAt: user.createdAt
        }
      });
    }
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during registration'
    });
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email/username and password'
      });
    }

    const identifier = email.trim();

    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({
        $or: [
          { email: identifier.toLowerCase() },
          { username: identifier }
        ]
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. User not found'
        });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. Incorrect password'
        });
      }

      const token = generateToken(user._id);

      return res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          cfHandle: user.cfHandle,
          preferredStage: user.preferredStage,
          targetPerDay: user.targetPerDay,
          createdAt: user.createdAt
        }
      });
    } else {
      // Memory Store Fallback
      const user = await memoryStore.findUserByEmailOrUsername(identifier);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. User not found'
        });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. Incorrect password'
        });
      }

      const token = generateToken(user._id);

      return res.status(200).json({
        success: true,
        message: 'Logged in successfully (local mode)',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          cfHandle: user.cfHandle,
          preferredStage: user.preferredStage,
          targetPerDay: user.targetPerDay,
          createdAt: user.createdAt
        }
      });
    }
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during login'
    });
  }
};

/**
 * @desc    Get currently logged in user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    const user = req.user;
    let totalSolved = 0;

    if (mongoose.connection.readyState === 1) {
      const progress = await Progress.findOne({ user: user._id });
      totalSolved = progress ? progress.solvedProblems.length : 0;
    } else {
      const progress = await memoryStore.getProgress(user._id);
      totalSolved = progress ? progress.solvedProblems.length : 0;
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        cfHandle: user.cfHandle,
        preferredStage: user.preferredStage,
        targetPerDay: user.targetPerDay,
        createdAt: user.createdAt,
        totalSolved
      }
    });
  } catch (error) {
    console.error('GetMe Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving user data'
    });
  }
};

module.exports = {
  register,
  login,
  getMe
};
