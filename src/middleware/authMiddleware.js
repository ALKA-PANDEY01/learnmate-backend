const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token = req.cookies.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this resource. Please log in.'
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'learnmate_ai_jwt_secret_token_key_2026_99';
    const decoded = jwt.verify(token, secret);

    // Fetch user from DB and store in request, omitting password
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User associated with this session token no longer exists.'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Session expired or token invalid. Please log in again.'
    });
  }
};

module.exports = {
  protect
};
