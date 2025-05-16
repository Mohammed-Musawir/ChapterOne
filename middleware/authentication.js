
const JWT_Config = require('../config/jwt');

const isAuthenticated = async (req, res, next) => {
  try {

     const publicPaths = ['/', '/about', '/shop', '/contact'];


    
    if (req.originalUrl.startsWith('/admin')) {
      return next();
    }

    const token = req.cookies?.userToken;

    
    if (!token) {
          if (publicPaths.includes(req.path)) {
            req.user = null;
      return next();
    }
      return handleUnauthenticated(req, res);
    }

    const decoded = await JWT_Config.verifyToken(token);

    if (decoded === "expired") {
      console.log("🔄 Token Expired");
      return handleUnauthenticated(req, res);
    }

    if (!decoded) {
      console.log("❌ JWT Decoding Failed.");
      return res.status(500).json({ error: "Token decoding failed." });
    }

    req.user = decoded;

    next();

  } catch (error) {
    console.error("❌ JWT Authentication Error:", error.message);
    return handleUnauthenticated(req, res);
  }
};


function handleUnauthenticated(req, res) {
  const expectsJSON =
    req.xhr ||                    
    req.headers.accept?.includes('application/json') || 
    req.headers['content-type'] === 'application/json';

  if (expectsJSON) {
    return res.status(401).json({ message: 'You must be logged in to perform this action.' });
  } else {
    return res.redirect('/login');
  }
}


module.exports = { isAuthenticated }