const { default: mongoose } = require("mongoose");

const categorySchema = mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique:true,   
    },
    description:{   
        type:String,
        required:true,
    },
    isListed: {
        type : Boolean,
        default : true
    },
    createdAt: {
        type: Date,
        default: Date.now }
})

module.exports = mongoose.model('Category',categorySchema);