const userModel = require('../../models/userSchema');
const productModel = require('../../models/productSchema');
const orderModel = require("../../models/orderSchema");
const cartModel = require("../../models/cartSchema");
const addressModel = require("../../models/addressSchema");
const walletModel = require('../../models/walletSchema');
const couponModel = require('../../models/coupenSchema');
const offerModel = require('../../models/offerSchema');
const addTransaction = require('../../services/transactionService');
const mongoose = require('mongoose');

 

const generateTimeline = (product, order) => {
    const timeline = [];
    
    
    timeline.push({
        type: 'info',
        title: 'Order Placed',
        date: new Date(order.orderedDate).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        }),
        description: 'Your order has been successfully placed.'
    });
    
    
    if (['processing', 'shipped', 'delivered'].includes(product.productOrderStatus)) {
        timeline.push({
            type: 'info',
            title: 'Processing',
            date: new Date(order.updatedAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }),
            description: 'Your order is being processed.'
        });
    }
    
    
    if (['shipped', 'delivered'].includes(product.productOrderStatus)) {
        timeline.push({
            type: 'info',
            title: 'Shipped',
            date: new Date(order.updatedAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }),
            description: 'Your product has been shipped.'
        });
    }
    
    
    if (product.productOrderStatus === 'delivered') {
        timeline.push({
            type: 'success',
            title: 'Delivered',
            date: new Date(order.updatedAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }),
            description: 'Your product has been delivered successfully.'
        });
    }
    
    
    if (product.productOrderStatus === 'cancelled') {
        timeline.push({
            type: 'danger',
            title: 'Cancelled',
            date: product.productOrderCancellation && product.productOrderCancellation.cancelledAt ? 
                new Date(product.productOrderCancellation.cancelledAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                }) : 
                new Date(order.updatedAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                }),
            description: product.productOrderCancellation && product.productOrderCancellation.reason ? 
                `Reason: ${product.productOrderCancellation.reason}` : 'Product was cancelled.'
        });
    }
    
    
    if (product.productOrderStatus === 'returned') {
        timeline.push({
            type: 'warning',
            title: 'Returned',
            date: product.productOrderReturned && product.productOrderReturned.returnedAt ? 
                new Date(product.productOrderReturned.returnedAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                }) : 
                new Date(order.updatedAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                }),
            description: product.productOrderReturned && product.productOrderReturned.reason ? 
                `Reason: ${product.productOrderReturned.reason}` : 'Product was returned.'
        });
    }
    
    return timeline; 
};
 


