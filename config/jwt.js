require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET_USER = process.env.JWT_SECRET_USER || 'User-Temp-Key';
const JWT_SECRET_ADMIN = process.env.JWT_SECRET_ADMIN || 'Admin-Temp-Key';
const JWT_EXPIRES_IN = '7d';

const generateToken = (payload, isAdmin = false) => {
    const secret = isAdmin ? JWT_SECRET_ADMIN : JWT_SECRET_USER;
    return jwt.sign(payload, secret, { expiresIn: JWT_EXPIRES_IN });
};

const verifyToken = (token, isAdmin = false) => {
    try {
        const secret = isAdmin ? JWT_SECRET_ADMIN : JWT_SECRET_USER;
        return jwt.verify(token, secret);
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            console.warn("🔄 Token Expired, consider refreshing it.");
            return "expired"; 
        }
        console.error("❌ JWT Verification Error:", error.message);
        return null;
    }
};

module.exports = {
    JWT_SECRET_USER,
    JWT_SECRET_ADMIN,
    JWT_EXPIRES_IN,
    generateToken,
    verifyToken
};
