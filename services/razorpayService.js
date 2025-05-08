const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();


const razorpay = new Razorpay({
  key_id: process.env.KEY_ID,
  key_secret: process.env.KEY_SECRET
});


const razorpayService = {
   
    createOrder: async (amount, currency = 'INR', receipt = 'order_receipt', notes = {}) => {
      try {
        const options = {
          amount: amount * 100, 
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