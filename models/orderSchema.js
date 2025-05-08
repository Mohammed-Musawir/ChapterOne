const mongoose = require('mongoose');

const generateOrderId = () => {
  const prefix = 'CO';
  const timestamp = Date.now().toString(36).toUpperCase();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${timestamp}-${randomPart}`;
};

const generateTxnId = () => {
  return `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
  orderId: { type: String, default: generateOrderId, unique: true },
  products: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    productDetails: {
      name: { type: String, required: true },
      writer: { type: String, required: true },
      salePrice: { type: Number, required: true },
      productImages: { type: [String], required: true },
      discoundedPrice: { type: Number }
    },
    quantity: { type: Number, required: true, min: 1 }, 
    price: { type: Number, required: true, min: 0 },
    productOrderStatus: { 
      type: String, 
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'], 
      default: 'pending' 
    }, 
    productOrderReturned: {
      reason: { type: String },
      returnedAt: { type: Date }
    },
    productOrderCancellation: {
      reason: { type: String },
      cancelledAt: { type: Date }
    }
  }], 
  shippingAddress: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fullName: { type: String, required: true, trim: true },
    alternative_no: { 
      type: String,  
      required: true, 
      match: [/^[6-9]\d{9}$/, "Please enter a valid Indian mobile number"] 
    },
    houseNumber: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    landmark: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { 
      type: String, 
      required: true, 
      match: [/^\d{6}$/, "Please enter a valid 6-digit pincode"] 
    },
    addressType: { type: String, enum: ["Home", "Work", "Other"], default: "Home" }
  },
  subtotal: { type: Number, required: true },
  shippingCost: { type: Number, required: true, default: 60 },
  totalAmount: { type: Number, required: true },
  paymentMethod: { 
    type: String, 
    enum: ['cod', 'razorPay', 'wallet'],  
    required: true 
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'cancelled'], 
    default: 'pending' 
  },
  paymentError: { type: String, default: null },
  orderStatus: { 
    type: String, 
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'], 
    default: 'pending' 
  },
  transactionId: { type: String, default: generateTxnId },
  orderedDate: { type: Date, default: Date.now },
  orderReturned: {
    reason: { type: String },
    returnedAt: { type: Date }
  },
  orderCancellation: {
    reason: { type: String },
    cancelledAt: { type: Date }
  },
  gstRate: { type: Number, default: 18 },
  gstAmount: { type: Number },
  coupon: {
    couponCode: { type: String },
    discount: { type: Number }
  },
  razorpayPaymentId: {
    type: String
},
razorpayOrderId: {
    type: String
},
razorpaySignature: {
    type: String
},
}, { timestamps: true }); 

module.exports = mongoose.model('Order', orderSchema);