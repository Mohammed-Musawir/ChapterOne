const orderModel = require('../../models/orderSchema');
const PDFDocument = require('pdfkit');

/**
 * Controller to generate and download invoice PDF
 */
const downloadInvoice = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const { orderId } = req.params;

        // Fetch order data with populated product details
        const order = await orderModel.findOne({ orderId, userId }).populate('products.product');
        if (!order) return res.status(404).send("Order not found");

        // Set headers for download BEFORE creating any response data
        res.setHeader('Content-disposition', `attachment; filename="Invoice_${orderId}.pdf"`);
        res.setHeader('Content-type', 'application/pdf');

        // Set up PDF document
        const doc = new PDFDocument({ 
            margin: 50, 
            size: 'A4', 
            bufferPages: true,
            autoFirstPage: true,
            layout: 'portrait'
        });
        
        // Pipe the PDF directly to the response
        doc.pipe(res);
        
        // Define theme colors with higher contrast
        const theme = {
            primary: '#8B4513',      // Saddle brown - primary color
            secondary: '#F5F5DC',    // Beige for backgrounds
            text: '#333333',         // Darker text for better readability
            highlight: '#FFF8E7',    // Very light cream for highlights
            accent: '#D2691E',       // Chocolate brown for accents
            success: '#2E8B57',      // Sea green for success indicators
            lightBorder: '#D2B48C'   // Tan for light borders
        };
        
        // Generate PDF content
        generateInvoicePDF(doc, order, theme);
        
        // Finalize the PDF - this will close the stream and send to client
        doc.end();
    } catch (error) {
        console.error("Error generating invoice:", error);
        // Only send error response if headers haven't been sent yet
        if (!res.headersSent) {
            res.status(500).send("Failed to generate invoice.");
        } else {
            // If headers were sent but document stream is broken, we need to end the response
            res.end();
        }
    }
};

/**
 * Main function to generate the invoice PDF with fixed structure
 */
function generateInvoicePDF(doc, order, theme) {
    // Add page elements in proper sequence
    addBackground(doc, theme);
    drawHeader(doc, theme);
    addInvoiceTitle(doc, theme);
    addInvoiceDetails(doc, order, theme);
    
    // Customer and shipping info on the same horizontal line
    const infoStartY = 240;
    addCustomerInformation(doc, order, theme, infoStartY);
    addShippingInformation(doc, order, theme, infoStartY);
    
    // Product table position
    const tableStartY = 350;
    addOrderDetails(doc, order, theme, tableStartY);
    
    // Calculate position for totals section
    const tableEndY = Math.max(doc.y + 10, tableStartY + 40); // Ensure minimum space after header
    addTotalsSection(doc, order, theme, tableEndY);
    
    // Add payment section after totals
    const paymentY = doc.y + 20;
    addPaymentInformation(doc, order, theme, paymentY);
    
    // Add footer at fixed position
    createFooter(doc, theme);
}

/**
 * Add structured background with consistent styling
 */
function addBackground(doc, theme) {
    // White base background
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#ffffff');
    
    // Add header area with consistent height
    doc.polygon(
        [0, 0],
        [doc.page.width, 0],
        [doc.page.width, 100],
        [0, 120]
    ).fill(theme.secondary);
    
    // Left side accent with fixed width
    doc.rect(0, 0, 15, doc.page.height).fill(theme.primary);
    
    // Bottom accent with fixed dimensions
    doc.polygon(
        [0, doc.page.height - 80],
        [doc.page.width, doc.page.height - 100],
        [doc.page.width, doc.page.height],
        [0, doc.page.height]
    ).fill(theme.secondary);
}

/**
 * Draw header with company logo - properly sized and positioned
 */
function drawHeader(doc, theme) {
    const centerX = doc.page.width / 2;
    const topY = 60; // Fixed position
    
    // Draw company logo/icon - stylized book with fixed dimensions
    // Outer book shape
    doc.roundedRect(centerX - 30, topY - 30, 60, 50, 8)
       .fillAndStroke(theme.primary, theme.accent);
    
    // Inner book pages
    doc.rect(centerX - 27, topY - 27, 54, 44)
       .fill('#ffffff');
       
    // Book spine
    doc.rect(centerX - 25, topY - 25, 10, 40)
       .fill(theme.accent);
       
    // Lines of text on the page - evenly spaced
    const lineColor = theme.lightBorder;
    const lineStartX = centerX - 10;
    const lineSpacing = 7;
    
    for (let i = 0; i < 5; i++) {
        const lineWidth = [35, 30, 40, 25, 35][i];
        doc.rect(lineStartX, topY - 20 + (i * lineSpacing), lineWidth, 2)
           .fill(lineColor);
    }
}

