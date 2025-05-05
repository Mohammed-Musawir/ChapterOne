const mongoose = require('mongoose');

const coupenSchema = new mongoose.Schema({ 
 couponCode: { type: String, required: true },
  offerPrice: { type: Number, required: true },
  minAmount: { type: Number, required: true },
  startDate: { type: Date, default: Date.now, required: true },
  expireDate: { type: Date, required: true }, 
  isBlocked: { type: Boolean, default: false },
  usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  user: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]  
  
})

module.exports = mongoose.model("Coupen",coupenSchema);