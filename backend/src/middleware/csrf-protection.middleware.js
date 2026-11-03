/**
 * CSRF Protection Middleware
 * Validates request origin and prevents Cross-Site Request Forgery
 */

export const csrfProtection = (req, res, next) => {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Check origin/referer header
  const origin = req.get('origin') || req.get('referer');
  
  if (!origin) {
    // Allow requests without origin (like API clients, mobile apps)
    // But require Authorization header
    if (!req.get('authorization')) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Missing origin or authorization header',
          code: 'CSRF_PROTECTION',
        },
      });
    }
    return next();
  }

  // Validate origin against allowed origins
  const allowedOrigins = [
    'http://localhost:3000',
    'https://studdy-buddy-a5x.vercel.app',
    'https://studdybuddy.a5x.in',
    'https://studdybuddy.docu.in',
  ];

  const isAllowed = allowedOrigins.some(allowed => origin.startsWith(allowed));
  
  if (!isAllowed && !origin.match(/https:\/\/studdy-buddy.*\.vercel\.app/)) {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Invalid request origin',
        code: 'CSRF_PROTECTION',
      },
    });
  }

  next();
};

export default csrfProtection;
