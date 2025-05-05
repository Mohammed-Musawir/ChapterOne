const mongoose= require('mongoose')
const categoryModel = require('../../models/categorySchema');
const productModel = require('../../models/productSchema');
const offerModel = require('../../models/offerSchema');
const path = require('path');
const fs = require('fs'); 
 
 
const loadProductLists = async (req, res) => {
  try {
    const products = await productModel.find().sort({ createdAt: -1 }).populate('category_id');
    
    if (!products) {
      console.log(products);
      return res.render('500');
    }
    
    const productsWithOffers = await Promise.all(products.map(async (product) => {
      const productObj = product.toObject();
      
      const productOffer = await offerModel.findOne({
        offerType: 'product',
        product: product._id,
        endDate: { $gte: new Date() }
      }).sort({ discountPercentage: -1 });
      
      const categoryOffer = await offerModel.findOne({
        offerType: 'category',
        category: product.category_id._id,
        isActive: true,
        endDate: { $gte: new Date() }
      }).sort({ discountPercentage: -1 });
      
      // Store both offer types
      productObj.productOffer = productOffer ? {
        discountPercentage: productOffer.discountPercentage,
        offerName: productOffer.name,
        offerId: productOffer._id,
        isActive: productOffer.isActive
      } : null;
      
      productObj.categoryOffer = categoryOffer ? {
        discountPercentage: categoryOffer.discountPercentage,
        offerName: categoryOffer.name,
        offerId: categoryOffer._id,
        isActive: categoryOffer.isActive
      } : null;
      
      // For backwards compatibility, set the best offer as the default
      productObj.offerType = null;
      productObj.offerId = null;
      productObj.offerActive = false;
      
      if (productOffer && categoryOffer) {
        if (productOffer.discountPercentage >= categoryOffer.discountPercentage) {
          productObj.discountPercentage = productOffer.discountPercentage;
          productObj.offerName = productOffer.name;
          productObj.offerType = 'product';
          productObj.offerId = productOffer._id;
          productObj.offerActive = productOffer.isActive;
        } else {
          productObj.discountPercentage = categoryOffer.discountPercentage;
          productObj.offerName = categoryOffer.name;
          productObj.offerType = 'category';
          productObj.offerId = categoryOffer._id;
          productObj.offerActive = categoryOffer.isActive;
        }
      } else if (productOffer) {
        productObj.discountPercentage = productOffer.discountPercentage;
        productObj.offerName = productOffer.name;
        productObj.offerType = 'product';
        productObj.offerId = productOffer._id;
        productObj.offerActive = productOffer.isActive;
      } else if (categoryOffer) {
        productObj.discountPercentage = categoryOffer.discountPercentage;
        productObj.offerName = categoryOffer.name;
        productObj.offerType = 'category';
        productObj.offerId = categoryOffer._id;
        productObj.offerActive = categoryOffer.isActive;
      }
      
      return productObj;
    }));
    
    res.render("Admin/productsEdit", { products: productsWithOffers });
  } catch (error) {
    console.log(`Error shown in loadProductLists in productController and the Error is ${error}`);
    res.render('500');
  }
};

//Updating Product Status

