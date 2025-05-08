const cartModel = require('../../models/cartSchema');
const productModal = require('../../models/productSchema');
const wishlistModel = require('../../models/wishlistSchema'); 
const offerModel = require('../../models/offerSchema'); 

const loadCart = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const cart = await cartModel.findOne({ userId }).populate('books.product');
        const wishlist = await wishlistModel.findOne({ userId });
        
        
        const activeOffers = await offerModel.find({ 
            isActive: true, 
            endDate: { $gt: new Date() } 
        });
        
        
        const productOffers = new Map();
        const categoryOffers = new Map();
        
        activeOffers.forEach(offer => {
            if (offer.offerType === 'product' && offer.product) {
                productOffers.set(offer.product.toString(), offer);
            } else if (offer.offerType === 'category' && offer.category) {
                categoryOffers.set(offer.category.toString(), offer);
            }
        });

        
        const cartProductIds = cart?.books.map(item => item.product._id.toString()) || [];
        
        const wishlistProductIds = wishlist?.books && Array.isArray(wishlist.books) 
            ? wishlist.books
                .filter(item => item.product) 
                .map(item => typeof item.product === 'object' ? item.product._id.toString() : item.product.toString()) 
            : [];
        
        const excludingProductIds = [...new Set([...cartProductIds, ...wishlistProductIds])];
        
        
        let recommendedBooks = [];
        if (excludingProductIds.length === 0) {
            recommendedBooks = await productModal.find().limit(4);
        } else {
            recommendedBooks = await productModal.find({
                _id: { $nin: excludingProductIds.filter(id => id && id.length === 24) }
            }).limit(4);
        }
    
        const applyBestOffer = (product) => {
            
            const productObj = typeof product.toObject === 'function' ? product.toObject() : JSON.parse(JSON.stringify(product));
            const productId = productObj._id.toString();
            const categoryId = productObj.category_id ? productObj.category_id.toString() : null;

            
            const productOffer = productOffers.get(productId);
            const categoryOffer = categoryId ? categoryOffers.get(categoryId) : null;
            
            
            let bestOffer = null;
            let offerSource = null;

            if (productOffer && categoryOffer) {
                if (productOffer.discountPercentage >= categoryOffer.discountPercentage) {
                    bestOffer = productOffer;
                    offerSource = 'product';
                } else {
                    bestOffer = categoryOffer;
                    offerSource = 'category';
                }
            } else if (productOffer) {
                bestOffer = productOffer;
                offerSource = 'product';
            } else if (categoryOffer) {
                bestOffer = categoryOffer;
                offerSource = 'category';
            }
            
            
            if (bestOffer) {
                const originalPrice = productObj.salePrice;
                const discountAmount = Math.round((originalPrice * bestOffer.discountPercentage) / 100);
                const discountedPrice = originalPrice - discountAmount;
                
                return {
                    ...productObj,
                    hasOffer: true,
                    offerPercentage: bestOffer.discountPercentage,
                    offerType: bestOffer.offerType,
                    offerName: bestOffer.name,
                    offerSource: offerSource,
                    discountedAfterOffer: discountedPrice
                };
            } else {
                
                return {
                    ...productObj,
                    hasOffer: false
                };
            }
        };

        
        recommendedBooks = recommendedBooks.map(product => applyBestOffer(product));
        
        
        let subtotal = 0;
        
        if (cart && cart.books && cart.books.length > 0) {
            
            const updatedBooks = [];
            
            for (let i = 0; i < cart.books.length; i++) {
                const item = cart.books[i];
                const product = item.product;
                
                if (!product) continue;
                
                const productWithOffer = applyBestOffer(product);
               
                
                const updatedItem = {
                    product: productWithOffer,
                    quantity: item.quantity
                };

                
                let price = 0
                if(productWithOffer.discountedAfterOffer){
                    price += productWithOffer.discountedAfterOffer
                }else{
                    price += productWithOffer.salePrice 
                }
                
                subtotal += price * item.quantity;
                
                updatedBooks.push(updatedItem);
            }

           
            
            cart.books = updatedBooks;

           
        }
        
        const totalProductPrice = subtotal;
        let shippingCost = totalProductPrice > 1000 ? 0 : 60;
        const gstAmount = Math.round((totalProductPrice + shippingCost) * 0.18);
        
        
        if (cart?.books?.length > 0) {
            console.log('Sample cart item with offer data:', 
                        JSON.stringify({
                            hasOffer: cart.books[0].product.hasOffer,
                            offerPercentage: cart.books[0].product.offerPercentage,
                            offerSource: cart.books[0].product.offerSource
                        }));
        }
        

        res.render('User/cartPage', { 
            cart, 
            totalProductPrice, 
            shippingCost, 
            gstAmount, 
            recommendedBooks
        });
    } catch (error) {
        console.error('Error loading cart:', error);
        return res.status(500).render('500');
    }
};

