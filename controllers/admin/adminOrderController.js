const userModel = require('../../models/userSchema');
const orderModel = require('../../models/orderSchema');



const loadOrder = async (req, res) => {
    try {
        
        const currentPage = parseInt(req.query.page) || 1;
        const pageSize = 10; // Set your preferred page size
        const currentStatus = req.query.status || 'all';
        
      
        let filter = {};
        if (currentStatus && currentStatus !== 'all') {
            filter.orderStatus = currentStatus;
        }
        
        
        const totalOrders = await orderModel.countDocuments(filter);
        const totalPages = Math.ceil(totalOrders / pageSize);
        
       
        const allOrders = await orderModel.find(filter)
            .populate('userId')
            .sort({ createdAt: -1 })
            .skip((currentPage - 1) * pageSize)
            .limit(pageSize);
        
       
        const userOrders = allOrders.map(order => ({
            _id: order._id, 
            orderId: order.orderId,
            date: order.createdAt, 
            customer: {
                name: `${order.userId?.firstname} ${order.userId?.lastname}`,
                email: order.userId?.email
            },
            products: order.products.map(product => {
                return {name: product.productDetails.name,
                quantity: product.quantity}
            }),
            total: order.totalAmount, 
            paymentMethod: order.paymentMethod,
            status: order.orderStatus,
        }));
        
        res.render('Admin/adminOrders', {
            orders: userOrders,
            currentPage,
            pageSize,
            totalOrders,
            totalPages,
            currentStatus
        });
    } catch (error) {
        console.error('Error loading orders:', error);
        res.render('500'); // Render error page
    }
};


const orderUpdateStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    
    if (!orderId || !status) {
      return res.status(400).json({ success: false, message: "orderId and status are required" });
    }
    
    // Find the order first
    const order = await orderModel.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    
    // Create update object with the new status for the order
    const updateObj = {
      $set: {
        orderStatus: status,
      }
    };
    
    // Instead of updating all products at once, we'll handle them individually
    // First, map the products array to update status only for products that aren't cancelled or returned
    const updatedProducts = order.products.map(product => {
      // If product is already cancelled or returned, preserve its status
      if (product.productOrderStatus === 'cancelled' || product.productOrderStatus === 'returned') {
        return product;
      } else {
        // Otherwise update to the new status
        product.productOrderStatus = status;
        return product;
      }
    });
    
    // Set the updated products array in the update object
    updateObj.$set.products = updatedProducts;
    
    // If status is delivered and payment method is COD, set payment status to completed
    if (status === 'delivered' && order.paymentMethod === 'cod') {
      updateObj.$set.paymentStatus = 'completed';
    }
    
    // If status is cancelled, add cancellation info  
    if (status === 'cancelled') {
      updateObj.$set["orderCancellation.reason"] = req.body.reason || "No reason provided";
      updateObj.$set["orderCancellation.cancelledAt"] = new Date();
    }
    
    // If status is returned, add return info
    if (status === 'returned') {
      updateObj.$set["orderReturned.reason"] = req.body.reason || "No reason provided";
      updateObj.$set["orderReturned.returnedAt"] = new Date();
    }
    
    // Update the order with all changes
    const updatedOrder = await orderModel.findByIdAndUpdate(
      orderId,
      updateObj,
      { new: true }
    );
    
    res.status(200).json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};



const loadOrderInfo = async (req, res) => { 
  try {
    const { orderId } = req.params;
    
    const order = await orderModel.findOne({ _id : orderId }).populate('userId');
    
    if (!order) {
      return res.status(404).send('Order not found');
    }
    
    let adjustedSubtotal = 0;
    let originalSubtotal = order.subtotal;
    let a = 0
    
    order.products.forEach(product => {
      const productPrice = product.productDetails.discoundedPrice? product.productDetails.discoundedPrice : product.price;
      if (product.productOrderStatus !== 'cancelled' && product.productOrderStatus !== 'returned') {
        adjustedSubtotal += productPrice * product.quantity;
      }
    });
    
    adjustedSubtotal = Math.round(adjustedSubtotal);
    
    const customer = {
      name: order.shippingAddress.fullName, 
      email: order.userId.email
    };
    
    const shipping = order.shippingCost;
    const gst = order.gstAmount;
    const updatedOrder =  await orderModel.findOneAndUpdate(
      {
        _id : orderId
      },
{
      $set:{
        subtotal:adjustedSubtotal,
        totalAmount:adjustedSubtotal+gst+shipping
      }}
    )

    await updatedOrder.save()

    res.render('Admin/adminOrderDetail', {
      order : updatedOrder,
      customer,
      originalSubtotal,
      adjustedSubtotal
    });
    
  } catch (error) {
    console.log(error);
    res.status(500).send('An error occurred while processing the order details');
  }
};



module.exports = {
    loadOrder,
    orderUpdateStatus,

    loadOrderInfo
}