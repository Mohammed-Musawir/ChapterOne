const JWT_Config = require('../config/jwt');
// const {verifyToken} = require('../config/jwt')

const isAuthenticated = async (req,res,next) => {
    try {

         

        const token = 
        req.headers.authorization?.split(' ')[1] || 
        req.cookies?.adminToken || 
        req.query?.token;

        if(!token){
            return res.redirect('/admin/login')
        }

        const decoded = await JWT_Config.verifyToken(token ,true);

        if(!decoded){
            console.log(`error when decording JWT token in authentication middelware`)
            return res.redirect('/serverError')
        }
        req.admin = decoded;
        next();

    } catch (error) {
        console.error("❌ JWT Authentication Error:", error.message)
        return res.redirect('/admin/login');
    }
}

module.exports = { isAuthenticated }