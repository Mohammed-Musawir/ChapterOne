require('dotenv').config()
const jwt = require('jsonwebtoken');
const JWT_Config = require('../config/jwt');
const User = require('../models/userSchema'); 
const passport = require('passport');


const isAnyOne = async (req,res,next) => {
    try {
        const token = req.cookies.userToken;
        
        if(!token){
            return next();
        }
        if(token){
            res.redirect('/home');
        }
    } catch (error) {
        res.render('500');
        console.log('Error in GoogleChek middleware and in isAnyone');
    }
}
const isBlock = async (req, res, next) => {
  try {
      const token = req.cookies.userToken;
      
      if(!token) {
          return next();
      }

      const decoded = jwt.verify(token, JWT_Config.JWT_SECRET_USER);
      // Handle both formats
      req.user = {
          _id: decoded._id || decoded.id
      };
      
      const user = await User.findById(req.user._id);
      
      if(user.isBlocked) {
          return res.status(403).json({ success: false, message: 'Your account is blocked. Contact support.' });
      }

      next();
  } catch (error) {
      return res.status(500).json({ success: false, message: 'error in isBlock in googlechek middleware' });
  }
}


 const cacheController = async (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
}


const googleAuthLoginCallback = async (req,res,next) => {
    passport.authenticate(
        "google-login",   // 👉 Correct strategy name matching passport config
        { failureRedirect: "/login", failureFlash: true },
        (err, user, info) => {
          if (err) {
            console.error("Google Login Error:", err);
            return next(err);
          }
    
          if (!user) {
            return res.redirect('/login?error=emailNotFound');
          }
    
          req.login(user, async (err) => {
            if (err) {
              console.error("Session login error:", err);
              return next(err);
            }
     
            // ✅ Generate JWT token
            const token = JWT_Config.generateToken({ id: user._id });
            
            req.user = user;
            res.cookie('userToken', token, {
              httpOnly: true,
              secure: false, // 👉 change to true in production
              maxAge: 24 * 60 * 60 * 1000,
            }); 
            // req.user = user;
            // ✅ Handle popup window or normal redirect
            res.send(`
              <script>
                if (window.opener) {
                  window.opener.location.href = '/home'; 
                  window.close();
                } else {
                  window.location.href = '/home';
                }
              </script>
            `);
          });
        }
      )(req, res, next);
}

const googleAuthSignupCallback = async (req,res,next) => {
     passport.authenticate(
        'google-signup', // 👉 Use your strategy name here
        { failureRedirect: '/signup', failureFlash: true },
        (err, user, info) => {
          if (err) {
            console.error("Google Signup Error:", err);
            return next(err);
          }
    
          if (!user && info && info.message === "User already exists") {
            // Instead of storing in session, redirect with query parameter
            return res.redirect('/signup?error=userExists&message=A user with this email already exists. Please log in instead.');
          }
    
          if (!user) {
            // General error handling
            return res.redirect('/signup?error=signupFailed&message=' + encodeURIComponent(info ? info.message : "Google signup failed"));
          }
    
          console.log(user)
          req.login(user, async (err) => {
            if (err) {
              console.error("Session login error:", err);
              return next(err);
            }
    
            // ✅ Generate JWT token
            const token = JWT_Config.generateToken({ id: user._id });
            console.log(token)
            res.cookie('userToken', token, {
              httpOnly: true,
              secure: false, // 👉 set true in production
              maxAge: 24 * 60 * 60 * 1000,
            });
    
            // ✅ Respond for popup window or normal redirect
            res.send(`
              <script>
                if (window.opener) {
                  window.opener.location.href = '/home'; // Change route if needed
                  window.close();
                } else {
                  window.location.href = '/home';
                }
              </script> 
            `);
          });
        }
      )(req, res, next);
}
module.exports = {
  isAnyOne,
  isBlock,
  cacheController,
  googleAuthLoginCallback,
  googleAuthSignupCallback
};












