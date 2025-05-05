const express = require('express');
const app = express();
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const path = require('path');
const session = require("express-session");
const nocache = require('nocache');
const ejs = require("ejs");
const MongoStore = require("connect-mongo");
const passport = require('passport');
require('./config/passport');
app.locals.companyName = 'ChapterOne'
const cookieParser = require('cookie-parser');

  

const dotenv = require('dotenv'); //This line of code loads environment variables from your .env file into process.env in a Node.js application.
const { connect } = require('http2');
const connectDB = require('./config/db');
dotenv.config();                 
                

app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(cookieParser());

app.use(nocache());
app.use(session({
    secret:process.env.SECRET_KEY,
    resave:false,//need to study
    saveUninitialized:false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions'
    }),
    cookie: {
        httpOnly : true // Prevents client-side JS access to the cookie
    }
}))

app.use(passport.initialize());
app.use(passport.session());

app.use('/',userRoutes);
app.use('/admin',adminRoutes); 



app.set("views",path.join(__dirname,"views"));
app.set('view engine','ejs');
app.use(express.static('public'));

const PORT = process.env.PORT || 3000; 

connectDB();

app.listen(PORT,()=>{
    console.log(`Server is Running at http://localhost:${PORT}`)
})












