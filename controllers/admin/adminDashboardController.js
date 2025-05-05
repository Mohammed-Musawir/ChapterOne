const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');
const Category = require('../../models/userSchema');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

// Helper function to format date ranges
const getDateRange = (period) => {
    const now = new Date();
    let startDate, endDate = now;
    
    switch(period) {
        case 'weekly':
            // Last 7 days
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            break;
        case 'monthly':
            // Last 30 days
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 30);
            break;
        case 'yearly':
            // Last 12 months
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 12);
            break;
        default:
            // Default to weekly
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
    }
    
    return { startDate, endDate };
};

// Helper function to generate chart labels
const generateChartLabels = (period, startDate, endDate) => {
    const labels = [];
    const currentDate = new Date(startDate);
    
    switch(period) {
        case 'weekly':
            // Generate day labels for the past 7 days
            while (currentDate <= endDate) {
                labels.push(currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
                currentDate.setDate(currentDate.getDate() + 1);
            }
            break;
        case 'monthly':
            // Generate labels for each day in the past 30 days
            while (currentDate <= endDate) {
                labels.push(currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                currentDate.setDate(currentDate.getDate() + 1);
            }
            break;
        case 'yearly':
            // Generate month labels for the past 12 months
            while (currentDate <= endDate) {
                labels.push(currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
            break;
        default:
            // Default to weekly
            while (currentDate <= endDate) {
                labels.push(currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
                currentDate.setDate(currentDate.getDate() + 1);
            }
    }
    
    return labels;
};

// Main dashboard controller
const getDashboard = async (req, res) => {
    try {
        // Get date range for default period (weekly)
        const { startDate, endDate } = getDateRange('weekly');
        
        // Get total orders
        const totalOrders = await Order.countDocuments();
        
        // Get total revenue
        const revenueData = await Order.aggregate([
            {
                $match: {
                    paymentStatus: 'completed'
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalAmount' }
                }
            }
        ]);
        
        const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;
        
        // Get total products
        const totalProducts = await Product.countDocuments();
        
        // Get total customers
        const totalCustomers = await User.countDocuments({ isBlocked: false });
        
        // Get top 10 best selling products
        const topProducts = await Order.aggregate([
            {
                $match: {
                    paymentStatus: 'completed'
                }
            },
            {
                $unwind: '$products'
            },
            {
                $group: {
                    _id: '$products.product',
                    totalSold: { $sum: '$products.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$products.price', '$products.quantity'] } }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            {
                $unwind: '$productDetails'
            },
            {
                $project: {
                    _id: 1,
                    name: '$productDetails.name',
                    writer: '$productDetails.writer',
                    totalSold: 1,
                    totalRevenue: 1
                }
            },
            {
                $sort: { totalSold: -1 }
            },
            {
                $limit: 10
            }
        ]);
        
        // Get top 10 best selling categories
        const topCategories = await Order.aggregate([
            {
                $match: {
                    paymentStatus: 'completed'
                }
            },
            {
                $unwind: '$products'
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            {
                $unwind: '$productDetails'
            },
            {
                $group: {
                    _id: '$productDetails.category_id',
                    totalSold: { $sum: '$products.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$products.price', '$products.quantity'] } }
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'categoryDetails'
                }
            },
            {
                $unwind: '$categoryDetails'
            },
            {
                $project: {
                    _id: 1,
                    name: '$categoryDetails.name',
                    totalSold: 1,
                    totalRevenue: 1
                }
            },
            {
                $sort: { totalSold: -1 }
            },
            {
                $limit: 10
            }
        ]);
        
        // Get chart data for weekly period (default)
        const chartData = await getChartData('weekly');
        
        // Render dashboard with data
        res.render('Admin/adminDashboard', {
            totalOrders,
            totalRevenue,
            totalProducts,
            totalCustomers,
            topProducts,
            topCategories,
            chartData
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).render('admin/error', {
            message: 'Failed to load dashboard data',
            error: error.message
        });
    }
};

// Controller for fetching chart data based on period
const getChartDataa = async (req, res) => {
    try {
        const period = req.query.period || 'weekly';
        const chartData = await getChartData(period);
        
        res.json({
            success: true,
            ...chartData
        });
    } catch (error) {
        console.error('Error fetching chart data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch chart data',
            error: error.message
        });
    }
};

// Helper function to get chart data
async function getChartData(period) {
    const { startDate, endDate } = getDateRange(period);
    const labels = generateChartLabels(period, startDate, endDate);
    
    // Initialize values array with zeros
    const values = new Array(labels.length).fill(0);
    
    // Get sales data for the period
    let salesData;
    
    if (period === 'yearly') {
        // Group by month for yearly data
        salesData = await Order.aggregate([
            {
                $match: {
                    paymentStatus: 'completed',
                    orderedDate: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$orderedDate' },
                        month: { $month: '$orderedDate' }
                    },
                    totalAmount: { $sum: '$totalAmount' }
                }
            },
            {
                $sort: {
                    '_id.year': 1,
                    '_id.month': 1
                }
            }
        ]);
        
        // Map sales data to values array
        salesData.forEach(item => {
            const date = new Date(item._id.year, item._id.month - 1, 1);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            const index = labels.indexOf(dateStr);
            
            if (index !== -1) {
                values[index] = item.totalAmount;
            }
        });
    } else if (period === 'monthly') {
        // Group by day for monthly data
        salesData = await Order.aggregate([
            {
                $match: {
                    paymentStatus: 'completed',
                    orderedDate: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$orderedDate' },
                        month: { $month: '$orderedDate' },
                        day: { $dayOfMonth: '$orderedDate' }
                    },
                    totalAmount: { $sum: '$totalAmount' }
                }
            },
            {
                $sort: {
                    '_id.year': 1,
                    '_id.month': 1,
                    '_id.day': 1
                }
            }
        ]);
        
        // Map sales data to values array
        salesData.forEach(item => {
            const date = new Date(item._id.year, item._id.month - 1, item._id.day);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const index = labels.indexOf(dateStr);
            
            if (index !== -1) {
                values[index] = item.totalAmount;
            }
        });
    } else {
        // Group by day for weekly data
        salesData = await Order.aggregate([
            {
                $match: {
                    paymentStatus: 'completed',
                    orderedDate: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$orderedDate' },
                        month: { $month: '$orderedDate' },
                        day: { $dayOfMonth: '$orderedDate' }
                    },
                    totalAmount: { $sum: '$totalAmount' }
                }
            },
            {
                $sort: {
                    '_id.year': 1,
                    '_id.month': 1,
                    '_id.day': 1
                }
            }
        ]);
        
        // Map sales data to values array
        salesData.forEach(item => {
            const date = new Date(item._id.year, item._id.month - 1, item._id.day);
            const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const index = labels.indexOf(dateStr);
            
            if (index !== -1) {
                values[index] = item.totalAmount;
            }
        });
    }
    
    return { labels, values };
}

module.exports = {
  getDashboard,
  getChartDataa
}