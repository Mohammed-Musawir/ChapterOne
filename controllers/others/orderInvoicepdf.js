const PDFDocument = require('pdfkit');
const Order = require('../../models/orderSchema')

/**
 * Controller to generate and download invoice PDF
 */
const downloadInvoice = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const { orderId } = req.params;

        // Fetch order data with populated product details
        const order = await Order.findOne({ orderId, userId }).populate('products.product');
        if (!order) return res.status(404).send("Order not found");

        // Set headers for download BEFORE creating any response data
        res.setHeader('Content-disposition', `attachment; filename="Invoice_${orderId}.pdf"`);
        res.setHeader('Content-type', 'application/pdf');

        // Set up PDF document
        const doc = new PDFDocument({ 
            margin: 50, 
            size: 'A4'
        });
        
        // Pipe the PDF directly to the response
        doc.pipe(res);
        
        // Define theme colors
        const theme = {
            primary: '#3366CC',      // Blue - primary color
            secondary: '#F5F5F5',    // Light gray for backgrounds
            text: '#333333',         // Dark gray for text
            highlight: '#E6F0FF',    // Light blue for highlights
            accent: '#FF9900',       // Orange for accents
            success: '#4CAF50'       // Green for success indicators
        };
        
        // Generate PDF content
        generateInvoicePDF(doc, order, theme);
        
        // Finalize the PDF - this will close the stream and send to client
        doc.end();
    } catch (error) {
        console.error("Error generating invoice:", error);
        if (!res.headersSent) {
            res.status(500).send("Failed to generate invoice.");
        } else {
            res.end();
        }
    }
};

/**
 * Main function to generate the invoice PDF
 */
function generateInvoicePDF(doc, order, theme) {
    // Add page elements
    addHeader(doc, theme);
    addInvoiceTitle(doc, theme);
    addInvoiceDetails(doc, order, theme);
    
    // Customer and shipping info
    const infoStartY = 220;
    addCustomerInformation(doc, order, theme, infoStartY);
    
    // Product table position
    const tableStartY = 320;
    addOrderDetails(doc, order, theme, tableStartY);
    
    // Calculate position for totals section
    const tableEndY = doc.y + 20;
    addTotalsSection(doc, order, theme, tableEndY);
    
    // Add payment section
    const paymentY = doc.y + 20;
    addPaymentInformation(doc, order, theme, paymentY);
    
    // Add footer
    createFooter(doc, theme);
}

/**
 * Add header with company name
 */
function addHeader(doc, theme) {
    doc.rect(0, 0, doc.page.width, 100).fill(theme.primary);
    
    doc.fontSize(24)
       .fillColor('#FFFFFF')
       .font('Helvetica-Bold')
       .text('ChapterOne Bookstore', 50, 40);
       
    doc.fontSize(10)
       .fillColor('#FFFFFF')
       .font('Helvetica')
       .text('Your Reading Journey Begins Here', 50, 70);
}

/**
 * Add invoice title
 */
function addInvoiceTitle(doc, theme) {
    doc.fontSize(20)
       .fillColor(theme.primary)
       .font('Helvetica-Bold')
       .text('INVOICE', 50, 120);
       
    doc.moveTo(50, 145)
       .lineTo(550, 145)
       .stroke(theme.primary);
}

/**
 * Add invoice details in a box
 */
function addInvoiceDetails(doc, order, theme) {
    const boxY = 160;
    
    // Add invoice details
    doc.fillColor(theme.text)
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('Invoice Number:', 50, boxY);
       
    doc.font('Helvetica')
       .text(order.orderId, 150, boxY);
    
    // Transaction ID
    doc.font('Helvetica-Bold')
       .text('Transaction ID:', 50, boxY + 20);
       
    doc.font('Helvetica')
       .text(order.transactionId, 150, boxY + 20);
    
    // Order Date
    const orderDate = order.orderedDate ? new Date(order.orderedDate) : new Date();
    
    doc.font('Helvetica-Bold')
       .text('Date:', 50, boxY + 40);
       
    doc.font('Helvetica')
       .text(orderDate.toLocaleDateString('en-US', {
           year: 'numeric',
           month: 'long',
           day: 'numeric'
       }), 150, boxY + 40);
    
    // Status
    doc.font('Helvetica-Bold')
       .text('Status:', 350, boxY);
       
    const statusColor = getStatusColor(order.orderStatus, theme);
    doc.font('Helvetica')
       .fillColor(statusColor)
       .text(order.orderStatus.toUpperCase(), 410, boxY);
       
    // Reset text color
    doc.fillColor(theme.text);
}

