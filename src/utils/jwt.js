const jwt = require('jsonwebtoken');

const generateToken = (res, userId) => {
  const secret = process.env.JWT_SECRET || 'learnmate_ai_jwt_secret_token_key_2026_99';
  const token = jwt.sign({ id: userId }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

  const expiresDays = 7;
  
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Cookie only transmitted over HTTPS in prod
    sameSite: 'strict', // CSRF protection
    maxAge: expiresDays * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  });

  return token;
};

const clearToken = (res) => {
  res.cookie('token', token, {
  httpOnly: true,
  secure: true, // Requires HTTPS
  sameSite: 'none', // Cross-domain cookie sharing
  maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
});
};

module.exports = {
  generateToken,
  clearToken
};
