const mongoose = require('mongoose');
const User = require('../models/User');
const memoryStore = require('../utils/memoryStore');

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
const getProfile = async (req, res) => {
  try {
    let user = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(req.user._id).select('-password');
    } else {
      user = await memoryStore.findUserById(req.user._id);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('GetProfile Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving profile'
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
  try {
    const { username, displayName, cfHandle, preferredStage, targetPerDay } = req.body;
    const newUsername = (displayName || username || '').trim();

    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (newUsername && newUsername !== user.username) {
        const exists = await User.findOne({ username: newUsername, _id: { $ne: user._id } });
        if (exists) {
          return res.status(400).json({ success: false, message: 'Username is already taken' });
        }
        user.username = newUsername;
      }

      if (cfHandle !== undefined) user.cfHandle = cfHandle.trim();
      if (preferredStage && ['Beginner', 'Intermediate', 'Advanced', 'Master'].includes(preferredStage)) {
        user.preferredStage = preferredStage;
      }
      if (targetPerDay !== undefined && Number(targetPerDay) > 0) {
        user.targetPerDay = Number(targetPerDay);
      }

      const updated = await user.save();
      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: updated._id,
          username: updated.username,
          email: updated.email,
          cfHandle: updated.cfHandle,
          preferredStage: updated.preferredStage,
          targetPerDay: updated.targetPerDay,
          createdAt: updated.createdAt
        }
      });
    } else {
      // Memory Store Fallback
      const updateData = {};
      if (newUsername) updateData.username = newUsername;
      if (cfHandle !== undefined) updateData.cfHandle = cfHandle.trim();
      if (preferredStage) updateData.preferredStage = preferredStage;
      if (targetPerDay) updateData.targetPerDay = Number(targetPerDay);

      const updated = await memoryStore.updateUser(req.user._id, updateData);
      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully (local mode)',
        user: updated
      });
    }
  } catch (error) {
    console.error('UpdateProfile Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error updating profile'
    });
  }
};

module.exports = {
  getProfile,
  updateProfile
};
