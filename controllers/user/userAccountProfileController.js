const userModal = require('../../models/userSchema');
const addressModal = require('../../models/addressSchema');
const bcrypt = require('bcryptjs');            
const nodemailer = require('nodemailer');   
const crypto = require('crypto');   
const fs = require('fs');
const path = require('path');
require('dotenv').config()


const loadAccountProfile = async (req,res) => {
    try {
        
      const userId = req.user._id ||  req.user.id;

        
        const user = await userModal.findById(userId);
        const addresses = await addressModal.find({userId}).sort({isDefault:-1})

        res.render('User/userProfile',{user,addresses})
    } catch (error) {
        console.log(`Error in userAccountController in loadAccountProfile 
            and the Error is ${error}`)
        res.render('500')
    }
}


const loadEditProfile = async (req,res) => {
    try {
      const userId = req.user._id ||  req.user.id;

        const user = await userModal.findById(userId);

        res.render('User/userEditProfile',{user});

    } catch (error) {
        console.log(`Error in userAccountController in loadEditAccountProfile 
            and the Error is ${error}`)
        res.render('500');
    }
}




const editProfile = async (req, res) => {
  try {
    const userId = req.user._id ||  req.user.id;
    
    // Extract updated profile data from request body
    const { firstname, lastname, mobile, croppedImage } = req.body;
    
    // Validate required fields
    if (!firstname || !lastname ) {
      return res.status(400).json({
        success: false,
        message: 'Fill all the fields'
      });
    }
    
    const user = await userModal.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false, 
        message: 'User not found'
      });
    }
    
    // Initialize profile path with current value
    let profilePath = user.profileImage;
    
    // Only process image if provided
    if (croppedImage && croppedImage.includes('base64')) {
      const profileImagesDir = path.join(__dirname, '../../public/profileImages');
      
      // Ensure directory exists
      if (!fs.existsSync(profileImagesDir)) {
        fs.mkdirSync(profileImagesDir, { recursive: true });
      }
      
      // Delete old image if it exists
      if (user.profileImage) {
        const oldImagePath = path.join(__dirname, '../../public', user.profileImage);
        if (fs.existsSync(oldImagePath)) {
          try {
            fs.unlinkSync(oldImagePath);
            console.log(`Deleted image: ${oldImagePath}`);
          } catch (err) {
            console.error(`Failed to delete old image: ${err.message}`);
            // Continue execution even if delete fails
          }
        }
      }
      
      try {
        // Extract image data and file type
        const matches = croppedImage.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        
        if (matches && matches.length === 3) {
          const imageType = matches[1];
          const imageData = Buffer.from(matches[2], 'base64');
          const extension = imageType.split('/')[1];
          const fileName = `${Date.now()}.${extension}`;
          const filePath = path.join(profileImagesDir, fileName);
          
          // Write file to disk
          fs.writeFileSync(filePath, imageData);
          
          // Set new profile image path
          profilePath = `/profileImages/${fileName}`;
        } else {
          console.error('Invalid image data format');
        }
      } catch (imageErr) {
        console.error(`Error processing image: ${imageErr.message}`);
        // Continue without updating profile image
      }
    } else if (req.file) {
      // Handle uploaded file
      try {
        if (user.profileImage) {
          const oldImagePath = path.join(__dirname, '../../public', user.profileImage);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        
        profilePath = `/profileImages/${req.file.filename}`;
      } catch (fileErr) {
        console.error(`Error handling uploaded file: ${fileErr.message}`);
        // Continue without updating profile image
      }
    }
    
    // Create update object
    const updateData = {
      firstname,
      lastname,
      mobile,
      updatedAt: Date.now()
    };
    
    // Only update profile image if it was successfully processed
    if (profilePath !== user.profileImage) {
      updateData.profileImage = profilePath;
    }
    
    // Update user in database
    const updatedUser = await userModal.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully'
    });
    
  } catch (error) {
    console.error(`Error in userAccountController in editProfile: ${error.message}`);
    console.error(error.stack); // Log the full stack trace for better debugging
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};


const loadChangePass = async (req,res) => {
  try {

    const userId = req.user._id ||  req.user.id;

        const user = await userModal.findById(userId);

    res.render('User/userChangePass',{user})
  } catch (error) {
    console.log(`Error in userAccountController in loadChangePass 
      and the Error is ${error}`)
      res.render('500');
  }
}
 
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,  // Your email (use env variables)
    pass: process.env.EMAIL_PASSWORD   // Your email password (use env variables)
  }
});



