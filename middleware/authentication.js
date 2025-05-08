
const JWT_Config = require('../config/jwt');

const isAuthenticated = async (req,res,next) => {
    try {

        if (req.originalUrl.startsWith('/admin')) {
            return next();
        }
        
        const token = req.cookies?.userToken 

        

        if(!token){
            return res.redirect('/login')
        }

       
        const decoded = await JWT_Config.verifyToken(token);
        

        if (decoded === "expired") {
            console.log("🔄 Token Expired: Redirecting to login or refreshing token...");
            return res.redirect('/login'); 
        }
        
        if (!decoded) {
            console.log("❌ JWT Decoding Failed.");
            return res.render('500');
        }
        
        req.user = decoded;
       
        
        
       
        next();

    } catch (error) {
        console.error("❌ JWT Authentication Error:", error.message)
        return res.redirect('/login');
    }
}




module.exports = { isAuthenticated }