import jwt from 'jsonwebtoken';

export const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      message: 'Not authorized, no token provided.'
    });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is missing.');
    }

    const decoded = jwt.verify(token, secret);
    
    // Attach the user ID to the request object
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    return res.status(401).json({
      message: 'Not authorized, token failed verification.'
    });
  }
};
