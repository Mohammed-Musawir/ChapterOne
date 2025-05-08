const addressModel = require('../../models/addressSchema');
const couponmodel = require('../../models/coupenSchema');
const cartModel = require('../../models/cartSchema');
const offerModel = require('../../models/offerSchema');  


const loadCheckOutPage = async (req, res) => {
  try {
      const userId = req.user._id || req.user.id;
      const addresses = await addressModel.find({userId});
      
      const cart = await cartModel.findOne({userId}).populate('books.product');
      
      let totalItems = 0;
      if (cart && cart.books.length > 0) {
          totalItems = cart.books.reduce((acc, item) => acc + item.quantity, 0);
      }
      
      
      const currentDate = new Date();
      const activeOffers = await offerModel.find({
          isActive: true,
          endDate: { $gt: currentDate }
      });
      
      
      const productsWithDiscounts = [];
      let subtotal = 0;
      
      if (cart && cart.books.length > 0) {
          for (const item of cart.books) {
              const product = item.product;
              
              
              const productOffers = activeOffers.filter(offer => 
                  offer.offerType === 'product' && 
                  offer.product && 
                  offer.product.toString() === product._id.toString()
              );
              
              
              const categoryOffers = activeOffers.filter(offer => 
                  offer.offerType === 'category' && 
                  offer.category && 
                  offer.category.toString() === product.category_id.toString()
              );
              
              
              const allApplicableOffers = [...productOffers, ...categoryOffers];
              
              let bestOffer = null;
              let highestDiscount = 0;
              
              allApplicableOffers.forEach(offer => {
                  const discountAmount = (product.salePrice * offer.discountPercentage) / 100;
                  if (discountAmount > highestDiscount) {
                      highestDiscount = discountAmount;
                      bestOffer = offer;
                  }
              });
              
              
              const originalPrice = product.salePrice;
              const discountedPrice = bestOffer ? 
                  originalPrice - (originalPrice * bestOffer.discountPercentage / 100) : 
                  originalPrice;
                  
              const totalForItem = discountedPrice * item.quantity;
              subtotal += totalForItem;
              
              
              productsWithDiscounts.push({
                  product: product,
                  quantity: item.quantity,
                  originalPrice: originalPrice,
                  discountedPrice: discountedPrice,
                  appliedOffer: bestOffer,
                  totalPrice: totalForItem
              });
          }
      }
      
      const shippingCost = subtotal > 1000 ? 0 : 60;
      const gstAmount = Math.round((subtotal + shippingCost) * 0.18);
      const totalPrice = subtotal + gstAmount + shippingCost;
      
      const TotalPrice = Math.round(totalPrice)
      const Subtotal = Math.round(subtotal)
      const activeCoupons = await couponmodel.find({isBlocked: false});
      
      const appliedCoupon = req.session.appliedCoupon || [];
      
      res.render("user/userCheckoutPage", {
          addresses,
          subtotal : Subtotal,
          shippingCost, 
          gstAmount,
          totalPrice : TotalPrice,
          activeCoupons,
          appliedCoupon,
          cart,
          productsWithDiscounts 
      });
  } catch (error) {
      console.error(error.message);
      res.status(500).send("Something went wrong");
  }
};

const applyCoupen = async (req, res) => {
  try {
      const { couponCode, subtotal, isPostOfferSubtotal } = req.body;
      const userId = req.user._id || req.user.id;

      if (!couponCode) {
          return res.status(400).json({ 
              success: false, 
              message: 'Coupon code is required' 
          });
      }

      const coupon = await couponmodel.findOne({
          couponCode: couponCode,
          isBlocked: false
      });

      if (!coupon) {
          return res.status(404).json({ 
              success: false, 
              message: 'Invalid coupon code or coupon not found' 
          });
      }

      const currentDate = new Date();
      if (coupon.expireDate && new Date(coupon.expireDate) < currentDate) {
          return res.status(400).json({ 
              success: false, 
              message: 'This coupon has expired' 
          });
      }

      if (coupon.startDate && new Date(coupon.startDate) > currentDate) {
          return res.status(400).json({ 
              success: false, 
              message: 'This coupon is not active yet' 
          });
      }

      if (subtotal < coupon.minAmount) {
          return res.status(400).json({ 
              success: false, 
              message: `Minimum order amount of ₹${coupon.minAmount} required to use this coupon` 
          });
      }

      if (userId && coupon.usedBy && coupon.usedBy.includes(userId)) {
          return res.status(400).json({ 
              success: false, 
              message: 'You have already used this coupon' 
          });
      }
      
      if (coupon.user && coupon.user.length > 0 && userId && !coupon.user.includes(userId)) {
          return res.status(400).json({ 
              success: false, 
              message: 'This coupon is not available for your account' 
          });
      }

      if (parseFloat(subtotal) < parseFloat(coupon.minAmount)) {
        return res.status(400).json({ 
            success: false, 
            message: `Minimum order amount of ₹${coupon.minAmount} required to use this coupon` 
        });
      }


      const discountAmount = coupon.offerPrice;
      const subtotalForCalculation = parseFloat(subtotal);
      const discountedSubtotal = subtotalForCalculation - discountAmount;
      const shippingCost = discountedSubtotal > 1000 ? 0 : 60;
      const gstAmount = Math.round((subtotalForCalculation + shippingCost) * 0.18);
      const newTotal = discountedSubtotal + gstAmount + shippingCost;
      
      
      req.session.appliedCoupon = {
        id: coupon._id,
        code: coupon.couponCode,
        discount: discountAmount,
        subtotal:subtotal
    };

      return res.status(200).json({
        success: true,
        message: 'Coupon applied successfully',
        coupon: {
            code: coupon.couponCode,
            discount: discountAmount
        },
        updatedTotal: newTotal,
        gstAmount: gstAmount,
        shippingCost: shippingCost
    });
    
      
  } catch (error) {
      console.error('Error applying coupon:', error);
      return res.status(500).json({
          success: false,
          message: 'An error occurred while applying the coupon'
      });
  }
};

const removeCoupon = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;

        if (!req.session.appliedCoupon) {
            return res.status(400).json({
              success: false,
              message: 'No coupon is currently applied'
            });
        }

        const cart = await cartModel.findOne({ userId }).populate('books.product');
    
        if (!cart || !cart.books || cart.books.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Your cart is empty'
            });
        }

        const appliedCoupon = req.session.appliedCoupon;
        const subtotal    = appliedCoupon.subtotal;

          
        const shippingCost = subtotal > 1000 ? 0 : 60;
        const gstAmount = Math.round((subtotal + shippingCost) * 0.18);
        const updatedTotal = subtotal + gstAmount + shippingCost;
          

        
        delete req.session.appliedCoupon;
        
        
        req.session.save();

        return res.status(200).json({
            success: true,
            message: 'Coupon removed successfully',
            updatedTotal: updatedTotal,
            subtotal: subtotal,
            gstAmount: gstAmount,
            shippingCost: shippingCost
        });

    } catch (error) {
        console.error('Error removing coupon:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while removing the coupon'
        });
    }
}

module.exports = { 
    loadCheckOutPage,
    applyCoupen,
    removeCoupon
}