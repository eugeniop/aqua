import User from '../models/User.js';

const formatUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  phone: user.phone || '',
  enabled: user.enabled,
  createdAt: user.createdAt
});

const isValidEmail = (email) => /.+@.+\..+/.test(email);

export const listUsers = async (_req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users.map(formatUser));
  } catch (error) {
    res.status(500).json({ message: 'Unable to load users', error: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const phone = (req.body.phone || '').trim();
    const enabled = req.body.enabled != null ? Boolean(req.body.enabled) : true;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: 'A valid email address is required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'A user with that email already exists' });
    }

    const user = await User.create({ name, email, phone: phone || undefined, enabled });
    res.status(201).json(formatUser(user));
  } catch (error) {
    res.status(500).json({ message: 'Unable to create user', error: error.message });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { enabled } = req.body;

    if (enabled == null) {
      return res.status(400).json({ message: 'Enabled state is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.user?.id && req.user.id === userId && enabled === false) {
      return res.status(400).json({ message: 'You cannot disable your own account' });
    }

    user.enabled = Boolean(enabled);
    await user.save();

    res.json(formatUser(user));
  } catch (error) {
    res.status(500).json({ message: 'Unable to update user', error: error.message });
  }
};
