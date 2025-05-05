const Category = require('../../models/categorySchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const mongoose = require('mongoose')


const loadSalesReport = async (req, res) => {
    try {
        // Fetch all categories for the filter dropdown
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
        // Extract query parameters
        const { period, startDate, endDate, category } = req.query;
        
        // Validate date parameters
        if (!startDate || !endDate) {
            return res.status(400).json({ 
                success: false, 
                message: 'Start date and end date are required' 
            });
        }
        
        // Create date objects and set time to start and end of day
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        // Build filter query
        const dateFilter = {
            orderedDate: { $gte: start, $lte: end },
            paymentStatus: 'completed' // Only include paid orders
        };
        
        // Fetch orders matching the date filter
        const orders = await Order.find(dateFilter).lean();
        
        // Fetch all categories for reference
        const categories = await Category.find().lean();
        const categoryMap = {};
        categories.forEach(cat => {
            categoryMap[cat._id.toString()] = cat.name;
        });
        
        // Get unique product IDs from all orders
        const productIds = new Set();
        orders.forEach(order => {
            order.products.forEach(item => {
                if (item.product) {
                    productIds.add(item.product.toString());
                }
            });
        });
        
        // Fetch all products from these orders
        const products = await Product.find({
            _id: { $in: Array.from(productIds) }
        }).lean();
        
        // Create product map for easy lookup
        const productMap = {};
        products.forEach(product => {
            productMap[product._id.toString()] = product;
        });
        
        // Process orders to extract sales data
        let salesData = [];
        let statsData = {
            totalOrders: 0,
            totalSales: 0,
            totalDiscounts: 0,
            netRevenue: 0
        };
        
        // Process each order
        for (const order of orders) {
            let includeThisOrderInCount = false;
            let processedProducts = 0;
            
            // Process each product in the order
            for (const item of order.products) {
                // Skip cancelled items
                if (item.productOrderStatus === 'cancelled') continue;
                
                const productId = item.product ? item.product.toString() : null;
                if (!productId || !productMap[productId]) continue;
                
                const product = productMap[productId];
                const productCategoryId = product.category_id ? product.category_id.toString() : null;
                
                // If category filter is applied, skip products not in that category
                if (category && productCategoryId !== category.toString()) {
                    continue;
                }
                
                // We've found a matching product, so process it
                processedProducts++;
                includeThisOrderInCount = true;
                
                // Get category name
                let categoryName = 'Uncategorized';
                if (productCategoryId && categoryMap[productCategoryId]) {
                    categoryName = categoryMap[productCategoryId];
                }
                
                // Calculate product's share of the discount
                const itemTotal = item.price * item.quantity;
                const orderSubtotal = order.subtotal || 0;
                const orderDiscount = order.coupon ? order.coupon.discount || 0 : 0;
                const itemDiscountShare = orderDiscount > 0 && orderSubtotal > 0 ? 
                    (itemTotal / orderSubtotal) * orderDiscount : 0;
                
                // Add to sales data array
                salesData.push({
                    date: order.orderedDate,
                    orderId: order.orderId,
                    category: categoryName,
                    product: item.productDetails ? item.productDetails.name : product.name || 'Unknown Product',
                    quantity: item.quantity,
                    price: parseFloat(item.price.toFixed(2)),
                    discount: parseFloat(itemDiscountShare.toFixed(2)),
                    coupon: order.coupon ? order.coupon.couponCode : null,
                    total: parseFloat((itemTotal - itemDiscountShare).toFixed(2))
                });
                
                // Update overall stats
                statsData.totalSales += itemTotal;
                statsData.totalDiscounts += itemDiscountShare;
            }
            
            // If we processed any products from this order, increment order count
            if (includeThisOrderInCount && processedProducts > 0) {
                statsData.totalOrders += 1;
            }
        }
        
        // Calculate net revenue
        statsData.netRevenue = parseFloat((statsData.totalSales - statsData.totalDiscounts).toFixed(2));
        statsData.totalSales = parseFloat(statsData.totalSales.toFixed(2));
        statsData.totalDiscounts = parseFloat(statsData.totalDiscounts.toFixed(2));
        
        // Sort data by date
        salesData.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Return the response
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