/**
 * Add invoice title with proper spacing and alignment
 */
function addInvoiceTitle(doc, theme) {
    const titleTopPosition = 130; // Fixed position
    
    // Add title with consistent font size
    doc.fontSize(28)
       .fillColor(theme.primary)
       .font('Helvetica-Bold')
       .text('INVOICE', {
           align: 'center',
           width: doc.page.width - 100
       });
    
    // Add store name
    doc.fontSize(20)
       .fillColor(theme.text)
       .font('Helvetica-Bold')
       .text("ChapterOne Bookstore", {
           align: 'center',
           width: doc.page.width - 100
       });
    
    // Draw horizontal decorative line
    const lineY = titleTopPosition + 75;
    const lineWidth = 350;
    const lineStart = (doc.page.width - lineWidth) / 2;
    
    doc.strokeColor(theme.primary)
       .lineWidth(2)
       .moveTo(lineStart, lineY)
       .lineTo(lineStart + lineWidth, lineY)
       .stroke();
    
    // Add small accent dots
    doc.circle(lineStart - 5, lineY, 3).fill(theme.accent);
    doc.circle(lineStart + lineWidth + 5, lineY, 3).fill(theme.accent);
}

/**
 * Add invoice details in a styled box
 */
function addInvoiceDetails(doc, order, theme) {
    const detailsTop = 210; // Fixed position
    const boxWidth = 260;
    
    // Create styling box
    doc.roundedRect(50, detailsTop, boxWidth, 80, 8)
       .fillAndStroke(theme.secondary, theme.primary);
    
    // Add invoice details
    doc.fillColor(theme.text)
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('INVOICE DETAILS', 70, detailsTop + 15);
       
    doc.font('Helvetica')
       .fontSize(10)
       .text(`Invoice #: ${order.orderId}`, 70, detailsTop + 35);
    
    doc.text(`Transaction ID: ${order.transactionId}`, 70, detailsTop + 50);
    
    // Format date properly
    const orderDate = order.orderedDate ? new Date(order.orderedDate) : new Date();
    doc.text(`Date: ${orderDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })}`, 70, detailsTop + 65);
    
    // Add status badge
    const statusX = doc.page.width - 170;
    const statusY = detailsTop + 15;
    const statusWidth = 120;
    const statusColor = getStatusColor(order.orderStatus, theme);
    
    doc.roundedRect(statusX, statusY, statusWidth, 25, 12)
       .fill(statusColor);
       
    doc.fillColor('#ffffff')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text(order.orderStatus.toUpperCase(), statusX, statusY + 7, { 
           align: 'center',
           width: statusWidth
       });
}

/**
 * Add customer information section
 */
function addCustomerInformation(doc, order, theme, startY) {
    const boxWidth = (doc.page.width - 150) / 2;
    
    // Add left box for customer info
    doc.roundedRect(50, startY, boxWidth, 90, 8)
       .fillAndStroke(theme.highlight, theme.primary);
    
    doc.fillColor(theme.primary)
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('BILL TO', 70, startY + 15);
    
    // Safely access customer info
    const customerName = order.shippingAddress?.fullName || 'Customer';
    const customerPhone = order.shippingAddress?.alternative_no || 'N/A';
    
    doc.fillColor(theme.text)
       .fontSize(10)
       .font('Helvetica')
       .text(customerName, 70, startY + 35, {
           width: boxWidth - 40,
           ellipsis: true
       });
       
    doc.text(`Phone: ${customerPhone}`, 70, startY + 50);
}

/**
 * Add shipping information section
 */
