const userModal = require('../../models/userSchema');
const walletModal = require('../../models/walletSchema'); 
const  addTransaction   = require('../../services/transactionService');


const loadRefferal = async (req,res) => {
    try {
        
        const userId = req.user._id || req.user.id;

        const user = await userModal.findById(userId);

        res.render('User/referalPage',{
            user: user,
            message: req.flash('message'),
            title: 'Refer & Earn'
        })
    } catch (error) {
        console.error('Error loading referral page:', error);
        req.flash('error', 'Error loading referral page');
        res.redirect('/account');
    }
}

const applyReferral = async (req,res) => {
    try {
        const { referralCode } = req.body;


        const userId = req.user._id || req.user.id;

        const user = await userModal.findById(userId);

        if (user.hasAppliedReferral) {
            return res.status(400).json({
                success: false,
                message: "You have already used a referral code"
            });
        }

        const referrer = await userModal.findOne({ referralCode });
        
        if (!referrer) {
            return res.status(404).json({
                success: false,
                message: "Invalid referral code"
            });
        }

        if (referrer._id.toString() === userId.toString()) {
            return res.status(400).json({
                success: false,
                message: "You cannot use your own referral code"
            });
        }

        user.hasAppliedReferral = true;
        user.hasAppliedReferralCode = referralCode;
        await user.save();

        // await addTransaction(user._id, type = 'Credit',amount =  100, description) = 'Referral Bonus');
        
        await addTransaction(userId, 'Credit', 100, 'Referral Bonus');
        await addTransaction(referrer._id, 'Credit', 100, 'Referral Reward - Friend Joined');

        res.status(200).json({
            success: true,
            message: "Referral applied successfully"
        });

    } catch (error) {
        console.error("Error applying referral:", error);
        res.status(500).json({
            success: false,
            message: "Failed to apply referral",
            error: error.message
        });
    }
}


module.exports = {
    loadRefferal,
    applyReferral
}