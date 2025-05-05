const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.KEY_ID,
  key_secret: process.env.KEY_SECRET
});


const razorpayService = {
    // Create a new Razorpay order
    createOrder: async (amount, currency = 'INR', receipt = 'order_receipt', notes = {}) => {
      try {
        const options = {
          amount: amount * 100, // Razorpay expects amount in paise
          currency,
          receipt,
          notes
        };
        
        const order = await razorpay.orders.create(options);
        return { success: true, order };
      } catch (error) {
        console.error('Razorpay create order error:', error);
        return { success: false, message: error.message };
      }
    },
      // Verify Razorpay payment signature
  verifyPaymentSignature: (orderId, paymentId, signature) => {
    try {
      const payload = orderId + '|' + paymentId;
      const generatedSignature = crypto
        .createHmac('sha256', process.env.KEY_SECRET)
        .update(payload)
        .digest('hex');
      
      return generatedSignature === signature;
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }
};


module.exports = razorpayService;