function addShippingInformation(doc, order, theme, startY) {
    const boxWidth = (doc.page.width - 150) / 2;
    const boxX = doc.page.width - boxWidth - 50;
    
    // Add right box for shipping address
    doc.roundedRect(boxX, startY, boxWidth, 90, 8)
       .fillAndStroke(theme.highlight, theme.primary);
    
    doc.fillColor(theme.primary)
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('SHIP TO', boxX + 20, startY + 15);
    
    // Format address parts safely
    const addressX = boxX + 20;
    const maxWidth = boxWidth - 40;
    
    doc.fillColor(theme.text)
       .fontSize(10)
       .font('Helvetica');
    
    // Safely access shipping address
    const address = order.shippingAddress || {};
    
    // Line 1: House number & street
    const line1 = `${address.houseNumber || ''}, ${address.street || ''}`.trim();
    doc.text(line1 || 'Address Line 1', addressX, startY + 35, {
        width: maxWidth,
        ellipsis: true
    });
    
    // Line 2: Landmark
    doc.text(address.landmark || 'Address Line 2', addressX, startY + 50, {
        width: maxWidth,
        ellipsis: true
    });
    
    // Line 3: City, State & Pincode
    const line3 = [
        address.city || '',
        address.state || '',
        address.pincode ? `- ${address.pincode}` : ''
    ].filter(Boolean).join(', ');
    
    doc.text(line3 || 'City, State - Pincode', addressX, startY + 65, {
        width: maxWidth,
        ellipsis: true
    });
             
    // Add address type badge
    const badgeWidth = 60;
    const badgeX = boxX + boxWidth - badgeWidth - 10;
    const badgeY = startY + 10;
    
    // Only add badge if address type exists
    if (address.addressType) {
        doc.roundedRect(badgeX, badgeY, badgeWidth, 20, 10)
           .fill(theme.accent);
           
        doc.fillColor('#ffffff')
           .fontSize(8)
           .font('Helvetica-Bold')
           .text(address.addressType.toUpperCase(), badgeX, badgeY + 6, {
               align: 'center',
               width: badgeWidth
           });
    }
}

/**
 * Add order details with table
 */
function addOrderDetails(doc, order, theme, startY) {
    doc.fontSize(14)
       .fillColor(theme.primary)
       .font('Helvetica-Bold')
       .text("ORDER DETAILS", 50, startY);
    
    // Create product table
    createProductTable(doc, order, startY + 30, theme);
}

/**
 * Create product table with consistent row heights
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
    
    // Table header with fixed height
    const headerHeight = 30;
    doc.roundedRect(50, tableTop, doc.page.width - 100, headerHeight, 5)
       .fill(theme.primary);
    
    // Header text with consistent positioning
    doc.fillColor('#ffffff')
       .fontSize(10)
       .font('Helvetica-Bold');
    
    // Fixed column layout with consistent widths
    const columns = [
        { text: "Product", x: 70, width: 220 },
        { text: "Writer", x: 300, width: 100 },
        { text: "Qty", x: 400, width: 40 },
        { text: "Price", x: 445, width: 60 },
        { text: "Total", x: 510, width: 60 }
    ];
    
    // Add header text with vertical centering
    columns.forEach(col => {
        doc.text(col.text, col.x, tableTop + (headerHeight / 2) - 5);
    });
    
    // Table rows with fixed dimensions
    let y = tableTop + headerHeight;
    const standardRowHeight = 40; // Fixed height for consistency
    
    products.forEach((item, i) => {
        const isEven = i % 2 === 0;
        
        // Get product details safely
        const productName = item.productDetails?.name || item.product?.name || 'Unknown Product';
        const writer = item.productDetails?.writer || item.product?.writer || 'Unknown Author';
        const quantity = item.quantity || 0;
        const price = item.price || 0;
        
        // Check if we need a new page
        if (y + standardRowHeight > doc.page.height - 150) {
            doc.addPage();
            addBackground(doc, theme);
            y = 50;
        }
        
        // Row background with consistent dimensions
        doc.roundedRect(50, y, doc.page.width - 100, standardRowHeight, 3)
           .fill(isEven ? theme.highlight : theme.secondary);
        
        // Product status badge if applicable
        if (item.productOrderStatus && item.productOrderStatus !== 'pending') {
            const statusColor = getStatusColor(item.productOrderStatus, theme);
            
            const badgeWidth = 70;
            const badgeX = 55;
            const badgeY = y + 5;
            
            doc.roundedRect(badgeX, badgeY, badgeWidth, 15, 7)
               .fill(statusColor);
               
            doc.fillColor('#ffffff')
               .fontSize(7)
               .font('Helvetica-Bold')
               .text(item.productOrderStatus.toUpperCase(), badgeX, badgeY + 4, {
                   align: 'center',
                   width: badgeWidth
               });
        }
        
        // Row text
        doc.fillColor(theme.text)
           .fontSize(9)
           .font('Helvetica-Bold');
        
        // Product name
        doc.text(productName, 70, y + 10, { 
            width: columns[0].width,
            align: 'left',
            ellipsis: true
        });
        
        // Writer name
        doc.font('Helvetica');
        doc.text(writer, columns[1].x, y + 10, {
            width: columns[1].width,
            ellipsis: true
        });
        
        // Quantity, price and total
        const centerY = y + (standardRowHeight / 2) - 5;
        doc.text(quantity.toString(), columns[2].x, centerY, {
            align: 'center',
            width: columns[2].width
        });
        
        // Price with proper formatting
        const formattedPrice = `Rs. ${formatNumber(price)}`;
        doc.text(formattedPrice, columns[3].x, centerY, {
            align: 'right',
            width: columns[3].width
        });
        
        // Total with consistent formatting
        doc.font('Helvetica-Bold');
        const totalPrice = quantity * price;
        const formattedTotal = `Rs. ${formatNumber(totalPrice)}`;
        doc.text(formattedTotal, columns[4].x, centerY, {
            align: 'right',
            width: columns[4].width
        });
        
        y += standardRowHeight;
    });
    
    // Update cursor position
    doc.y = y;
}

/**
 * Add totals section with fixed layout
 */