const userPlacerOrder = async (req, res) => {
  try {
    const { addressId, paymentMethod, subtotal, gstAmount, shippingCost, totalAmount, products, coupon } = req.body;
    

    const userId = req.user._id || req.user.id;
    
    if (!addressId || !paymentMethod || !subtotal || !products || products.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required order information" 
      });
    }
    
    const userAddress = await addressModel.findOne({_id: addressId, userId });
    if(!userAddress) {
      console.log(`Address is not Found in userPlaceOrder`);
      return res.status(404).json({ 
        success: false, 
        message: "Address not found" 
      });
    }

    const finalSubtotal = parseFloat(subtotal);
    const finalShippingCost = parseFloat(shippingCost);
    const finalGstAmount = parseFloat(gstAmount);
    const finalTotalAmount = parseFloat(totalAmount);

    const orderProducts = [];
    for (const item of products) {
      const {productId, quantity , discountedPrice} = item;
      
      const product = await productModel.findById(productId);
      if(!product) {
        console.log(`Product with ID ${productId} not found in userPlaceOrder`);
        return res.status(404).json({ 
          success: false, 
          message: `Product with ID ${productId} not found` 
        });
      }

      if (product.availableQuantity < quantity) {
        console.log(`Insufficient stock for ${product.name}. Available: ${product.availableQuantity} in userPlaceOrder`);
        return res.status(400).json({ 
          success: false, 
          message: `Insufficient stock for ${product.name}. Available: ${product.availableQuantity}` 
        });
      }
      
      orderProducts.push({ 
        product: product._id,
        productDetails: {
          name: product.name,
          writer: product.writer,
          salePrice: product.salePrice,
          productImages: product.productImages,
          discoundedPrice: item.discountedPrice ? parseFloat(item.discountedPrice) : null 
        },
        quantity: quantity,
        price: product.salePrice * quantity,
        productOrderStatus: 'pending'
      });  

      
      product.availableQuantity -= quantity;
      await product.save();
    }

    if (finalTotalAmount > 1000 && paymentMethod === 'cod') {
      return res.status(400).json({ 
        success: false, 
        message: "This order exceeds our Cash on Delivery limit. Please try another payment method." 
      });
    }

    let paymentStatus = ''

    if(paymentMethod === 'cod'){
      paymentStatus = 'pending'
    }else if(paymentMethod === 'razorPay' || paymentMethod === 'wallet') { 
      paymentStatus = 'completed'
    }

    const orderData = {
      userId: userId,
      products: orderProducts,
      shippingAddress: {
        userId: userId,
        fullName: userAddress.fullName,
        alternative_no: userAddress.alternative_no,
        houseNumber: userAddress.houseNumber,
        street: userAddress.street,
        landmark: userAddress.landmark,
        city: userAddress.city,
        state: userAddress.state,
        pincode: userAddress.pincode,
        addressType: userAddress.addressType
      },
      subtotal: finalSubtotal,
      shippingCost: finalShippingCost,
      totalAmount: finalTotalAmount,
      paymentMethod: paymentMethod,
      paymentStatus: paymentStatus,
      orderStatus: 'pending',
      gstAmount: finalGstAmount
    };

    if (coupon && coupon.couponCode) {
      orderData.coupon = {
        couponCode: coupon.couponCode,
        discount: coupon.discount || 0
      };
    }

    const newOrder = new orderModel(orderData);
    if(!newOrder) {
      console.log('New order didnt created');
      return res.status(400).json({ 
        success: false, 
        message: `Oops! Your order wasn't placed. Don't worry-no payment was taken. Try again or contact support` 
      });
    }

    await newOrder.save();

    if (coupon && coupon.couponCode) {
      try {
        const couponDoc = await couponModel.findOne({ couponCode: coupon.couponCode });
        
        if (couponDoc) {
          if (!couponDoc.usedBy.includes(userId)) {
            couponDoc.usedBy.push(userId);
            await couponDoc.save();
            console.log(`User ${userId} added to usedBy array for coupon ${coupon.couponCode}`);
          }
        }
      } catch (couponError) {
        console.log(`Error updating coupon usage: ${couponError}`);
      }
    }
  
    await cartModel.deleteMany({ userId: userId });

    res.status(200).json({
      success: true,
      message: 'Order placed successfully',
      orderId: newOrder.orderId 
    });
  } catch (error) {
    console.log(`Error placing order:, ${error}`); 
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};



const loadOrderPlacedConfirmation = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id || req.user.id;
    
    
    const orderDetails = await orderModel.findOne({ orderId, userId }).populate('products.product');
    
    if (!orderDetails) {
      return res.status(404).send("Order not found");
    }
    
    
    const items = [];
    for (const item of orderDetails.products) {
      const displayPrice = item.productDetails.discoundedPrice || item.productDetails.salePrice;      
      items.push({
        name: item.productDetails.name || "Product",
        quantity: item.quantity,
        price: displayPrice,
        
      });
    }
    
    
    const getOrderDate = new Date(orderDetails.orderedDate);
    const orderedDate = getOrderDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: '2-digit'
    });
    
    
    const deliveryDate = new Date(orderDetails.orderedDate);
    deliveryDate.setDate(deliveryDate.getDate() + 10);
    const formattedDeliveryDate = deliveryDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: '2-digit'
    });
    
    
    const order = {
      confirmationTitle: "Order Successful!",
      confirmationSubtitle: "Thank you for shopping with us. Your order has been received.",
      orderNumber: orderDetails.orderId,
      status: {
        label: orderDetails.orderStatus.charAt(0).toUpperCase() + orderDetails.orderStatus.slice(1)
      },
      orderDate: orderedDate,
      deliveryDate: formattedDeliveryDate,
      address: orderDetails.shippingAddress,
      items: items,
      shippingCost: orderDetails.shippingCost,
      totalAmount: orderDetails.totalAmount,
      gstRate: orderDetails.gstRate || 18,
      gstAmount: orderDetails.gstAmount,
      detailsUrl: `/orders/${orderDetails.orderId}`,
      shopUrl: "/shop",
      message: "We're preparing your books with care. You'll receive an email with tracking info soon."
    };
    
    
    if (orderDetails.coupon && orderDetails.coupon.couponCode) {
      order.coupon = {
        couponCode: orderDetails.coupon.couponCode,
        discount: orderDetails.coupon.discount
      };
    }
    
    res.render('User/userOrderConfirmation', { order });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};



