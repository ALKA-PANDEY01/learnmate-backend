const jwt = require('jsonwebtoken');

const generateToken = (res, userId) => {
  const secret = process.env.JWT_SECRET || 'learnmate_ai_jwt_secret_token_key_2026_99';
  const token = jwt.sign({ id: userId }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

  const expiresDays = 7;
  
  res.cookie('token', token, {
    httpOnly: true,
    secure: true, // Required for SameSite=None
    sameSite: 'none', // Allow cross-domain session cookies (Vercel to Render)
    maxAge: expiresDays * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  });

  return token;
};

const clearToken = (res) => {
  res.cookie('token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    expires: new Date(0) // Expire immediately
  });
};

module.exports = {
  generateToken,
  clearToken
};