function addTotalsSection(doc, order, theme, startY) {
    // Check if we need a new page
    if (startY > doc.page.height - 200) {
        doc.addPage();
        addBackground(doc, theme);
        startY = 50;
    }

    // Create totals box with fixed dimensions
    const totalsBoxWidth = 300;
    const totalsBoxHeight = 120;
    const totalsBoxX = doc.page.width - totalsBoxWidth - 50;
    
    doc.roundedRect(totalsBoxX, startY, totalsBoxWidth, totalsBoxHeight, 8)
       .fillAndStroke(theme.highlight, theme.primary);
    
    // Text positioning with fixed coordinates
    const leftColumnX = totalsBoxX + 20;
    const rightColumnX = totalsBoxX + 150;
    const valueWidth = totalsBoxWidth - 170;
    
    // Safely get values with defaults
    const subtotal = order.subtotal || 0;
    const gstRate = order.gstRate || 0;
    const gstAmount = order.gstAmount || 0;
    const shippingCost = order.shippingCost || 0;
    const totalAmount = order.totalAmount || (subtotal + gstAmount + shippingCost);
    
    // Add breakdown of costs with consistent spacing
    doc.fillColor(theme.text)
       .fontSize(10)
       .font('Helvetica')
       .text(`Subtotal:`, leftColumnX, startY + 15);
    
    doc.text(formatCurrency(subtotal), rightColumnX, startY + 15, { 
        align: 'right',
        width: valueWidth
    });
    
    // Add GST
    if (gstRate > 0) {
        doc.text(`GST (${gstRate}%):`, leftColumnX, startY + 35);
        doc.text(formatCurrency(gstAmount), rightColumnX, startY + 35, { 
            align: 'right',
            width: valueWidth
        });
    } else {
        doc.text(`Tax:`, leftColumnX, startY + 35);
        doc.text(formatCurrency(0), rightColumnX, startY + 35, { 
            align: 'right',
            width: valueWidth
        });
    }
    
    // Shipping
    doc.text(`Shipping:`, leftColumnX, startY + 55);
    doc.text(formatCurrency(shippingCost), rightColumnX, startY + 55, { 
        align: 'right',
        width: valueWidth
    });
    
    // Add divider line
    doc.strokeColor(theme.primary)
       .lineWidth(1)
       .moveTo(leftColumnX, startY + 75)
       .lineTo(totalsBoxX + totalsBoxWidth - 20, startY + 75)
       .stroke();
    
    // Add total
    doc.fillColor(theme.primary)
       .fontSize(14)
       .font('Helvetica-Bold')
       .text(`Total:`, leftColumnX, startY + 90);
    
    doc.text(formatCurrency(totalAmount), rightColumnX, startY + 90, { 
        align: 'right',
        width: valueWidth
    });
    
    // Update cursor position
    doc.y = startY + totalsBoxHeight;
}

