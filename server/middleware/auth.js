/**
 * Basic HTTP Authentication Middleware
 * Protects the app with username/password
 */
function basicAuth(req, res, next) {
  // Check if authentication is enabled
  const authUsername = process.env.AUTH_USERNAME;
  const authPassword = process.env.AUTH_PASSWORD;

  console.log('Auth middleware - Username set:', !!authUsername, 'Password set:', !!authPassword);

  // Skip auth if not configured (for development)
  if (!authUsername || !authPassword) {
    console.warn('Warning: AUTH_USERNAME and AUTH_PASSWORD not set. Authentication disabled.');
    return next();
  }

  // Get the Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    // No credentials provided, request them
    console.log('No auth header provided, requesting credentials');
    return requestAuth(res);
  }

  // Parse credentials
  const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
  const username = auth[0];
  const password = auth[1];

  console.log('Received username:', username, 'Expected:', authUsername);
  console.log('Password match:', password === authPassword);

  // Verify credentials
  if (username === authUsername && password === authPassword) {
    // Credentials are correct, allow access
    console.log('Authentication successful');
    return next();
  } else {
    // Wrong credentials
    console.log('Authentication failed - wrong credentials');
    return requestAuth(res);
  }
}

/**
 * Request authentication from the browser
 */
function requestAuth(res) {
  res.set('WWW-Authenticate', 'Basic realm="Voice Chat with Claude"');
  res.status(401).send('Authentication required');
}

module.exports = basicAuth;