const updateProductStatus = async (req, res) => {
    try {
      const {isActive} = req.body;
      const {id} = req.params;
      
      if(!id) {
        console.log(`Id is not reached in updateProductStatus, Id value = ${id}`);
        return res.status(400).json({ success: false, message: 'Invalid request, ID is required' });
      }
  
      const product = await productModel.findById(id);
  
      if(!product) {
        console.log(`Product not found with ID: ${id}`);
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
  
      // If isActive is true, isBlocked should be false (and vice versa)
      const updatingStatus = await productModel.findByIdAndUpdate(
        id,
        { isBlocked: !isActive },
        { new: true }
      );
      
      if(!updatingStatus) {
        console.log(`The product is not updated`);
        return res.status(500).json({ success: false, message: 'Failed to update product status' });
      }
  
      res.status(200).json({ 
        success: true, 
        message: isActive ? 'Product activated successfully' : 'Product blocked successfully', 
        product: updatingStatus 
      });
  
    } catch (error) {
      console.log(`Error in updateProductStatus: ${error}`);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }


  //delete the Product 

const deleteProduct = async (req,res) => {
    try {
        const {id} = req.params;

        if(!id) {
            console.log(`Id is not reached in deleteProduct in productcontroller, Id value = ${id}`);
            return res.status(400).json({ success: false, message: 'Invalid request, ID is required' });
          }

          const deletingProduct = await productModel.findByIdAndDelete(id);

          deletingProduct.productImages.forEach(imagePath => {
            const fullPath = path.join(__dirname,'../../public',imagePath);
            if(fs.existsSync(fullPath)){
                fs.unlinkSync(fullPath);
                console.log(`Deleted image: ${fullPath}`);
            }
        })

          if(!deletingProduct){
            console.log(`The product is not deleted`);
        return res.status(500).json({ success: false, message: 'Failed to delete product ' });
          }

          res.status(200).json({ 
            success: true, 
            message: 'Product deleted successfully'
          });

    } catch (error) {
        console.log(`Error in deleteProduct: ${error}`);
        res.status(500).json({ success: false, message: 'Internal Server Error' });  
    }
}




//Add Product Page
const loadAddProducts = async (req,res) => {
    try {
        const categories = await categoryModel.find({isListed:true});
        res.render('Admin/addProduct',{categories})
    } catch (error) {
        console.log(`Error show in LoadProducts and the 
            Error is ${error}`)
            res.render('500');
    }
}


//Adding a product

const addProduct = async (req,res) => {
    
    try {
        
        const categories = await categoryModel.find({});

        if(!categories){
            console.log(`Error when finding category`)
            return res.status(500).json({massege:'Error'})
        }
        const {
            name,
            writer,
            category_id,
            language,
            regularPrice,
            salePrice,
            availableQuantity,
            description,
            publishedDate
        } = req.body;

        if(!name ||!writer ||!category_id ||!language ||!regularPrice ||!salePrice ||!availableQuantity ||!description ||!publishedDate){
            
            console.log(`Problem with finding credentials in req.body in addProduct in productController`)

            return res.render('Admin/addProduct',{categories,massege:'Need Credentials'})
        }

        const imagePaths = req.files.map(file => `/uploadedImages/${file.filename}`);

        if(!imagePaths){

            console.log(`Problem with imagePaths newProduct in addProduct in productController`)

            return res.render('Admin/addProduct',{categories,massege:'Problem with imagePaths newProduct '})

        }


        const newProduct = new productModel({
            name,
            writer,
            category_id,
            language,
            regularPrice,
            salePrice,
            availableQuantity,
            description,
            productImages: imagePaths,
            publishedDate
        })

        if(!newProduct){
            console.log(`Problem with Creating newProduct in addProduct in productController`);
            return res.render('Admin/addProduct',{categories,massege:'Problem with Creating newProduct'})

        }

        await newProduct.save();
        console.log(`New Book Added
            name : ${name},
            `)

        res.redirect('/admin/addProducts');


    } catch (error) {
        res.render('500');
        console.log(`Error show in addProducts and the 
            Error is ${error}`)
    }
}

//Editing a product

const loadEditProduct = async (req,res) => {
    try {
        const {id} = req.params;
        const product = await productModel.findById(id).populate('category_id')
        const categories = await categoryModel.find({isListed:true})
        
        res.render('Admin/productEditingPage',{product,categories})
    } catch (error) {
        res.render('500');
        console.log(`Error show in LoadEditProducts and the 
            Error is ${error}`)
    }
}

const editingProduct = async (req,res) => {
    try {
        const { id } = req.params;
        const { name,
            writer,
            category_id,
            language,
            regularPrice,
            salePrice,
            availableQuantity,
            description
        } = req.body;

        const product = await productModel.findById(id);

        if(!product){
            console.log(`Product not found with ID: ${id}`);
        return res.render('500');
        }

        let imagePaths = product.productImages;

        if(req.files && req.files.length > 0){
            product.productImages.forEach(imagePath => {
                const fullPath = path.join(__dirname,'../../public',imagePath);
                if(fs.existsSync(fullPath)){
                    fs.unlinkSync(fullPath);
                    console.log(`Deleted image: ${fullPath}`);
                }
            })
            imagePaths = req.files.map(file => `/uploadedImages/${file.filename}`);
        }


        const updatedProduct = await productModel.findByIdAndUpdate(
            id,
            {
                name,
                writer,
                category_id,
                language,
                regularPrice,
                salePrice,
                availableQuantity,
                description,
                productImages:imagePaths,
                updatedAt:Date.now()
            },
            { new : true}
        );

        if(!updatedProduct){
            console.log(`the Product is not updated`);
            return res.status(500).json({ success: false, message: 'Failed to update product' });
        }

        console.log(`Product updated successfully: ${updatedProduct.name}`);
         res.status(200).json({ success: true, message: 'Product updated successfully' });
    } catch (error) {
        console.log(`Error show in editingProduct in productController and the Error is ${error}`);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

module.exports = {
    loadProductLists,
    updateProductStatus,
    deleteProduct,
    loadAddProducts,
    addProduct,
    loadEditProduct,
    editingProduct
}