const wishlistModal = require('../../models/wishlistSchema');
const cartModal = require('../../models/cartSchema');
const productModal = require('../../models/productSchema');
const categoryModal = require('../../models/categorySchema');
const offerModal = require('../../models/offerSchema');


const loadWishList = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        
        // Get wishlist with populated product data
        const wishlist = await wishlistModal.findOne({userId: userId}).populate('books.product');
        
        // Get cart items
        const cart = await cartModal.findOne({userId});
        
        // Get product IDs from wishlist and cart for comparison
        const wishlistBookIds = wishlist && wishlist.books ? wishlist.books.map(item => {
            return item.product && item.product._id ? item.product._id.toString() : '';
        }).filter(id => id !== '') : [];
        
        const cartBookIds = cart && cart.books ? cart.books.map(item => {
            // Check if item.product exists before calling toString()
            return item.product ? (typeof item.product === 'object' ? item.product._id.toString() : item.product.toString()) : '';
        }).filter(id => id !== '') : [];
        
        // Get recommended books that are not in wishlist or cart
        let recommendedBooks = await productModal.find({
            _id: { $nin: [...wishlistBookIds, ...cartBookIds] }
        }).limit(4);
        
        // Get all active offers
        const activeOffers = await offerModal.find({
            isActive: true,
            endDate: { $gt: new Date() }
        });
        
        // Process offers for wishlist items
        if (wishlist && wishlist.books && wishlist.books.length > 0) {
            for (let item of wishlist.books) {
                // Skip if product is not populated or is undefined
                if (!item.product || !item.product._id) continue;
                
                // Calculate offer price
                const productOffers = activeOffers.filter(
                    offer => offer.offerType === 'product' && 
                    offer.product && 
                    offer.product.toString() === item.product._id.toString()
                );
                
                const categoryOffers = activeOffers.filter(
                    offer => offer.offerType === 'category' && 
                    offer.category && 
                    item.product.category && // Check if category exists
                    offer.category.toString() === item.product.category.toString()
                );
                
                // Combine offers and find the highest discount
                const allOffers = [...productOffers, ...categoryOffers];
                
                if (allOffers.length > 0) {
                    const highestOffer = allOffers.reduce((max, offer) => 
                        offer.discountPercentage > max.discountPercentage ? offer : max, allOffers[0]);
                    
                    const discountAmount = Math.round((item.product.salePrice * highestOffer.discountPercentage) / 100);
                    item.product.offerPrice = item.product.salePrice - discountAmount;
                    item.product.offerPercentage = highestOffer.discountPercentage;
                    item.product.offerName = highestOffer.name;
                }
                
                // Check if product is in cart
                item.isInCart = cartBookIds.includes(item.product._id.toString());
            }
        }
        
        // Process offers for recommended books
        recommendedBooks = recommendedBooks.map(book => {
            // Skip processing if book is undefined
            if (!book) return null;
            
            // Convert to plain object to add new properties
            const bookObj = book.toObject();
            
            // Calculate offer price
            const productOffers = activeOffers.filter(
                offer => offer.offerType === 'product' && 
                offer.product && 
                offer.product.toString() === book._id.toString()
            );
            
            const categoryOffers = activeOffers.filter(
                offer => offer.offerType === 'category' && 
                offer.category && 
                book.category && // Check if category exists
                offer.category.toString() === book.category.toString()
            );
            
            // Combine offers and find the highest discount
            const allOffers = [...productOffers, ...categoryOffers];
            
            if (allOffers.length > 0) {
                const highestOffer = allOffers.reduce((max, offer) => 
                    offer.discountPercentage > max.discountPercentage ? offer : max, allOffers[0]);
                
                const discountAmount = Math.round((book.salePrice * highestOffer.discountPercentage) / 100);
                bookObj.offerPrice = book.salePrice - discountAmount;
                bookObj.offerPercentage = highestOffer.discountPercentage;
                bookObj.offerName = highestOffer.name;
            }
            
            // Check if product is in cart
            bookObj.isInCart = cartBookIds.includes(book._id.toString());
            
            return bookObj;
        }).filter(book => book !== null); // Remove any null entries
        
        res.render('User/userWishList', {wishlist, recommendedBooks});
    } catch (error) {
        console.log(`Error in Load wishlist in wishlist Controller: ${error}`);
        res.render('User/404');
    }
};

const addToWishlist = async (req, res) => {
    try {
        const userID = req.user._id || req.user.id;
        const { bookId } = req.body;
        
        const product = await productModal.findById(bookId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }
        
        let wishlist = await wishlistModal.findOne({ userId: userID });
        
        if (wishlist) {
            // Check if the book is already in the wishlist
            const bookExists = wishlist.books.some(
                (item) => item.product.toString() === bookId.toString()
            );
            
            if (bookExists) {
                return res.status(200).json({
                    success: true,
                    message: "Product already in wishlist",
                });
            }
            
            // Add the book to the existing wishlist
            wishlist.books.push({ product: bookId });
            await wishlist.save();
        } else {

            wishlist = new wishlistModal({
                userId: userID,
                books: [{ product: bookId }],
            });
            console.log('wishList added');
            await wishlist.save();
        }
        
        res.status(200).json({
            success: true,
            message: "Product added to wishlist successfully",
        });
    } catch (error) {
        console.log(`Error in addToWishlist: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

const clearWishlist = async (req, res) => {
    try {
        const userID = req.user._id || req.user.id;

        const deleted = await wishlistModal.deleteMany({ userId: userID });

        

        if (deleted.deletedCount === 0) {
            console.log('is this is a problem')
            return res.status(404).json({success:false, message: "No items found in wishlist" });
        }

        res.status(200).json({success:true, message: "Wishlist cleared successfully" });
    } catch (error) {
        console.error("Error clearing wishlist:", error);
        res.status(500).json({success:false, message: "Internal Server Error" });
    }
};

const removeItemFromWishlist = async (req, res) => {
    try {
        
    
        const itemID = req.params.bookId;
        console.log(itemID)
        const userID = req.user._id || req.user.id;
      
      console.log('askhasfkjjh')
      
      const result = await wishlistModal.updateOne(
        { userId: userID },
        { $pull: { books: { product: itemID } } }
      );
      
      if (result.modifiedCount > 0) {
        return res.status(200).json({ 
          success: true, 
          message: "Item removed from wishlist successfully" 
        });
      } else {
        return res.status(404).json({ 
          success: false, 
          message: "Item not found in wishlist or wishlist doesn't exist" 
        });
      }
    } catch (error) {
      console.error("Error removing item from wishlist:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  }

const shopWishlistStatus = async (req, res) => {
    try {
        // Check if user is logged in
        const userId = req.user._id|| req.user.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Please log in to view your wishlist'
            });
        }

        // Find the user's wishlist
        const wishlist = await wishlistModal.findOne({userId})
            .populate('books.product');
        
        if (!wishlist) {
            // Return empty wishlist if not found
            return res.json({
                success: true,
                wishlistItems: []
            });
        }

        // Extract just the book IDs from the wishlist
        const wishlistItems = wishlist.books
        .filter(item => item.product) // Only include items where product is populated
        .map(item => item.product._id.toString());
        
        return res.json({
            success: true,
            wishlistItems: wishlistItems,
            wishlistCount: wishlistItems.length
        });

    } catch (error) {
        console.error('Error fetching wishlist status:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch wishlist status',
            error: error.message
        });
    }
};

module.exports = {
    loadWishList,
    addToWishlist,
    removeItemFromWishlist,
    clearWishlist,

    shopWishlistStatus
}