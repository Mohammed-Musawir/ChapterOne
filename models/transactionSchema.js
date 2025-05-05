const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['Credit', 'Debit'], 
        required: true
    },
    amount: {
        type: Number,
        required: true 
    },
    description: {
        type: String,
        enum: ['Order Payment', 'Order Refund', 'Order Cancellation', 'Referral Bonus','Referral Reward - Friend Joined'],
        required: true
    }
},{ timestamps: true });

module.exports = mongoose.model("Transaction", transactionSchema);