/**
 * Add customer information section
 */
function addCustomerInformation(doc, order, theme, startY) {
    doc.rect(50, startY, doc.page.width - 100, 80)
       .fill(theme.secondary);
    
    doc.fillColor(theme.primary)
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('CUSTOMER INFORMATION', 60, startY + 10);
    
    doc.fillColor(theme.text)
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('Billing Address:', 60, startY + 30);
    
    // Customer info
    const customerName = order.shippingAddress?.fullName || 'Customer';
    const customerPhone = order.shippingAddress?.alternative_no || 'N/A';
    
    doc.font('Helvetica')
       .text(customerName, 150, startY + 30);
       
    doc.text(`Phone: ${customerPhone}`, 150, startY + 45);
    
    // Shipping address
    doc.font('Helvetica-Bold')
       .text('Shipping Address:', 350, startY + 30);
    
    const address = order.shippingAddress || {};
    const addressLine1 = `${address.houseNumber || ''}, ${address.street || ''}`.trim();
    const addressLine2 = `${address.landmark || ''}, ${address.city || ''}`.trim();
    const addressLine3 = `${address.state || ''} - ${address.pincode || ''}`.trim();
    
    doc.font('Helvetica')
       .text(addressLine1, 450, startY + 30);
    
    doc.text(addressLine2, 450, startY + 45);
    
    doc.text(addressLine3, 450, startY + 60);
}

/**
 * Add order details with table
 */
function addOrderDetails(doc, order, theme, startY) {
    doc.fontSize(12)
       .fillColor(theme.primary)
       .font('Helvetica-Bold')
       .text("ORDER ITEMS", 50, startY);
    
    // Create product table
    createProductTable(doc, order, startY + 20, theme);
}

/**
 * Create product table
 */
function createProductTable(doc, order, tableTop, theme) {
    // Ensure products array exists
    const products = order.products || [];
    if (products.length === 0) {
        doc.fillColor(theme.text)
           .fontSize(10)
           .font('Helvetica-Oblique')
           .text("No products found in this order.", 50, tableTop + 20);
        doc.y = tableTop + 40; // Update cursor position
        return;
    }
    
    // Table header
    const headerHeight = 25;
    doc.rect(50, tableTop, doc.page.width - 100, headerHeight)
       .fill(theme.primary);
    
    // Column definitions
    const columns = [
        { text: "Product", x: 60, width: 200 },
        { text: "Writer", x: 260, width: 100 },
        { text: "Qty", x: 370, width: 40 },
        { text: "Price", x: 420, width: 80 },
        { text: "Total", x: 500, width: 80 }
    ];
    
    // Header text
    doc.fillColor('#FFFFFF')
       .fontSize(10)
       .font('Helvetica-Bold');
    
    columns.forEach(col => {
        doc.text(col.text, col.x, tableTop + 8);
    });
    
    // Table rows
    let y = tableTop + headerHeight;
    const rowHeight = 30;
    
    products.forEach((item, i) => {
        const isEven = i % 2 === 0;
        const rowY = y + (i * rowHeight);
        
        // Row background
        doc.rect(50, rowY, doc.page.width - 100, rowHeight)
           .fill(isEven ? theme.highlight : theme.secondary);
        
        // Product details
        const productName = item.productDetails?.name || 'Unknown Product';
        const writer = item.productDetails?.writer || 'Unknown Author';
        const quantity = item.quantity || 0;
        const price = item.price || 0;
        const total = quantity * price;
        
        doc.fillColor(theme.text)
           .fontSize(9)
           .font('Helvetica');
        
        // Product name
        doc.text(productName, columns[0].x, rowY + 10, { 
            width: columns[0].width,
            ellipsis: true
        });
        
        // Writer
        doc.text(writer, columns[1].x, rowY + 10, {
            width: columns[1].width,
            ellipsis: true
        });
        
        // Quantity
        doc.text(quantity.toString(), columns[2].x, rowY + 10);
        
        // Price
        doc.text(`Rs. ${formatNumber(price)}`, columns[3].x, rowY + 10);
        
        // Total
        doc.font('Helvetica-Bold')
           .text(`Rs. ${formatNumber(total)}`, columns[4].x, rowY + 10);
    });
    
    // Update cursor position
    doc.y = y + (products.length * rowHeight);
}

/**
 * Add totals section
 */
