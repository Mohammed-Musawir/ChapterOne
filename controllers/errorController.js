const userload500 = async (req,res) => {
    try {
        res.render('500');
    } catch (error) {
        console.log(`Error in loadin 500 page in error controller`);
    }
}
const userload404 = async (req,res) => {
    try {
        res.render('User/404');
    } catch (error) {
        console.log(`Error in loadin 404 page in error controller`);
    }
}

const adminload500 = async (req,res) => {
    try {
        res.render('500');
    } catch (error) {
        console.log(`Error in loadin 500 page in error controller`);
    }
}


const adminload404 = async (req,res) => {
    try {
        res.render('404');
    } catch (error) {
        console.log(`Error in loadin 404 page in error controller`);
    }
}


module.exports = {
    userload500,
    userload404,
    adminload404,
    adminload500
}