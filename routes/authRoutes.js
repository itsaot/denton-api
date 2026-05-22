const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { createVerificationToken, createResetToken, hashToken } = require('../utils/emailToken');
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendEmailSafely,
  isMailConfigured,
} = require('../helpers/systemEmail');

router.post('/register', async (req, res) => {
  const { firstName, lastName, email, password, role, contactNumber } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const { token, hash, expires } = createVerificationToken();

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
      contactNumber,
      emailVerificationToken: hash,
      emailVerificationExpires: expires,
    });

    sendEmailSafely(
      () => sendVerificationEmail(user, token),
      `verification email to ${user.email}`
    );

    res.status(201).json({
      _id: user._id,
      firstName: user.firstName,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      message: isMailConfigured()
        ? 'Registration successful. Please check your email to verify your account before logging in.'
        : 'Registration successful. Email verification is not configured on the server; contact an administrator.',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.isVerified === false) {
      return res.status(403).json({
        message: 'Please verify your email address before logging in.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    res.json({
      _id: user._id,
      firstName: user.firstName,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ message: 'Verification token is required' });
  }

  try {
    const hashed = hashToken(token);
    const user = await User.findOne({
      emailVerificationToken: hashed,
      emailVerificationExpires: { $gt: new Date() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification link' });
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({
      message: 'Email verified successfully. You can now log in.',
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email }).select(
      '+emailVerificationToken +emailVerificationExpires'
    );
    if (!user) {
      return res.json({ message: 'If that account exists and is unverified, a verification email has been sent.' });
    }
    if (user.isVerified) {
      return res.json({ message: 'This email address is already verified.' });
    }

    const { token, hash, expires } = createVerificationToken();
    user.emailVerificationToken = hash;
    user.emailVerificationExpires = expires;
    await user.save();

    sendEmailSafely(
      () => sendVerificationEmail(user, token),
      `resend verification to ${user.email}`
    );

    res.json({ message: 'If that account exists and is unverified, a verification email has been sent.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const genericMessage = 'If an account with that email exists, a password reset link has been sent.';

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email }).select(
      '+resetPasswordToken +resetPasswordExpires'
    );
    if (user) {
      const { token, hash, expires } = createResetToken();
      user.resetPasswordToken = hash;
      user.resetPasswordExpires = expires;
      await user.save();

      sendEmailSafely(
        () => sendPasswordResetEmail(user, token),
        `password reset to ${user.email}`
      );
    }

    res.json({ message: genericMessage });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  try {
    const hashed = hashToken(token);
    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset link' });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
