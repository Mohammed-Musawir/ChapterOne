const productModal = require('../../models/productSchema');
const categoryModal = require('../../models/categorySchema');
const offerModal = require('../../models/offerSchema');

const loadProductPage = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Fetch the product with its category
        const product = await productModal.findById(id).populate('category_id');
        
        // Fetch related products in the same category
        const relatedProducts = await productModal.find({
            category_id: product.category_id._id,
            _id: { $ne: product._id }
        });
        
        // Check for product-specific offer
        const productOffer = await offerModal.findOne({
            offerType: 'product',
            product: product._id,
            isActive: true,
            endDate: { $gt: new Date() }
        });
        
        // Check for category offer
        const categoryOffer = await offerModal.findOne({
            offerType: 'category',
            category: product.category_id._id,
            isActive: true,
            endDate: { $gt: new Date() }
        });
        
        // Determine which offer gives a better discount
        let discountPercentage = 0;
        
        // Set the offer property on the product for frontend display
        // This will be used in the offer banner section
        if (productOffer && categoryOffer) {
            // If both offers exist, use the one with higher discount
            if (productOffer.discountPercentage >= categoryOffer.discountPercentage) {
                product.offer = {
                    name: productOffer.name,
                    description: productOffer.description,
                    endDate: productOffer.endDate
                };
                discountPercentage = productOffer.discountPercentage;
            } else {
                product.offer = {
                    name: categoryOffer.name,
                    description: categoryOffer.description,
                    endDate: categoryOffer.endDate
                };
                discountPercentage = categoryOffer.discountPercentage;
            }
        } else if (productOffer) {
            product.offer = {
                name: productOffer.name,
                description: productOffer.description,
                endDate: productOffer.endDate
            };
            discountPercentage = productOffer.discountPercentage;
        } else if (categoryOffer) {
            product.offer = {
                name: categoryOffer.name,
                description: categoryOffer.description,
                endDate: categoryOffer.endDate
            };
            discountPercentage = categoryOffer.discountPercentage;
        }
        
        // Calculate discounted price if any offer exists
        if (discountPercentage > 0) {
            // Set discount percentage and calculate sale price
            product.discount = discountPercentage;
            product.salePrice = Math.round(product.regularPrice - (product.regularPrice * discountPercentage / 100));
        } else {
            // If no offer, ensure salePrice has a valid value (use regularPrice if salePrice is 0)
            product.discount = 0;
            if (product.salePrice === 0) {
                product.salePrice = product.regularPrice;
            }
        }
        
        // Also get offers for related products
        const relatedProductsWithOffers = await Promise.all(relatedProducts.map(async (relatedProduct) => {
            const prodOffer = await offerModal.findOne({
                offerType: 'product',
                product: relatedProduct._id,
                isActive: true,
                endDate: { $gt: new Date() }
            });
            
            const catOffer = categoryOffer; // We already fetched the category offer
            
            let relatedDiscountPercentage = 0;
            
            if (prodOffer && catOffer) {
                relatedDiscountPercentage = Math.max(prodOffer.discountPercentage, catOffer.discountPercentage);
                // Set the offer data for display
                if (prodOffer.discountPercentage >= catOffer.discountPercentage) {
                    relatedProduct.offer = {
                        name: prodOffer.name, 
                        description: prodOffer.description,
                        endDate: prodOffer.endDate
                    };
                } else {
                    relatedProduct.offer = {
                        name: catOffer.name,
                        description: catOffer.description,
                        endDate: catOffer.endDate
                    };
                }
            } else if (prodOffer) {
                relatedDiscountPercentage = prodOffer.discountPercentage;
                relatedProduct.offer = {
                    name: prodOffer.name,
                    description: prodOffer.description,
                    endDate: prodOffer.endDate
                };
            } else if (catOffer) {
                relatedDiscountPercentage = catOffer.discountPercentage;
                relatedProduct.offer = {
                    name: catOffer.name,
                    description: catOffer.description,
                    endDate: catOffer.endDate
                };
            }
            
            // Set discount properties on the related product
            relatedProduct.discount = relatedDiscountPercentage;
            if (relatedDiscountPercentage > 0) {
                relatedProduct.salePrice = Math.round(relatedProduct.regularPrice - (relatedProduct.regularPrice * relatedDiscountPercentage / 100));
            } else if (relatedProduct.salePrice === 0) {
                relatedProduct.salePrice = relatedProduct.regularPrice;
            }
            
            return relatedProduct;
        }));
        
        // Send all data to frontend
        res.render('User/userProductPage', {
            product,
            relatedProducts: relatedProductsWithOffers
        });
        
    } catch (error) {
        console.log(`Error in Load ProductPage in ProductPageController: ${error}`);
        res.render('500');
    }
};

module.exports = {
    loadProductPage
};