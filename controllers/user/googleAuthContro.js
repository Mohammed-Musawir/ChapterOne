const authGoogle = async (req,res) => {
    try {
         if(req.cookies.userToken){
            return res.redirect('/home')
        }
    } catch (error) {
        console.error('Error in ',error);
        res.render('500');
    }
}

const authGoogleCallback = async (req,res) => {
    try {
        const token = JWT_Config.generateToken({ id: req.user._id });
        res.cookie('userToken', token, { httpOnly: true });
        
        
        res.send(`
          <html>
            <script>
              window.location.replace('/home');
              
            </script>
          </html>
        `);
      
    } catch (error) {
        
    }
}

module.exports = {
    authGoogle
}
