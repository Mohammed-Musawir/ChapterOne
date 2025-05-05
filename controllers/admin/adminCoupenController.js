const { isBlock } = require('../../middleware/googleChek');
const coupenModel = require('../../models/coupenSchema');


const loadCoupenPage = async (req, res) => {
    try {
      const coupons = await coupenModel.find();
  
      res.render('Admin/adminCoupen', { coupons });
    } catch (error) {
      console.log(`Error in Load Coupen Page in adminCoupenController. The error is: ${error}`);
      res.status(500).send('Internal Server Error');
    }
  };
  
const loadAddCoupen = async (req,res) => {
    try {
        res.render('Admin/adminAddCoupen')
    } catch (error) {
        
    }
}

const addCoupon = async (req,res) => {
    try {
        const { couponCode, offerPrice, minAmount, startDate, expireDate, isBlocked } = req.body;

        if ( !couponCode || !offerPrice || !minAmount || !startDate || !expireDate) {
            console.log('1')
          return res.status(500).json({ 
              success: false, 
              message: 'All fields are required' 
            });
          }

          if (offerPrice < 0) {
            return res.status(400).json({
              success: false,
              message: 'Offer price must be a positive number'
            });
          }
          
          if (minAmount < 0) {
            return res.status(400).json({
              success: false,
              message: 'Minimum amount must be a positive number'
            });
          }

          if (!/^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{3,15}$/.test(couponCode)) {
            console.log('3');
            return res.status(400).json({ 
              success: false, 
              message: 'Coupon code must be 3-15 characters long, contain only capital letters and numbers, and include at least one letter and one number.' 
            });
          }
          
          
          const existingCoupon = await coupenModel.findOne({ couponCode: couponCode });
          if (existingCoupon) {
            console.log('4')
            return res.status(500).json({ 
              success: false, 
              message: 'Coupon code already exists' 
            });
          }
          console.log(startDate)
          console.log(expireDate)
          const startDateObj = new Date(startDate);
          const expireDateObj = new Date(expireDate);
          
          if (expireDateObj <= startDateObj) {
            console.log('5')
            return res.status(500).json({ 
              success: false, 
              message: 'Expiry date must be after start date' 
            });
          }
          
          if (offerPrice <= 0) {
            console.log('6')
            return res.status(500).json({ 
              success: false, 
              message: 'Discount amount must be greater than zero' 
            });
          }

          
        const newCoupen = new coupenModel({
            couponCode,
            offerPrice,
            minAmount,
            startDate: startDateObj,
            expireDate: expireDateObj      
        });
        
        

        const savedCoupon = await newCoupen.save();

        if (!savedCoupon) {
          console.log('asdf')
            return res.status(500).json({
                success: false,
                message: 'Failed to save coupon to database'
            });
        }

        res.status(200).json({success:true,message: 'New Coupen Created SuccessFully'})
    } catch (error) {
        console.log(`Error in addCoupen in adminCoupen Controller ${error}`);
        return res.status(500).json({
            success: false, 
            message: 'Failed to create coupon'
          });
    }
}

const coupenUpdateStatus = async (req,res) => {
  try {
    const couponId = req.params.couponId;

    const coupon = await coupenModel.findById(couponId);

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }
    
    coupon.isBlocked = !coupon.isBlocked;
    await coupon.save();

    res.json({ success: true, message: "Coupon status updated", coupon });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

const loadEditCoupon = async (req,res) => {
  try {
    const couponId = req.params.couponId;

    const coupon = await coupenModel.findById(couponId);

    if(!coupon) {
      res.redirect('/admin/coupon');
    }
    res.render('Admin/adminEditCoupen',{ coupon })
  } catch (error) {
    console.log(error)
  }
} 

const editCoupon = async (req, res) => {
  try {
    const {
      couponId,
      couponCode,
      offerPrice,
      minAmount,
      startDate,
      expireDate
    } = req.body;


    if (!couponId || !couponCode || !offerPrice || !minAmount || !startDate || !expireDate) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (!/^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{3,15}$/.test(couponCode)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Coupon code must be 3-15 characters long, contain only capital letters and numbers, and include at least one letter and one number.' 
      });
    }
    

    if (isNaN(offerPrice) || isNaN(minAmount)) {
      return res.status(400).json({ success: false, message: 'Offer Price and Minimum Amount must be numbers' });
    }


    if (new Date(startDate) >= new Date(expireDate)) {
      return res.status(400).json({ success: false, message: 'Expire date must be after the start date' });
    }


    const existingCoupon = await coupenModel.findOne({
      couponCode: couponCode,
      _id: { $ne: couponId } 
    });

    if (existingCoupon) {
      return res.status(400).json({ success: false, message: 'Coupon code already exists' });
    }


    const updatedCoupon = await coupenModel.findByIdAndUpdate(
      couponId,
      {
        couponCode,
        offerPrice,
        minAmount,
        startDate,
        expireDate
      },
      { new: true }
    );

    if (!updatedCoupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    res.status(200).json({ success: true, message: 'Coupon updated successfully', updatedCoupon });
  } catch (error) {
    console.error('Error updating coupon:', error);
    res.status(500).json({ success: false, message: 'Server error while updating coupon' });
  }
};


module.exports = {
    loadCoupenPage,

    loadAddCoupen,
    addCoupon,

    coupenUpdateStatus,

    loadEditCoupon,
    editCoupon
}