const userModel = require('../../models/userSchema');



const loadCustomber = async (req,res) => {

    try {
        
        const userData = await userModel.find();
        let page = req.query.page || 1; 
        let limit = 10; 
        let totalPage = Math.ceil(userData.length / limit);
        let startIndex = (page - 1) * limit;
        let endIndex = page * limit;

        let paginationData = userData.slice(startIndex, endIndex);

        res.render('Admin/userEdit',{ data: paginationData, totalPage, currentPage: parseInt(page) })
    } catch (error) {
        console.log(`errror in customerController in loadCustomber 
            Error is ${error}`);
            res.redirect("/serverError");
    }
    
}


const blockCustomber  = async (req,res) => { 
    try {
        const userId = req.query.id;
        const userBlocked = await userModel.findByIdAndUpdate(userId,{$set:{isBlocked:true}});
        if(!userBlocked){
            console.log(`Failed to Block the User`);
            return res.redirect("/serverError");
        }
        res.send({ success: true }); 

    } catch (error) {
        console.log(`errror in customerController in blockCustomber 
            Error is ${error}`);
            res.status(500).send({ success: false });
    }
}

const UnblockCustomber = async (req,res) => {
    try {
        const userId = req.query.id;
        const userUnblocked = await userModel.findByIdAndUpdate(userId,{$set:{isBlocked:false}});
        if(!userUnblocked){
            console.log(`Failed to UnBlock the User`);
            return res.redirect("/serverError");
        }
        res.send({ success: true }); 
        
    } catch (error) {
        console.log(`errror in customerController in UnblockCustomber 
            Error is ${error}`);
            res.status(500).send({ success: false });
    }
}
module.exports = {
    loadCustomber,
    blockCustomber,
    UnblockCustomber
}