/**
 * Add payment information with fixed positioning
 */
function addPaymentInformation(doc, order, theme, startY) {
    // Check if we need a new page
    if (startY > doc.page.height - 150) {
        doc.addPage();
        addBackground(doc, theme);
        startY = 50;
    }
    
    // Create payment info box with fixed dimensions
    const paymentBoxWidth = 250;
    const paymentBoxHeight = 80;
    
    doc.roundedRect(50, startY, paymentBoxWidth, paymentBoxHeight, 8)
       .fillAndStroke(theme.secondary, theme.primary);
    
    doc.fillColor(theme.primary)
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('PAYMENT INFORMATION', 70, startY + 15);
    
    // Payment method with safe default
    const paymentMethod = order.paymentMethod || 'N/A';
    
    doc.fillColor(theme.text)
       .fontSize(10)
       .font('Helvetica')
       .text(`Payment Method: ${getPaymentMethodName(paymentMethod)}`, 70, startY + 35);
    
    // Payment status with safe default
    const paymentStatus = order.paymentStatus || 'pending';
    const statusColor = getStatusColor(paymentStatus, theme);
                      
    doc.text(`Payment Status:`, 70, startY + 55);
    
    // Add status indicator
    doc.circle(170, startY + 59, 4).fill(statusColor);
    doc.text(capitalizeFirstLetter(paymentStatus), 180, startY + 55);
    
    // Update cursor position
    doc.y = startY + paymentBoxHeight;
}

/**
 * Add footer at fixed position
 */
function createFooter(doc, theme) {
    // Always place footer at bottom of page
    const footerTop = doc.page.height - 110;
    
    // Add decorative line
    doc.strokeColor(theme.primary)
       .lineWidth(2)
       .moveTo(70, footerTop - 10)
       .lineTo(doc.page.width - 70, footerTop - 10)
       .dash(5, { space: 5 })
       .stroke();
    
    // Thank you message
    doc.fontSize(12)
       .fillColor(theme.primary)
       .font('Helvetica-Bold')
       .text("Thank you for shopping with ChapterOne Bookstore!", 50, footerTop, { 
           align: 'center',
           width: doc.page.width - 100
       });
    
    // Subtitle
    doc.fontSize(9)
       .fillColor(theme.text)
       .font('Helvetica')
       .text("We appreciate your business and hope you enjoy your books!", 50, footerTop + 20, { 
           align: 'center',
           width: doc.page.width - 100
       });
    
    // Contact information
    doc.fontSize(8)
       .text("For any questions about your order, please contact us at chapterone@gmail.com", 50, footerTop + 40, { 
           align: 'center',
           width: doc.page.width - 100
       });
       
    doc.text("www.chapterone.com | +91 9037237330", 50, footerTop + 55, { 
        align: 'center',
        width: doc.page.width - 100
    });
    
    // Add QR code
    doc.roundedRect(50, footerTop + 5, 40, 40, 5)
       .lineWidth(1)
       .stroke(theme.primary);
    
    // QR code pattern
    doc.lineWidth(0.5);
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            if ((i + j) % 2 === 0) {
                doc.rect(55 + (j * 8), footerTop + 10 + (i * 8), 7, 7)
                   .fill(theme.primary);
            }
        }
    }
    
    // Add page number
    doc.fontSize(8)
       .fillColor(theme.text)
       .text(`Page ${doc.bufferedPageRange().start + 1}`, 
             doc.page.width - 100, doc.page.height - 20, 
             { align: 'right' });
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
 * Helper function to format currency values
 */
function formatCurrency(value) {
    if (value === undefined || value === null) value = 0;
    return `Rs. ${formatNumber(value)}`;
}

/**
 * Helper function to format numbers with comma separators
 */
function formatNumber(value) {
    if (value === undefined || value === null) value = 0;
    
    // Ensure proper number formatting for Indian currency
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
        'upi': 'UPI Payment',
        'wallet': 'Wallet'
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