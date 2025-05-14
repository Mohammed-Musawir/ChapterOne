const Category = require('../../models/categorySchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const mongoose = require('mongoose')


const loadSalesReport = async (req, res) => {
    try {
        
        const categories = await Category.find({ isListed: true }).sort({ name: 1 });
        
        res.render('Admin/adminSalesReport', {
            title: 'Sales Report',
            categories 
        });
    } catch (error) {
        console.error('Error loading sales report page:', error);
        req.flash('error', 'Failed to load sales report page');
        res.redirect('/admin/dashboard');
    }
};


const getSalesReport = async (req, res) => {
    try {
        
        const { period, startDate, endDate, category } = req.query;
        
        
        if (!startDate || !endDate) {
            return res.status(400).json({ 
                success: false, 
                message: 'Start date and end date are required' 
            });
        }
        
        
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        
        const dateFilter = {
            orderedDate: { $gte: start, $lte: end },
            paymentStatus: 'completed' 
        };
        
        
        const orders = await Order.find(dateFilter).lean();
        
        
        const categories = await Category.find().lean();
        const categoryMap = {};
        categories.forEach(cat => {
            categoryMap[cat._id.toString()] = cat.name;
        });
        
        
        const productIds = new Set();
        orders.forEach(order => {
            order.products.forEach(item => {
                if (item.product) {
                    productIds.add(item.product.toString());
                }
            });
        });
        
        
        const products = await Product.find({
            _id: { $in: Array.from(productIds) }
        }).lean();
        
        
        const productMap = {};
        products.forEach(product => {
            productMap[product._id.toString()] = product;
        });
        
        
        let salesData = [];
        let statsData = {
            totalOrders: 0,
            totalSales: 0,
            totalDiscounts: 0,
            netRevenue: 0
        };
        
        
        for (const order of orders) {
            let includeThisOrderInCount = false;
            let processedProducts = 0;
            
            
            for (const item of order.products) {
                
                if (item.productOrderStatus === 'cancelled') continue;
                
                const productId = item.product ? item.product.toString() : null;
                if (!productId || !productMap[productId]) continue;
                
                const product = productMap[productId];
                const productCategoryId = product.category_id ? product.category_id.toString() : null;
                
                
                if (category && productCategoryId !== category.toString()) {
                    continue;
                }
                
                
                processedProducts++;
                includeThisOrderInCount = true;
                
                
                let categoryName = 'Uncategorized';
                if (productCategoryId && categoryMap[productCategoryId]) {
                    categoryName = categoryMap[productCategoryId];
                }
                
                
                // The price might be in productDetails (as salePrice) or directly in item
                const itemPrice = (item.price !== undefined) ? item.price : 
                                 (item.productDetails && item.productDetails.salePrice !== undefined) ? 
                                  item.productDetails.salePrice : 0;
                
                const itemQuantity = item.quantity || 1;
                const itemTotal = itemPrice * itemQuantity;
                
                const orderSubtotal = order.subtotal || 0;
                const orderDiscount = order.coupon ? (order.coupon.discount || 0) : 0;
                
                const itemDiscountShare = (orderDiscount > 0 && orderSubtotal > 0) ? 
                    (itemTotal / orderSubtotal) * orderDiscount : 0;
                
                
                salesData.push({
                    date: order.orderedDate,
                    orderId: order.orderId,
                    category: categoryName,
                    product: item.productDetails ? item.productDetails.name : (product.name || 'Unknown Product'),
                    quantity: itemQuantity,
                    price: parseFloat((itemPrice || 0).toFixed(2)),
                    discount: parseFloat((itemDiscountShare || 0).toFixed(2)),
                    coupon: order.coupon ? order.coupon.couponCode : null,
                    total: parseFloat(((itemTotal || 0) - (itemDiscountShare || 0)).toFixed(2))
                });
                
                
                statsData.totalSales += (itemTotal || 0);
                statsData.totalDiscounts += (itemDiscountShare || 0);
            }
            
            
            if (includeThisOrderInCount && processedProducts > 0) {
                statsData.totalOrders += 1;
            }
        }
        
        
        statsData.netRevenue = parseFloat((statsData.totalSales - statsData.totalDiscounts).toFixed(2));
        statsData.totalSales = parseFloat(statsData.totalSales.toFixed(2));
        statsData.totalDiscounts = parseFloat(statsData.totalDiscounts.toFixed(2));
        
        
        salesData.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        
        return res.status(200).json({
            success: true,
            sales: salesData,
            stats: statsData,
            filters: {
                period,
                startDate,
                endDate,
                category
            }
        });
        
    } catch (error) {
        console.error('Error generating sales report:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while generating the sales report',
            error: error.message
        });
    }
};

module.exports = {
    loadSalesReport,
    getSalesReport
}
