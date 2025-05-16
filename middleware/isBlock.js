const userModel = require('../models/userSchema');  

const isActive = async (req, res, next) => {
    try {
        const userId = req.user.id || req.user._id;


        const user = await userModel.findById(userId);

        

        if (user.isBlocked) {

            return res.status(403).redirect('/logout')
        }

        next(); 
    } catch (error) {
        console.error(`Error in isActive middleware: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            errorType: 'SERVER_ERROR' 
        });
    }
};

module.exports = isActive;