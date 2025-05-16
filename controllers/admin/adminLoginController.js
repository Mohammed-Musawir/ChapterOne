const JWT_Config = require('../../config/jwt')
const { render } = require('ejs')
const adminModel = require('../../models/adminSchema')
const bycript = require('bcryptjs')

const loadAdminLogin = async (req,res) => {
    try {

        if(req.cookies.adminToken){
            return res.redirect('/admin/dashboard');
        }
        res.render("Admin/adminLogin");
    } catch (error) {
        res.redirect("/page-not-found");
        console.log(`Error in Loading admin Login the 
            Error is ${error}`);
    }
}

const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required." });
        }
        
        const admin = await adminModel.findOne({ email });
        if (!admin) {
            return res.status(401).json({ error: "Invalid email or password." });
        }
        
        const isMatch = await bycript.compare(password, admin.password);
        
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password." });
        }
        
        const token = await JWT_Config.generateToken(admin.toObject(), true);
        res.cookie('adminToken', token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000
        });
        
        
        return res.status(200).json({ success: true, message: "Login successful" });
        
    } catch (error) {
        res.redirect('/serverError');
        console.log(`Error in Loading admin Login the Error is ${error}`);
    }
}

const adminLogout = async (req,res) => {
    try {
        res.clearCookie("adminToken");
        req.session.destroy();
        res.redirect('/admin/login')
    } catch (error) {
        res.redirect('/serverError')
        console.log(`Error in Logouting adminLogout the 
            Error is ${error}`)
    
    }
}
module.exports = {
    loadAdminLogin,
    adminLogin,
    adminLogout
}
