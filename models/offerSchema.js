const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    name: {type: String,required: true,trim: true},
    offerType: {type: String,enum: ['product', 'category'],required: true}, 
    discountPercentage: {
        type: Number,
        required: true,
        min: 1,
        max: 100
    },
    product: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product'
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    endDate: {
        type: Date,
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.model('Offer', offerSchema);
