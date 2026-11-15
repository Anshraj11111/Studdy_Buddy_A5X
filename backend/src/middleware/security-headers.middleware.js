/**
 * Additional Security Headers Middleware
 * Complements Helmet.js with extra security measures
 */

export const securityHeaders = (req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Enable XSS filter in older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Force HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy (allow camera/mic for video calls, block everything else)
  res.setHeader('Permissions-Policy', 
    'camera=*, microphone=*, display-capture=*, geolocation=()');
  
  // Content Security Policy
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://accounts.google.com; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https: blob:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https: wss:; " +
      "frame-src 'self' https://accounts.google.com; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self';"
    );
  }
  
  next();
};

/**
 * Remove sensitive headers from responses
 */
export const removeSensitiveHeaders = (req, res, next) => {
  // Remove server identification
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
};

export default { securityHeaders, removeSensitiveHeaders };