const loadOrderListPage = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const user = await userModel.findById(userId);

        const orders = await orderModel.find({userId}).sort({createdAt:-1});
        const searchQuery = req.query.search || '';
        const statusFilter = req.query.status || '';
        const page = parseInt(req.query.page) || 1;
        const limit = 2;

        
        let filteredOrders = orders.filter(order => {
            const matchesStatus = !statusFilter || order.orderStatus.toLowerCase() === statusFilter.toLowerCase();
            const matchesSearch = !searchQuery || order.orderId.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesStatus && matchesSearch;
        });

        const totalPages = Math.ceil(filteredOrders.length / limit);
        const paginatedOrders = filteredOrders.slice((page - 1) * limit, page * limit);

        
        const orderedDate = (date) => {
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            return new Date(date).toLocaleDateString('en-US', options);
        };

        res.render('User/userOrderListPage', {
            user,
            orders,
            currentPage: page,
            totalPages,
            searchQuery,
            statusFilter,
            orderedDate
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};


const loadOrderViewPage = async (req, res) => { 
  try {
      const userId = req.user._id || req.user.id;
      const {orderId} = req.params;
      
      const user = await userModel.findById(userId);
      const order = await orderModel.findOne({ orderId, userId }).populate('products.product');
      
      if (!order) {
          return res.status(404).render('User/userOrderNotFound', {
              user,
              message: 'Order not found.',
              activePage: 'orders'
          });
      }
      
      
      const activeOffers = await offerModel.find({ 
          isActive: true, 
          endDate: { $gte: new Date() } 
      }).populate('product category');
      
      
      for (const product of order.products) {
          
          const productOffers = activeOffers.filter(
              offer => offer.offerType === 'product' && 
              offer.product && 
              offer.product._id.toString() === product.product._id.toString()
          );
          
          
          const categoryOffers = activeOffers.filter(
              offer => offer.offerType === 'category' && 
              offer.category && 
              product.product.category && 
              offer.category._id.toString() === product.product.category.toString()
          );
          
          
          const applicableOffers = [...productOffers, ...categoryOffers];
          
          
          let bestOffer = null;
          if (applicableOffers.length > 0) {
              bestOffer = applicableOffers.reduce((best, current) => 
                  current.discountPercentage > best.discountPercentage ? current : best, 
                  applicableOffers[0]
              );
              
              
              const discountAmount = (product.productDetails.salePrice * bestOffer.discountPercentage) / 100;
              const offeredPrice = product.productDetails.salePrice - discountAmount;
              
              
              product.offer = {
                  name: bestOffer.name,
                  discountPercentage: bestOffer.discountPercentage,
                  originalPrice: product.productDetails.salePrice,
                  offeredPrice: offeredPrice.toFixed(2),
                  savings: discountAmount.toFixed(2)
              };
          }
          
          
          product.timeline = generateTimeline(product, order);
      }
      
      res.render("User/userOrderViewPage", {
          user,
          order,
          activePage: 'orders'
      });
      
  } catch (error) {
      console.error("Error loading user Order Detail Page:", error);
      res.status(500).render('500');
  }
};



const cancelSingleProduct = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { orderId } = req.params;
    const { productIds, cancelReason } = req.body;
    
    if (!productIds) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    
    const order = await orderModel.findOne({ orderId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    
    if (order.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this order' });
    }

    
    if (!['pending', 'processing'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Products can only be cancelled when order is in pending or processing state'
      });
    }

    
    const productId = productIds 
    const productIndex = order.products.findIndex(p => {
      const orderProductId = p.product; 
      return orderProductId.toString() === productId.toString();
    });

    if (productIndex === -1) {
      return res.status(404).json({ success: false, message: 'Product not found in order' });
    }

    
    if (order.products[productIndex].productOrderStatus === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Product is already cancelled' });
    }

    
    const quantityToRestore = order.products[productIndex].quantity;

    
    const productToCancel = order.products[productIndex];    
    const productPrice = productToCancel.productDetails.discountedPrice || productToCancel.productDetails.salePrice;
    const refundAmount = productPrice * quantityToRestore;
    
    console.log(productToCancel)
    console.log(refundAmount) 
    
    order.products[productIndex].productOrderStatus = 'cancelled';
    order.products[productIndex].productOrderCancellation = {
      reason: cancelReason || 'User requested cancellation',
      cancelledAt: new Date()
    };

    
    const allProductsCancelled = order.products.every(p => p.productOrderStatus === 'cancelled');
    if (allProductsCancelled) {
      order.orderStatus = 'cancelled';
      order.orderCancellation = {
        reason: cancelReason || 'All products cancelled',
        cancelledAt: new Date()
      };
    }

    
    if (order.paymentMethod === 'razorPay' && order.paymentStatus === 'completed') {
      try {

        
        await addTransaction(
          userId,
          'Credit',
          refundAmount,
          'Order Cancellation'
        );

        
        if (allProductsCancelled) {
          order.paymentStatus = 'cancelled';
        }
      } catch (refundError) {
        console.error('Error processing refund:', refundError);
        
        
      }
    } else if (order.paymentMethod === 'wallet' && order.paymentStatus === 'completed') {
      
      await addTransaction(
        userId,
        'Credit',
        refundAmount,
        'Order Cancellation'
      );
      
      
      if (allProductsCancelled) {
        order.paymentStatus = 'cancelled';
      }
    }

    
    await order.save();

    
    const product = await productModel.findById(order.products[productIndex].product);
    if (product) {
      product.availableQuantity += quantityToRestore;
      await product.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Product cancelled successfully',
      orderStatus: order.orderStatus,
      refunded: order.paymentMethod !== 'cod' ? refundAmount : 0
    });

  } catch (error) {
    console.error('Error cancelling product:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while cancelling product'
    });
  }
};
 

  
  const returnSingleProduct = async (req, res) => {
    try { 
      const userId = req.user._id || req.user.id;
      const { orderId } = req.params;
      const { productIds, returnReason } = req.body;
      
      
      const order = await orderModel.findOne({ orderId, userId });
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found or does not belong to this user'
        });
      }
      
      
      const productToReturn = order.products.find(p => {
        const orderProductId = p.product;
        return orderProductId.toString() === productIds.toString();
      });
      
      if (!productToReturn) {
        return res.status(404).json({
          success: false,
          message: 'Product not found in this order'
        });
      }
      
      
      if (productToReturn.productOrderStatus === 'returned') {
        return res.status(400).json({
          success: false,
          message: 'This product has already been returned'
        });
      }
      
      
      const product = await productModel.findById(productToReturn.product);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found in database'
        });
      }
      
      
      product.availableQuantity += productToReturn.quantity;
      await product.save();
      
      
      productToReturn.productOrderStatus = 'returned';
      
      
      productToReturn.productOrderReturned = {
        reason: returnReason,
        returnedAt: new Date()
      };
      
      
      const refundAmount = productToReturn.productDetails.discoundedPrice
        ? productToReturn.productDetails.discoundedPrice * productToReturn.quantity
        : productToReturn.productDetails.salePrice * productToReturn.quantity;
      
      console.log("Refund amount:", refundAmount);
      
      
      await addTransaction(
        userId,
        'Credit',
        refundAmount,
        'Order Refund'
      );
      
      
      const allProductsReturned = order.products.every(p => p.productOrderStatus === 'returned');
      if (allProductsReturned) {
        order.orderStatus = 'returned';
        order.orderReturned = {
          reason: 'All products returned',
          returnedAt: new Date()
        };
      }
      
      
      await order.save();
      
      
      const wallet = await walletModel.findOne({ userId });
      const currentBalance = wallet ? wallet.amount : 0;
      
      
      res.status(200).json({
        success: true,
        message: 'Product returned successfully and amount credited to wallet',
        data: {
          product: productToReturn.productDetails.name || 'Product',
          quantity: productToReturn.quantity,
          refundAmount: refundAmount,
          currentWalletBalance: currentBalance,
          returnDate: productToReturn.productOrderReturned.returnedAt
        }
      });
      
    } catch (error) {
      console.error("Error processing product return:", error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  };


  const bulkProductCancel = async (req, res) => {
    try {
      const userId = req.user._id || req.user.id;
      const { orderId } = req.params;
      const { productIds, cancelReason, cancelDetails } = req.body;
      
      
      const productIdArray = productIds.split(",");
      
      
      const order = await orderModel.findOne({orderId, userId});
      
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }
      
      
      const productsToUpdateStock = [];
      
      let totalRefundAmount = 0;
      
      
      for (const product of order.products) {
        if (productIdArray.includes(product.product.toString())) {
          
          if (product.productOrderStatus !== 'cancelled' && product.productOrderStatus !== 'returned') {
            
            product.productOrderStatus = 'cancelled';
            product.productOrderCancellation = {
              reason: cancelReason === 'other' ? cancelDetails : cancelReason,
              cancelledAt: new Date()
            };
            
            
            productsToUpdateStock.push({
              productId: product.product,
              quantity: product.quantity
            });
            
            
            const priceToRefund = product.productDetails.discoundedPrice || product.productDetails.salePrice;
            totalRefundAmount += priceToRefund * product.quantity;
          }
        }
      }
      
      
      await order.save();
      
      
      for (const item of productsToUpdateStock) {
        await productModel.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: item.quantity } },
          { new: true }
        );
      }
      
      
      const allProductsCancelled = order.products.every(
        product => product.productOrderStatus === 'cancelled' || product.productOrderStatus === 'returned'
      );
      
      
      if (order.paymentMethod === 'razorPay' && order.paymentStatus === 'completed' && totalRefundAmount > 0) {
        try {
 
          
          
          await addTransaction(
            userId,
            'Credit',
            totalRefundAmount,
            'Order Cancellation'
          );
          
          console.log('Refund processed successfully:', refund);
        } catch (refundError) {
          console.error('Error processing refund:', refundError);
          
          
        }
      }
      
      
      if (allProductsCancelled) {
        order.orderStatus = 'cancelled';
        order.orderCancellation = {
          reason: cancelReason === 'other' ? cancelDetails : cancelReason,
          cancelledAt: new Date()
        };
        
        if (order.paymentMethod !== 'cod' && order.paymentStatus === 'completed') {
          order.paymentStatus = 'cancelled';
        }
        
        await order.save();
      }
      
      return res.status(200).json({
        success: true,
        message: "Products cancelled successfully",
        updatedOrder: order
      });
      
    } catch (error) {
      console.error("Error in bulk product cancellation:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while cancelling products",
        error: error.message
      });
    }
  };


