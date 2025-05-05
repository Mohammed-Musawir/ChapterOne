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
        
        // Return HTML with script to replace history state instead of redirect
        res.send(`
          <html>
            <script>
              window.location.replace('/home');
              // This replaces the current history entry instead of adding a new one
            </script>
          </html>
        `);
      
    } catch (error) {
        
    }
}

module.exports = {
    authGoogle
}