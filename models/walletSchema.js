const { default: mongoose } = require("mongoose")

const walletSchema = new mongoose.Schema({
    amount: {
        type: Number
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }
}, { timestamps: true });

module.exports = mongoose.model("Wallet", walletSchema); 