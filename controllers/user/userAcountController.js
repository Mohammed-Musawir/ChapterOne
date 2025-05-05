const userModal = require('../../models/userSchema');
const walletModal = require('../../models/walletSchema');
const wishlistModel = require('../../models/wishlistSchema');
const orderModal = require('../../models/orderSchema');


const loadAccountPage = async (req,res) => {
    try {
        // console.log(req.user)
        const userID = req.user._id ||  req.user.id;
        

        const user = await userModal.findById(userID);
        const userWallet = await walletModal.findOne({userId:userID});

        const recentOrders = await orderModal.find({userId:userID});
        const latestOrder = await orderModal.findOne({userId:userID}).sort({createdAt : -1}).limit(1);
        const wishlist = await wishlistModel.findOne({userId:userID});

        

        res.render('User/userAccount',{user,userWallet,recentOrders,latestOrder,wishlist })
    } catch (error) {
        console.log(`Error in userAccountController in Load AccountPage 
            and the Error is ${error}`)
        res.render('500')
    }
}



module.exports = {
    loadAccountPage
}