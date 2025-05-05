const categoryModal = require('../../models/categorySchema');
const offerModal = require('../../models/offerSchema');
const productModal = require('../../models/productSchema');


const applyCategoryOffer = async (req, res) => {
    try {
        const { name, offerType, discountPercentage, category, endDate, description, isActive } = req.body;
        
        const categoryId = category;
        
        const categoryExists = await categoryModal.findById(categoryId);
        if (!categoryExists) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }
        
        
        const existingOffer = await offerModal.findOne({
            category: categoryId,
            isActive: true,
            endDate: { $gt: new Date() }
        });
        
        if (existingOffer) {
            return res.status(400).json({
                success: false,
                message: 'An active offer already exists for this category'
            });
        }
        

        if (discountPercentage < 1 || discountPercentage > 100) {
            return res.status(400).json({
                success: false,
                message: 'Discount percentage must be between 1 and 100'
            });
        }
        

        const currentDate = new Date();
        if (new Date(endDate) <= currentDate) {
            return res.status(400).json({
                success: false,
                message: 'End date must be in the future'
            });
        }
        

        const newOffer = new offerModal({
            name,
            offerType: offerType || 'category', 
            discountPercentage,
            category: categoryId,
            endDate,
            description,
            isActive: isActive !== undefined ? isActive : true
        });
        
        await newOffer.save();
        
        return res.status(201).json({
            success: true,
            message: 'Category offer created successfully',
            offer: newOffer
        });
        
    } catch (error) {
        console.error('Error in applyCategoryOffer:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

const removeCategoryOffer = async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        
        if (!categoryId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Category ID is required' 
            });
        }
        
        const categoryExists = await categoryModal.findById(categoryId);
        if (!categoryExists) {
            return res.status(404).json({ 
                success: false, 
                message: 'Category not found' 
            });
        }
        
        const result = await offerModal.deleteMany({ 
            offerType: 'category', 
            category: categoryId 
        });
        
        res.status(200).json({ 
            success: true,
            message: `Successfully removed ${result.deletedCount} offers associated with this category`,
            deletedCount: result.deletedCount
        });
        
    } catch (error) {
        console.error('Error removing category offers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove category offers',
            error: error.message
        });
    }
};

const categoryOfferStatus = async (req, res) => {
    try {
        const { offerId, categoryId, isActive } = req.body;
        
        if (!offerId || !categoryId || isActive === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: offerId, categoryId, or isActive'
            });
        }


        const offer = await offerModal.findOne({
            _id: offerId,
            offerType: 'category',
            category: categoryId
        });

        if (!offer) {
            return res.status(404).json({
                success: false,
                message: 'Category offer not found'
            });
        }

        offer.isActive = isActive;
        await offer.save();

        return res.status(200).json({
            success: true,
            message: `Category offer ${isActive ? 'activated' : 'deactivated'} successfully`,
            offer
        });
    } catch (error) {
        console.error('Error updating category offer status:', error);
        return res.status(500).json({
            success: false,
            message: 'Error updating category offer status',
            error: error.message
        });
    }
};


const applyProductOffer = async (req, res) => {
    try {
        const { productId, offerType, offerName, discountPercentage, endDate, description } = req.body;
        
        // Validate required fields
        if (!productId || !offerType || !offerName || !discountPercentage || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Validate offerType is 'product'
        if (offerType !== 'product') {
            return res.status(400).json({
                success: false,
                message: 'Offer type must be "product" for product offers'
            });
        }

        // Validate discount percentage
        if (discountPercentage < 1 || discountPercentage > 100) {
            return res.status(400).json({
                success: false,
                message: 'Discount percentage must be between 1 and 100'
            });
        }

        // Check if product exists
        const product = await productModal.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check if product already has an active offer
        const existingOffer = await offerModal.findOne({
            product: productId,
            isActive: true,
            endDate: { $gt: new Date() }
        });

        if (existingOffer) {
            return res.status(400).json({
                success: false,
                message: 'Product already has an active offer',
                offer: existingOffer
            });
        }

        // Create new offer
        const newOffer = await offerModal.create({
            name: offerName,
            offerType,
            discountPercentage,
            product: productId,
            endDate: new Date(endDate),
            description: description || `${discountPercentage}% off on this product`,
            isActive: true
        });

        return res.status(201).json({
            success: true,
            message: 'Offer applied to product successfully',
            offer: newOffer
        });

    } catch (error) {
        console.error('Error applying product offer:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

const removeProductOffer = async (req, res) => {
    try {
        const productId = req.params.productId;
        
        const isExistProduct = await productModal.findById(productId);
        
        if(!isExistProduct) {
            return res.status(404).json({
                success: false,
                message: 'Product not Found'
            });
        }
        
        const result = await offerModal.deleteMany({
            offerType: 'product',
            product: productId
        });
        
        res.status(200).json({
            success: true,
            message: `Successfully removed ${result.deletedCount} offers associated with this product`,
            deletedCount: result.deletedCount
        });
            
    } catch (error) {
        console.error('Error removing product offers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove product offers',
            error: error.message
        });
    }
}

const productOfferStatus = async (req, res) => {
    try {
        const offerId = req.params.offerId;
        const { isActive, productId } = req.body;
        
        if (!offerId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid offer ID format'
            });
        }
        
        const updatedOffer = await offerModal.findByIdAndUpdate(
            offerId,
            { isActive },
            { new: true }
        );
        
        if (!updatedOffer) {
            return res.status(404).json({
                success: false,
                message: 'Offer not found'
            });
        }
        
        return res.status(200).json({
            success: true,
            message: `Offer ${isActive ? 'activated' : 'deactivated'} successfully`,
            data: updatedOffer
        });

    } catch (error) {
        console.error('Error updating offer status:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update offer status',
            error: error.message
        });
    }
};


module.exports = {
    applyCategoryOffer,
    removeCategoryOffer,
    categoryOfferStatus,


    applyProductOffer,
    removeProductOffer,
    productOfferStatus


}