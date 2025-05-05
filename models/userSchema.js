const mongoose = require("mongoose"); // Import Mongoose

const userSchema = new mongoose.Schema({
    firstname:{
        type : String,
        required:true
    },
    lastname:{
        type : String,
        required:true
    },
    email:{
        type : String,
        required:true,
        unique : true
    },
    mobile:{
        type : Number,
        required : false,
        default : null
    },
    password:{
        type : String,
        required : false
    },
    isBlocked:{
        type : Boolean,
        required : true,
        default : false
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true 
    },
    profileImage: {
        type: String,
        default:'/images/default/vectorstock_42797445.jpg'  // <-- default image URL
    },
    createdOn: {
        type: Date,
        default: Date.now
    }
})


module.exports =  mongoose.model("User",userSchema);

