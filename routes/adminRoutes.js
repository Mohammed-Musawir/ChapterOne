const express = require('express');
const router = express.Router();
const multer = require('../config/multer'); 
const errorController = require('../controllers/errorController');
const adminDashboardController = require('../controllers/admin/adminDashboardController');
const adminLoginController = require('../controllers/admin/adminLoginController');
const customerController = require('../controllers/admin/customerController');
const orderController = require('../controllers/admin/adminOrderController');
const categoryController = require('../controllers/admin/categoryController');
const coupenController = require('../controllers/admin/adminCoupenController');
const productController = require('../controllers/admin/productController');
const offerController = require('../controllers/admin/adminOfferController');
const salesreportController = require('../controllers/admin/adminSalesReportController');
const adminAuth = require('../middleware/adminAuth');



 
router.route("/login")
        .get(adminLoginController.loadAdminLogin)
        .post(adminLoginController.adminLogin); 

router.use(adminAuth.isAuthenticated);
router.get("/logout",adminAuth.isAuthenticated,adminLoginController.adminLogout);



router.get('/dashboard',adminDashboardController.getDashboard);
router.get('/dashboard/chart-data', adminDashboardController.getChartDataa);



router.get('/users',customerController.loadCustomber);
router.get('/blockCustomer',customerController.blockCustomber)
router.get('/unblockCustomer',customerController.UnblockCustomber)


router.get('/category',categoryController.loadCategory);
router.post("/addCategory",categoryController.addCategory); 
router.get('/editCategory/:id',categoryController.loadEditCategory);
router.post('/updateCategory/:id',categoryController.updateCategory);
router.put('/updateCategoryStatus/:id',categoryController.changeCategoryStatus)








router.get('/products',productController.loadProductLists);
router.route('/addProducts')
        .get(productController.loadAddProducts)
        .post(multer.array('productImages',10),productController.addProduct);
router.patch('/product-update-status/:id',productController.updateProductStatus);
router.delete('/products-delete/:id',productController.deleteProduct);

router.get('/product-edit/:id',productController.loadEditProduct);
router.get('/product-images-count/:id', productController.getProductImagesCount);

router.post('/product-update/:id',multer.array('productImages', 5), productController.updateProduct);
router.post('/delete-image', productController.deleteImage);
router.post('/reupload-images', multer.array('reuploadImages', 5), productController.reuploadImages);

// router.post('/product-update/:id',multer.array('productImages',10),productController.editingProduct)



router.get('/coupon',coupenController.loadCoupenPage);
router.route('/addCoupon')
.get(coupenController.loadAddCoupen)
.post(coupenController.addCoupon);
router.patch('/coupon-update-status/:couponId',coupenController.coupenUpdateStatus);
router.get('/edit-coupon/:couponId',coupenController.loadEditCoupon);
router.post('/updateCoupon',coupenController.editCoupon);


 


router.post('/addCategoryOffer',offerController.applyCategoryOffer);
router.put('/removeCategoryOffer/:categoryId',offerController.removeCategoryOffer);
router.patch('/toggleCategoryOfferStatus',offerController.categoryOfferStatus);


router.post('/add-product-offer',offerController.applyProductOffer);
router.delete('/remove-product-offer/:productId',offerController.removeProductOffer);
router.patch('/offer-update-status/:offerId',offerController.productOfferStatus);



router.get('/order',orderController.loadOrder);
router.post('/orders/update-status',orderController.orderUpdateStatus);
router.get('/orders/:orderId',orderController.loadOrderInfo);





router.get('/salesreport',salesreportController.loadSalesReport);
router.get('/getSalesReport',salesreportController.getSalesReport);

router.get("/serverError",errorController.adminload500);
router.get("/page-not-found",errorController.adminload404);
module.exports = router; 