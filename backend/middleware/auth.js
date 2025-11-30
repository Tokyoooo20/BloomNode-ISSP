const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Get token from header
  let token = req.header('x-auth-token');

  if (!token) {
    const authHeader = req.header('authorization') || req.header('Authorization');
    if (authHeader && typeof authHeader === 'string') {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
        token = parts[1];
      }
    }
  }

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user from payload
    req.user = {
      id: decoded.userId,  // Map userId to id
      email: decoded.email,
      role: decoded.role
    };
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};