const addToCart = async (req, res) => {
    try {
        const { bookId, quantity = 1 } = req.body;
        const userId = req.user._id || req.user.id;

        
        if (!bookId) {
            return res.status(400).json({
                success: false,
                message: 'Book ID is required'
            });
        }

        if (quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be greater than zero'
            });
        }

        const product = await productModal.findById(bookId);

        if(!product){
            return res.status(404).json({success:false,message:'Book not Found'});
        }

        if(product.availableQuantity < quantity){
            return res.status(404).json({success:false,message:'Insufficient stock available'});
        }

                
        let cart = await cartModel.findOne({ userId });

        if(!cart) {
            cart = new cartModel({
                userId,
                books: [{ product: bookId, quantity}]
            })
        } else {

            const existingBook = cart.books.find(
                (item) => item.product.toString() === bookId
              );
    
              if (quantity > 10 || (existingBook && existingBook.quantity >= 10)) {
                return res.status(400).json({
                  success: false,
                  message: 'Quantity Limit is reached',
                });
              }

            const bookIndex = cart.books.findIndex(
                (item) => item.product.toString() === bookId
            );

            if(bookIndex > -1) {
                cart.books[bookIndex].quantity += quantity;
            } else {
                cart.books.push({ product: bookId, quantity});
            }
        }

        await cart.save();

        const wishlistResult = await wishlistModel.updateOne(
            {userId},
            {$pull:{books:{product:bookId}}}
        )

        if(!wishlistResult){
            console.log('Didnt removed from wishlist in userCartController in addCart');
            return res.status(400).json({
                success: false,
                message: 'Didnt removed from wishlist'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Item added to cart successfully',
            cart
        });

    } catch (error) {
        console.log('Error adding cart:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add item to cart'
        });
    }
};

const updateCart = async (req, res) => {
    try {
        
        const { productId, quantity } = req.body;

        
        if (!productId) {
            return res.status(400).json({
                success: false,
                message: 'Product ID is required'
            });
        }

        if (!quantity || quantity < 1 || quantity > 10) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be between 1 and 10'
            });
        }

        
        const userId = req.user._id || req.user.id;

        
        let cart = await cartModel.findOne({ userId });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        
        const bookIndex = cart.books.findIndex(item =>
            item.product.toString() === productId
        );

        if (bookIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Product not found in cart'
            });
        }

        
        const product = await productModal.findById(productId);

        if (!product) {
            return res.status(404).json({ 
                success: false,
                message: 'Product not found'
            });
        }

         
         cart.books[bookIndex].quantity = quantity;

         await cart.save();
 
         let totalPrice = 0;
         for (let item of cart.books) {
             const prod = await productModal.findById(item.product);
             if (prod) {
                 totalPrice += prod.salePrice * item.quantity;
             }
         }
        

        
        return res.status(200).json({
            success: true,
            message: 'Cart updated successfully',
            cart: cart,
            itemPrice: product.salePrice,
            totalPrice
        });

    } catch (error) {
        console.log('Error updating cart:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update cart',
            error: error.message
        });
    }
};

const removeItemFromCart = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const { bookId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User Didnt exists"
            });
        }

        if (!bookId) {
            return res.status(400).json({
                success: false,
                message: "Book ID is required"
            });
        }

        
        const updatedCart = await cartModel.findOneAndUpdate(
            { userId },
            { $pull: { books: { product: bookId } } },
            { new: true }
        );

        if (!updatedCart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found or item not in cart"
            });
        }

        res.status(200).json({
            success: true,
            message: "Item removed from cart successfully",
            cart: updatedCart
        });
    } catch (error) {
        console.error('Error removing item from cart:', error);
        res.status(500).json({
            success: false,
            message: "Failed to remove item from cart"
        });
    }
};


const checkStock = async (req,res) => {
    try {
        
        const { bookId, quantity } = req.body;
        if (!bookId || quantity === undefined || isNaN(quantity) || quantity < 1) {
            console.log(`bookid or quantity not found `);
            return res.status(400).json({
                success: false,
                message: 'Book ID and quantity are required'
            });
        }
        const product = await productModal.findById(bookId);
        if (!product) {
            console.log(`product is not there in checkstatus is userCartController`)
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        } 
        let requestedQuantity = quantity;
        let stock = product.availableQuantity;
        if(stock < requestedQuantity){
            console.log('error here')
            return res.status(400).json({
                success:false,
                message:`Insuffient stock`,
                available: false
            })
        }
        return res.status(200).json({
            success:true,
            message: 'Stock is available',
            available: true 
        })

    } catch (error) {
        console.error('Error removing item from cart:', error);
        res.status(500).json({
            success: false,
            message: "Failed to check the stock",
            available: false
        });
    }
}


module.exports = {
    loadCart,
    addToCart,
    updateCart,
    removeItemFromCart,
    checkStock
}