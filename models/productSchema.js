const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    publishedDate: { 
        type: Date,
        required: false,
    },
    writer: {
        type: String,
        required: false,
    },
    category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
    },
    language: {
        type: String,
        enum: ['English', 'Malayalam', 'Hindi', 'Tamil'],
        required: false,
    },
    regularPrice: {
        type: Number,
        required: true,
    },
    salePrice: { 
        type: Number,
        default: 0,
    },
    description: {
        type: String,
        required: true,
    },
    availableQuantity: {
        type: Number,
        default: 0,
    },
    productImages: {
        type: [String],
        required: true,
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt:{
        type:Date,
        default:Date.now
    }
}, { timestamps: true })

module.exports = mongoose.model('Product',productSchema)
