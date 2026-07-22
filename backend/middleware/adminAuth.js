export const protectAdmin = (req, res, next) => {
  const intakeKey = process.env.INTAKE_API_KEY;
  if (!intakeKey) {
    return res.status(500).json({
      message: 'Administration key is not configured on the server.'
    });
  }

  // Check custom header or authorization header or standard x-api-key
  const keyHeader = req.headers['intake_api_key'] || 
                    req.headers['intake-api-key'] || 
                    req.headers['x-api-key'] ||
                    req.headers['authorization'];

  if (!keyHeader || keyHeader !== intakeKey) {
    return res.status(401).json({
      message: 'Unauthorized, invalid or missing administration API key.'
    });
  }

  next();
};
