// controllers/auth_controllers.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user_model');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign( { id: user._id, email, role: user.role }, process.env.JWT_SECRET,{ expiresIn: '7d' });
    res.json({ message: 'Login successful', token, user: { id: user._id, email, name: user.name,role: user.role } });
  } catch (err) {
    next(err);
  }
};

module.exports = { login };