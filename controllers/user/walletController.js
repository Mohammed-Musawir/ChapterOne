const walletModal = require('../../models/walletSchema');
const userModal = require('../../models/userSchema');
const mongoose = require('mongoose')

const loadWalletPage = async (req,res) => {
    try {
        const userID = req.user._id ||  req.user.id;

        const user = await userModal.findById(userID)
        const userWallet = await walletModal.findOne({userId:userID})

        const transactions = []

        res.render('User/userWalletPage',{user,transactions,userWallet});
    } catch (error) {
        console.log(`Error in LoadWalletPage in wallet controller the error is ${error}`)
    }
}

module.exports = {
    loadWalletPage
}