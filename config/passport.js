require('dotenv').config();
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userSchema"); 

passport.serializeUser((user, done) => {
  done(null, user.id);
});


passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(
  "google-signup",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_SIGNUP_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
       
        let existingUser = await User.findOne({ email: profile.emails[0].value });

        if (existingUser) {
          if (!existingUser.googleId) {
            existingUser = await User.findOneAndUpdate(
              { email: profile.emails[0].value },
              {
                $set: {
                  googleId: profile.id,
                  avatar: profile.photos[0].value,
                  firstname: profile.name.givenName,
                  lastname: profile.name.familyName,
                  is_verified: true,  
                },
              },
              { new: true }
            );
            return done(null, existingUser);
          } else {
            
            return done(null, false, { message: "User already exists. Please log in." });
          }
        } else {
          const newUser = new User({
            googleId: profile.id,
            firstname: profile.name.givenName,
            lastname: profile.name.familyName,
            avatar: profile.photos[0].value,
            email: profile.emails[0].value,
            is_verified: true,
          });

          await newUser.save();
          return done(null, newUser);
        }
      } catch (err) {
        console.error("Google signup error:", err);
        return done(err, null);
      }
    }
  )
);

passport.use(
  "google-login",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_LOGIN_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let existingUser = await User.findOne({
          googleId: profile.id,
          isBlocked: false,
        });

        if (existingUser) {
          return done(null, existingUser); 
        }

       
        existingUser = await User.findOne({
          email: profile.emails[0].value,
          isBlocked: false,
        });

        if (existingUser) {
          
          existingUser.googleId = profile.id;
          existingUser.avatar = profile.photos[0].value;
          await existingUser.save();
          return done(null, existingUser);
        }

        
        return done(null, false, {
          message: "User does not exist or is blocked. Please sign up.",
        });
      } catch (error) {
        console.error("Google login error:", error);
        done(error);
      }
    }
  )
);

