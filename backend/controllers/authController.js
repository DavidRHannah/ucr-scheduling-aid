import { User } from '../models/User.js';
import { generateToken } from '../utils/jwt.js';

// Basic email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const registerUser = async (req, res) => {
  const { email, password, displayName } = req.body;

  // Validation
  const errors = [];
  if (!email) errors.push({ field: 'email', message: 'Email is required.' });
  if (!password) errors.push({ field: 'password', message: 'Password is required.' });
  if (!displayName) errors.push({ field: 'displayName', message: 'Display name is required.' });

  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed.', errors });
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({
      message: 'Validation failed.',
      errors: [{ field: 'email', message: 'Invalid email format.' }]
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      message: 'Validation failed.',
      errors: [{ field: 'password', message: 'Password must be at least 6 characters.' }]
    });
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(409).json({
        message: 'Conflict occurred.',
        errors: [{ field: 'email', message: 'Email is already in use.' }]
      });
    }

    const user = await User.create({
      email,
      password,
      displayName
    });

    const token = generateToken(user._id);

    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName
      },
      token
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({
      message: 'An unexpected error occurred on the server.'
    });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // Validation
  const errors = [];
  if (!email) errors.push({ field: 'email', message: 'Email is required.' });
  if (!password) errors.push({ field: 'password', message: 'Password is required.' });

  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed.', errors });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid email or password.'
      });
    }

    const token = generateToken(user._id);

    res.json({
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName
      },
      token
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      message: 'An unexpected error occurred on the server.'
    });
  }
};
