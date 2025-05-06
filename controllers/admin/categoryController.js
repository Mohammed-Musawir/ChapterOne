const { default: mongoose } = require('mongoose');
const offerModal = require('../../models/offerSchema');
const categoryModel = require('../../models/categorySchema');

const loadCategory = async (req, res) => {
    try {
        const searchQuery = req.query.search || "";  
        let page = parseInt(req.query.page) || 1;
        let itemsPerPage = 3;

        let query = {};
        if (searchQuery) {
            query.name = { $regex: searchQuery, $options: "i" }; 
        }

        const totalCategories = await categoryModel.countDocuments(query);
        const totalPages = Math.ceil(totalCategories / itemsPerPage);

        const categories = await categoryModel
            .find(query)
            .sort({ createdAt: -1 }) 
            .skip((page - 1) * itemsPerPage)
            .limit(itemsPerPage);
        
        const categoryIds = categories.map(category => category._id);
        const categoryOffers = await offerModal.find({
            offerType: 'category',
            category: { $in: categoryIds },
            endDate: { $gt: new Date() } 
        });
        
        const categoryOffersMap = {};
        categoryOffers.forEach(offer => {
            categoryOffersMap[offer.category.toString()] = offer;
        });
        
        const categoriesWithOffers = categories.map(category => {
            const categoryObj = category.toObject();
            const offer = categoryOffersMap[category._id.toString()];
            
            categoryObj.hasOffer = !!offer;
            categoryObj.discountPercentage = offer ? offer.discountPercentage : 0;
            categoryObj.offerId = offer ? offer._id : null;
            categoryObj.offerActive = offer ? offer.isActive : false; 
            
            return categoryObj;
        });

        res.status(200).render("Admin/category", {
            cat: categoriesWithOffers, 
            search: searchQuery, 
            totalCategories,
            currentPage: page,
            itemsPerPage,
            totalPages
        });

    } catch (error) {
        console.log(`Error in categoryController in loadCategory: ${error}`);
        res.render('500');
    }
};

const addCategory = async (req,res) => {
    try {
        const {categoryName,categoryDiscription} = req.body;


        const existingCategory = await categoryModel.findOne({ 
            name: { $regex: categoryName, $options: "i" }
        });
        if (existingCategory) {
            return res.json({ 
                success: false, 
                message: "Category already exists!" 
            });
        }



        const newCategory = new categoryModel ({
            name:categoryName,
            description:categoryDiscription
        });
        if(!newCategory){
            console.log(`error in categoryController in addCategory ${error}`)
            return res.json({ success: false, message: "Failed to create category" });
        }
       await newCategory.save();

        return res.json({ success: true, category: newCategory });

    } catch (error) {
        console.log(`error in categoryController in addCategory ${error}`)
        return res.json({ success: false, message: "Internal Server Error" });
    }
}



const loadEditCategory = async (req,res) => {
    try {
        const {id} = req.params;
        if(!id){
            return res.json({success : false, message: 'Internal Server error in loadEditCategory'});
        }
        const category = await categoryModel.findById(id);
        if(!category){
            return res.json({success : false, message: 'Internal Server error in loadEditCategory'});
        }
        res.render('Admin/editCategory',{category: category})
    } catch (error) {

        console.error("Error loadEditCategory:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}


const updateCategory = async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        console.log(`Doesn't find id req.params = ${req.params} in Update Category in Category controller`);
        return res.render('500');
      }
      
      const { categoryName, categoryDescription, isListed } = req.body;
      
      // Validate required fields
      if (!categoryName || !categoryDescription || isListed === undefined) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }
      
      // Check if category exists before attempting to update
      const existingCategory = await categoryModel.findById(id);
      
      if (!existingCategory) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }
      
      // Check if another category with the same name (case-insensitive) already exists
      // But exclude the current category being updated from the check
      const duplicateCategory = await categoryModel.findOne({
        _id: { $ne: id }, // Exclude the current category
        name: { $regex: new RegExp(`^${categoryName}$`, 'i') } // Case-insensitive match
      });
      
      if (duplicateCategory) {
        return res.status(400).json({ 
          success: false, 
          message: 'A category with this name already exists' 
        });
      }
      
      // Proceed with update if no duplicate is found
      const updatedCategory = await categoryModel.findByIdAndUpdate(
        id,
        {
          name: categoryName,
          description: categoryDescription,
          isListed: isListed
        },
        { new: true }
      );
      
      return res.json({
        success: true,
        message: 'Category updated successfully',
        category: updatedCategory
      });
    } catch (error) {
      console.error('Error updating category:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  

const changeCategoryStatus = async (req,res) => {
    try {
        const {id} = req.params;
        const {isListed} = req.body
        if(!id){

        }

        const UpdatedStatus = await categoryModel.findByIdAndUpdate(id,{isListed},{new : true});
        if(!UpdatedStatus){

        }
        res.status(200).json({
            success: true, 
            message: 'Category Status updated successfully'
        })
    } catch (error) {
        console.error('Error updating category:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
      }
    
}

module.exports = {
    loadCategory,
    addCategory,
    loadEditCategory,
    updateCategory,
    changeCategoryStatus

}