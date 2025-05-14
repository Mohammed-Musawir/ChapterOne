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




const addProduct = async (req, res) => { 
  try {
    
    const categories = await categoryModel.find({});
    if (!categories) {
      console.log(`Error when finding categories`);
      return res.status(500).json({ success: false, message: 'Error fetching categories' });
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
    
    
    if (!name || !writer || !category_id || !language || !regularPrice || 
        !availableQuantity || !description || !publishedDate) {
      console.log('Missing required fields in request body');
      return res.status(400).json({
        success: false,
        message: 'All required fields must be filled'
      });
    }

    const existingProduct = await productModel.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });
    
    if (existingProduct) {
      console.log(`Product with name "${name}" already exists`);
      return res.status(400).json({
        success: false,
        message: 'A book with this name already exists'
      });
    }
   
    
    if (!req.files || req.files.length < 3) {
      console.log('Not enough images provided (minimum 3 required)');
      return res.status(400).json({
        success: false,
        message: 'At least 3 book images are required'
      });
    }
    
    
    const imagePaths = req.files.map(file => `/uploadedImages/${file.filename}`);
    
    
    const newProduct = new productModel({
      name,
      writer,
      category_id,
      language,
      regularPrice: parseFloat(regularPrice),
      salePrice: salePrice ? parseFloat(salePrice) : undefined, 
      availableQuantity: parseInt(availableQuantity),
      description,
      productImages: imagePaths,
      publishedDate: publishedDate 
    });
    
    
    await newProduct.save();
    
    console.log(`New Book Added - Title: ${name}, Author: ${writer}`);
    
    
    return res.status(201).json({
      success: true,
      message: 'Book added successfully',
      product: {
        id: newProduct._id,
        name: newProduct.name
      }
    });
  } catch (error) {
    console.error(`Error in addProduct controller: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error occurred while adding the book'
    });
  }
}



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

const getProductImagesCount = async (req, res) => {
  try {
      const { id } = req.params;
      const product = await productModel.findById(id);
      
      if (!product) {
          return res.status(404).json({ success: false, message: 'Product not found' });
      }
      
      const count = product.productImages.length;
      return res.json({ success: true, count });
  } catch (error) {
      console.log(`Error in getProductImagesCount: ${error}`);
      return res.status(500).json({ success: false, message: 'Server error' });
  }
};


const updateProduct = async (req, res) => {
  try {
      const { id } = req.params;
      const {
          name,
          writer,
          category_id,
          language,
          regularPrice,
          salePrice,
          availableQuantity,
          description,
          imagesToRemove
      } = req.body;

      
      const product = await productModel.findById(id);
      if (!product) {
          return res.status(404).json({ success: false, message: 'Product not found' });
      }

      
      let updatedImages = [...product.productImages];
      if (imagesToRemove && Array.isArray(imagesToRemove)) {
          
          updatedImages = updatedImages.filter(img => !imagesToRemove.includes(img));
          
          
          imagesToRemove.forEach(imageToRemove => {
              try {
                  const imagePath = path.join(__dirname, '../public', imageToRemove);
                  if (fs.existsSync(imagePath)) {
                      fs.unlinkSync(imagePath);
                  }
              } catch (err) {
                  console.log(`Error deleting file: ${err}`);
              }
          });
      }

      
      if (req.files && req.files.length > 0) {
          const newImagePaths = req.files.map(file => `/uploadedImages/${file.filename}`);
          updatedImages = [...updatedImages, ...newImagePaths];
      }

      
      if (updatedImages.length < 3) {
          return res.status(400).json({ 
              success: false, 
              message: 'Product must have at least 3 images' 
          });
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
              productImages: updatedImages,
              updatedAt: Date.now()
          },
          { new: true }
      );

      return res.status(200).json({ success: true, product: updatedProduct });
  } catch (error) {
      console.log(`Error in updateProduct: ${error}`);
      return res.status(500).json({ success: false, message: 'Server error' });
  }
};


const deleteImage = async (req, res) => {
  try {
      const { productId, imagePath } = req.body;

      if (!productId || !imagePath) {
          return res.status(400).json({ success: false, message: 'Product ID and image path are required' });
      }

      
      const product = await productModel.findById(productId);
      if (!product) {
          return res.status(404).json({ success: false, message: 'Product not found' });
      }

      
      
      const updatedImages = product.productImages.filter(img => img !== imagePath);
      
      
      return res.json({ 
          success: true, 
          message: 'Image deletion registered', 
          remainingCount: updatedImages.length 
      });
  } catch (error) {
      console.log(`Error in deleteImage: ${error}`);
      return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const reuploadImages = async (req, res) => {
  try {
      const { productId, replacePaths } = req.body;
      
      if (!productId || !req.files || !req.files.length) {
          return res.status(400).json({ 
              success: false, 
              message: 'Product ID and image files are required' 
          });
      }

      
      const product = await productModel.findById(productId);
      if (!product) {
          return res.status(404).json({ success: false, message: 'Product not found' });
      }

      
      const newImagePaths = req.files.map(file => `/uploadedImages/${file.filename}`);
      
      
      let updatedImages = [...product.productImages];
      if (replacePaths && Array.isArray(replacePaths)) {
          
          replacePaths.forEach((oldPath, index) => {
              if (index < newImagePaths.length) {
                  
                  const replaceIndex = updatedImages.findIndex(img => img === oldPath);
                  if (replaceIndex !== -1) {
                      updatedImages[replaceIndex] = newImagePaths[index];
                      
                      
                      try {
                          const imagePath = path.join(__dirname, '../public', oldPath);
                          if (fs.existsSync(imagePath)) {
                              fs.unlinkSync(imagePath);
                          }
                      } catch (err) {
                          console.log(`Error deleting file: ${err}`);
                      }
                  } else {
                      
                      updatedImages.push(newImagePaths[index]);
                  }
              }
          });
      } else {
          
          updatedImages = [...updatedImages, ...newImagePaths];
      }

      
      const updatedProduct = await productModel.findByIdAndUpdate(
          productId,
          {
              productImages: updatedImages,
              updatedAt: Date.now()
          },
          { new: true }
      );

      return res.status(200).json({ 
          success: true, 
          message: 'Images uploaded successfully', 
          product: updatedProduct 
      });
  } catch (error) {
      console.log(`Error in reuploadImages: ${error}`);
      return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
    loadProductLists,
    updateProductStatus,
    deleteProduct,
    loadAddProducts,
    addProduct,
    loadEditProduct,
    getProductImagesCount,
    updateProduct,
    deleteImage,
    reuploadImages
}