const changePass = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userID = req.user._id ||  req.user.id;
    const user = await userModal.findById(userID);

    // 1️⃣ Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required!" });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New password and confirm password do not match!" });
    }

    // 2️⃣ Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect!" });
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // Expires in 5 minutes
    
    // Hash the OTP before storing
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Store in session instead of directly in user model
    req.session.passwordChange = {
      hashedOtp,
      otpExpiry,
      userId: user._id,
      newPasswordHash: await bcrypt.hash(newPassword, 10)
    };

    console.log(req.session.passwordChange)
    console.log(`Change Password OTP: ${otp}`); // For development only, remove in production

    // Send OTP via email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Your OTP for Password Change',
      text: `Your OTP for password reset is: ${otp}. It will expire in 5 minutes.`
    };

    await transporter.sendMail(mailOptions);

    // Redirect to OTP verification page
    res.redirect('/verify-change-password');

  } catch (error) {
    console.error(`Error in changePass: ${error.message}`);
    res.status(500).json({ message: "Internal server error!" });
  }
};



const loadChangePassOTP = async (req, res) => {
  try {
    
    if (!req.session.passwordChange) {
      return res.redirect('/change-password');
    }
    
    const userId = req.user?._id || req.user?.id; 
    const user = await userModal.findById(userId);
    res.render('User/userChangPassOtp', {user});
  } catch (error) {
    console.log(`Error in userAccountController in loadChangePassOTP and the Error is ${error}`);
    res.render('500');
  }
}

const changePassOTPSubmit = async (req, res) => { 
  try {
    // Get the OTP from the form
    const { otp } = req.body;
    
    // Get password change data from session
    const passwordChangeData = req.session.passwordChange;

    if (!passwordChangeData) {

      return res.status(400).json({ 
        success: false, 
        message: 'No OTP request found. Please request a new one.' 
      });
    }
    
    // Check if OTP is expired
    if (new Date() > new Date(passwordChangeData.otpExpiry)) {
      // Clean up session data
      delete req.session.passwordChange;
      return res.status(400).json({ 
        success: false, 
        message: 'OTP has expired. Please request a new one.' 
      });
    }
    
    // Verify OTP using bcrypt compare
    const isOtpValid = await bcrypt.compare(otp, passwordChangeData.hashedOtp);
    if (!isOtpValid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP. Please try again.'
      });
    }
    
    // Find the user
    const user = await userModal.findById(passwordChangeData.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Update user password with the new password hash from session
    user.password = passwordChangeData.newPasswordHash;
    await user.save();
    
    // Clean up session data
    delete req.session.passwordChange;
    
    // Send confirmation email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Changed Successfully',
      text: `Your password has been changed successfully. If you did not request this change, please contact support immediately.`
    };

    await transporter.sendMail(mailOptions);
    
    // Return success response
    return res.status(200).json({ 
      success: true, 
      message: 'Password changed successfully!' 
    });
    
  } catch (error) {
    console.log(error)

    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

const resendChangePassOtp = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const user = await userModal.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Check if there's an existing password change request in session
    if (!req.session.passwordChange || !req.session.passwordChange.newPasswordHash) { 
      return res.status(400).json({ 
        success: false, 
        message: 'No password change request found. Please start again.' 
      });
    }
    
    // Generate new OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // Expires in 5 minutes
    
    // Hash the OTP before storing
    const hashedOtp = await bcrypt.hash(otp, 10);
    
    // Update session with new OTP data but keep the new password hash
    req.session.passwordChange = {
      ...req.session.passwordChange,
      hashedOtp,
      otpExpiry
    };
    
    console.log(`Resent Change Password OTP: ${otp}`); // For development only, remove in production
    
    // Send OTP via email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Your New OTP for Password Change',
      text: `Your new OTP for password change is: ${otp}. It will expire in 5 minutes.`
    };
    
    await transporter.sendMail(mailOptions);
    
    return res.status(200).json({ 
      success: true, 
      message: 'New verification code has been sent to your email' 
    });
    
  } catch (error) {
    console.error(`Error in resendChangePassOtp: ${error.message}`);
    console.error(error.stack);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to send new verification code. Please try again.' 
    });
  }
};


module.exports = {
    loadAccountProfile,
    loadEditProfile,
    editProfile,

    loadChangePass,
    changePass,


    loadChangePassOTP,
    changePassOTPSubmit,
    resendChangePassOtp
}