const bulkProductReturn = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user._id || req.user.id;
        const { productIds, returnReason, returnDetails } = req.body;
        
        const everyProductIds = productIds.split(",");
        
        
        const order = await orderModel.findOne({ orderId, userId });
        
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found or does not belong to this user' 
            });
        }
        
        
        if (order.orderStatus !== 'delivered') {
            return res.status(400).json({ 
                success: false, 
                message: 'Only delivered orders can be returned' 
            });
        }
        
        
        const returnedProducts = [];
        let totalRefundAmount = 0;
        
        
        for (const productId of everyProductIds) {
            
            const productIndex = order.products.findIndex(
                item => item.product.toString() === productId
            );
            
            if (productIndex === -1) {
                continue; 
            }
            
            const orderProduct = order.products[productIndex];
            
            
            if (orderProduct.productOrderStatus === 'returned' || 
                orderProduct.productOrderStatus === 'cancelled') {
                continue; 
            }
            
            
            const unitPrice = orderProduct.productDetails.discoundedPrice || orderProduct.productDetails.salePrice;
            const refundAmount = unitPrice * orderProduct.quantity;
            totalRefundAmount += refundAmount;
            
            
            order.products[productIndex].productOrderStatus = 'returned';
            order.products[productIndex].productOrderReturned = {
                reason: returnReason === 'other' ? returnDetails : returnReason,
                returnedAt: new Date()
            };
            
            
            const product = await productModel.findById(productId);
            if (product) {
                product.availableQuantity += orderProduct.quantity; 
                await product.save();
            }
            
            returnedProducts.push({
                productId,
                quantity: orderProduct.quantity,
                name: orderProduct.productDetails.name,
                refundAmount
            });
        }
        
        
        if (returnedProducts.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid products to return'
            });
        }
        
        
        const allProductsReturned = order.products.every(product => 
            product.productOrderStatus === 'returned' || product.productOrderStatus === 'cancelled'
        );
        
        
        if (allProductsReturned) {
            order.orderStatus = 'returned';
            order.orderReturned = {
                reason: returnReason,
                returnedAt: new Date()
            };
        }
        
        
        await order.save();

        await addTransaction(
          userId,
          'Credit',
          totalRefundAmount,
          'Order Refund'
      );
        
        
        
        return res.status(200).json({
            success: true,
            message: 'Products returned successfully',
            returnedProducts,
            refundAmount: totalRefundAmount,
            wallet: {
                credited: totalRefundAmount,
                description: 'Order Return'
            },
            order
        });
        
    } catch (error) {
        console.error('Error in bulkProductReturn:', error);
        res.status(500).json({success: false, message: 'Internal Server Error'})
    }
}

module.exports = {
    
    userPlacerOrder,
    loadOrderPlacedConfirmation,

    loadOrderListPage,
    loadOrderViewPage,

    cancelSingleProduct,
    returnSingleProduct,
    bulkProductCancel,
    bulkProductReturn



}