function addTotalsSection(doc, order, theme, startY) {
    const boxWidth = 250;
    const boxX = doc.page.width - boxWidth - 50;
    
    // Safely get values
    const subtotal = order.subtotal || 0;
    const gstRate = order.gstRate || 18;
    const gstAmount = order.gstAmount || (subtotal * gstRate / 100);
    const shippingCost = order.shippingCost || 0;
    const totalAmount = order.totalAmount || (subtotal + gstAmount + shippingCost);
    
    doc.font('Helvetica')
       .fontSize(10)
       .fillColor(theme.text);
    
    // Draw lines
    const linePositions = [
        { label: 'Subtotal:', value: `Rs. ${formatNumber(subtotal)}`, y: startY },
        { label: `GST (${gstRate}%):`, value: `Rs. ${formatNumber(gstAmount)}`, y: startY + 20 },
        { label: 'Shipping:', value: `Rs. ${formatNumber(shippingCost)}`, y: startY + 40 }
    ];
    
    linePositions.forEach(line => {
        doc.text(line.label, boxX, line.y);
        doc.text(line.value, boxX + boxWidth - 80, line.y, { width: 80, align: 'right' });
    });
    
    // Draw divider line
    doc.moveTo(boxX, startY + 60)
       .lineTo(boxX + boxWidth, startY + 60)
       .stroke(theme.primary);
    
    // Total amount
    doc.font('Helvetica-Bold')
       .fontSize(12)
       .fillColor(theme.primary)
       .text('TOTAL:', boxX, startY + 70);
       
    doc.text(`Rs. ${formatNumber(totalAmount)}`, boxX + boxWidth - 80, startY + 70, { 
        width: 80, 
        align: 'right' 
    });
    
    // Update cursor position
    doc.y = startY + 90;
}

/**
 * Add payment information
 */
function addPaymentInformation(doc, order, theme, startY) {
    doc.rect(50, startY, 250, 60)
       .fill(theme.secondary);
    
    doc.fillColor(theme.primary)
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('PAYMENT INFORMATION', 60, startY + 10);
    
    // Payment method
    const paymentMethod = getPaymentMethodName(order.paymentMethod);
    
    doc.fillColor(theme.text)
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('Payment Method:', 60, startY + 30);
       
    doc.font('Helvetica')
       .text(paymentMethod, 150, startY + 30);
    
    // Payment status
    doc.font('Helvetica-Bold')
       .text('Payment Status:', 60, startY + 45);
       
    const statusColor = getStatusColor(order.paymentStatus, theme);
    doc.font('Helvetica')
       .fillColor(statusColor)
       .text(capitalizeFirstLetter(order.paymentStatus), 150, startY + 45);
    
    // Update cursor position
    doc.y = startY + 70;
}

/**
 * Add footer
 */
function createFooter(doc, theme) {
    const footerTop = doc.page.height - 80;
    
    doc.moveTo(50, footerTop)
       .lineTo(doc.page.width - 50, footerTop)
       .stroke(theme.primary);
    
    doc.fontSize(10)
       .fillColor(theme.primary)
       .font('Helvetica-Bold')
       .text("Thank you for shopping with ChapterOne Bookstore!", 50, footerTop + 10, { 
           align: 'center',
           width: doc.page.width - 100
       });
    
    doc.fontSize(8)
       .fillColor(theme.text)
       .font('Helvetica')
       .text("For any questions about your order, please contact us at chapterone@gmail.com", 50, footerTop + 30, { 
           align: 'center',
           width: doc.page.width - 100
       });
    
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 50, footerTop + 45, { 
        align: 'center',
        width: doc.page.width - 100
    });
}

/**
 * Helper function to get status color
 */
function getStatusColor(status, theme) {
    if (!status) return theme.accent;
    
    switch (status.toLowerCase()) {
        case 'delivered':
        case 'completed':
            return theme.success;
        case 'cancelled':
        case 'failed':
            return '#D32F2F';
        default:
            return theme.accent;
    }
}

/**
 * Helper function to format numbers with comma separators
 */
function formatNumber(value) {
    if (value === undefined || value === null) value = 0;
    
    return parseFloat(value).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Helper function for payment method names
 */
function getPaymentMethodName(method) {
    if (!method) return 'Unknown';
    
    const methods = {
        'cod': 'Cash on Delivery',
        'razorPay': 'RazorPay',
        'wallet': 'Wallet',
        'upi': 'UPI Payment'
    };
    
    return methods[method] || method;
}

/**
 * Helper function to capitalize first letter
 */
function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

module.exports = downloadInvoice;