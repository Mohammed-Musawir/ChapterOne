const userModal = require("../../models/userSchema");
const addressModel = require("../../models/addressSchema");

const loadAddAddress = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await userModal.findById(userId);
    const returnUrl = req.query.returnUrl || "/account/profile";

    req.session.returnUrl = returnUrl;


    res.render("User/userAddAddress", { user, returnUrl });
  } catch (error) {
    console.log(`Error in address Controller in load add address and the error is 
            ${error}`);
  }
};

const addAddress = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const {
      fullName,
      alternative_no,
      houseNumber,
      street,
      landmark,
      city,
      state,
      pincode,
      addressType,
      isDefault,
       returnUrl = req.body.returnUrl || req.session.returnUrl || "/account/profile"
    } = req.body;


    
  // Validate required fields
  const errors = {};
    
  // Validate fullName
  if (!fullName || fullName.trim() === '') {
    errors.fullName = 'Full name is required';
  }
  
  // Validate mobile number (must be a valid Indian mobile number)
  if (!alternative_no) {
    errors.alternative_no = 'Phone number is required';
  } else if (!/^[6-9]\d{9}$/.test(alternative_no)) {
    errors.alternative_no = 'Please enter a valid Indian mobile number';
  }
  
  // Validate house number
  if (!houseNumber || houseNumber.trim() === '') {
    errors.houseNumber = 'House/Flat number is required';
  }
  
  // Validate street
  if (!street || street.trim() === '') {
    errors.street = 'Street/Area is required';
  }
  
  // Validate landmark
  if (!landmark || landmark.trim() === '') {
    errors.landmark = 'Landmark is required';
  }
  
  // Validate city (only alphabets and spaces)
  if (!city || city.trim() === '') {
    errors.city = 'City is required';
  } else if (!/^[A-Za-z\s]+$/.test(city)) {
    errors.city = 'City should contain only alphabets and spaces';
  }
  
  // Validate state (only alphabets and spaces)
  if (!state || state.trim() === '') {
    errors.state = 'State is required';
  } else if (!/^[A-Za-z\s]+$/.test(state)) {
    errors.state = 'State should contain only alphabets and spaces';
  }
  
  // Validate pincode (must be 6 digits)
  if (!pincode) {
    errors.pincode = 'PIN code is required';
  } else if (!/^\d{6}$/.test(pincode)) {
    errors.pincode = 'Please enter a valid 6-digit pincode';
  }
  
  // Validate addressType (must be one of the allowed values)
  if (!addressType) {
    errors.addressType = 'Address type is required';
  } else if (!['Home', 'Work', 'Other'].includes(addressType)) {
    errors.addressType = 'Invalid address type. Must be Home, Work, or Other';
  }
  
  // Return errors if validation fails
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }


    // If isDefault is true, update any existing default address
    if (isDefault === true || isDefault === 'true') { 
        await addressModel.updateMany(
          { userId: userId, isDefault: true },
          { $set: { isDefault: false } }
        );
      }

      const existingAddr = await addressModel.findOne({
        userId,
        fullName: { $regex: `^${fullName}$`, $options: "i" },
        houseNumber: { $regex: `^${houseNumber}$`, $options: "i" },
        street: { $regex: `^${street}$`, $options: "i" },
        landmark: { $regex: `^${landmark}$`, $options: "i" },
        city: { $regex: `^${city}$`, $options: "i" },
        state: { $regex: `^${state}$`, $options: "i" },
        pincode,
        addressType: { $regex: `^${addressType}$`, $options: "i" },
        alternative_no
    })

    if(existingAddr) {
        console.log(`The Address Already there`);
        return res.status(400).json({
            success: false,
            message: "This address already exists." 
            });
    }

    const newAddress = await addressModel({
        userId,
        fullName,
        alternative_no,
        houseNumber,
        street,
        landmark,
        city,
        state,
        pincode,
        addressType,
        isDefault
    });

    if(!newAddress) {
        console.log(`The Address is not Saved`);
        return res.status(400).json({
            success: false,
            message: "The Address is not Saved" 
            });
    }

    await newAddress.save();

    console.log(`address saved`);
    res.status(200).json({ message: "Address added successfully!", returnUrl });
  } catch (error) {
    console.log(`Error in adding address in address controller 
            the error is ${error}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

const loadEditAddress = async (req, res) => {
  try {
    const addressId = req.params.id;

    const address = await addressModel.findById(addressId);
    const addressTypes = ["Home", "Office", "Other"];
    const user = await userModal.findById({ _id: address.userId });
    res.render("User/userEditAddress", { address, user, addressTypes });
  } catch (error) {
    console.log(error)
  }
};

const editAddress = async (req, res) => {
  try {
    const {
        fullName,
        addressType,
        houseNumber,
        street,
        landmark,
        city,
        state,
        pincode,
        alternative_no,
        isDefault
      } = req.body;

    const userId = req.user._id || req.user.id;
    const addressId = req.params.id;

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Validate PIN code
    if (!/^\d{6}$/.test(pincode)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid 6-digit PIN code'
        });
      }

     // Validate phone number - Indian mobile numbers start with 6-9 followed by 9 digits
     if (!/^[6-9]\d{9}$/.test(alternative_no)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid Indian mobile number starting with 6-9 followed by 9 digits'
        });
      }  

    // Landmark Validation
    if (!landmark || landmark.trim().length < 3) {
      return res
        .status(400)
        .json({
          message: "Landmark is required and must be at least 3 characters",
        });
    }

    // City Validation
    const onlyLetters = /^[A-Za-z\s]+$/;
    if (!city || !onlyLetters.test(city)) {
      return res
        .status(400)
        .json({ message: "City is required and should contain only letters" });
    }

    // State Validation
    if (!state || !onlyLetters.test(state)) {
      return res
        .status(400)
        .json({ message: "State is required and should contain only letters" });
    }


    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // If setting as default, unset any existing default addresses
    if (isDefault === true || isDefault === 'true') {
        await addressModel.updateMany(
          { user: userId, isDefault: true },
          { $set: { isDefault: false } }
        );
      }

    const updatedAddress = await addressModel.findByIdAndUpdate(
      addressId ,
      {
        $set: {
            fullName,
            addressType,
            houseNumber,
            street,
            landmark,
            city,
            state,
            pincode,
            alternative_no,
            isDefault: isDefault === true || isDefault === 'true'
        },
      },
      { new: true }
    );

    if (!updatedAddress) {
      return res.status(404).json({ message: "Address not found" });
    }

    res
      .status(200)
      .json({ message: "Address updated successfully", updatedAddress });
  } catch (error) {
    console.log(`Error in editAddress controller: ${error}`);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const addressId = req.params.id;

    // Check if the address you're deleting is default
    const isDefaultAddress = await addressModel.findById(addressId);
    if (!isDefaultAddress)
      return res.status(404).json({ message: "Address not found" });

    // Delete the address
    await addressModel.findByIdAndDelete(addressId);

    // If the deleted one was default, make the latest one as default
    if (isDefaultAddress.isDefault) {
      const latestAddress = await addressModel
        .findOne({ userId: isDefaultAddress.userId }) // Assuming userId is stored in address
        .sort({ createdAt: -1 });

      if (latestAddress) {
        latestAddress.isDefault = true;
        await latestAddress.save();
      }
    }

    return res.status(200).json({ message: "Address Deleted successfully" });
  } catch (error) {
    console.log(`Error in deleteAddress controller: ${error}`);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const makeDefault = async (req, res) => {
  try {
    const addressId = req.params.id;

    const isAnyDefault = await addressModel.findOneAndUpdate(
      { isDefault: true },
      { $set: { isDefault: false } }
    );

    const updatedAddress = await addressModel.findByIdAndUpdate(
      addressId,
      { $set: { isDefault: true } },
      { new: true }
    );

    if (!updatedAddress) {
      return res.status(404).json({ message: "Address not found" });
    }

    return res
      .status(200)
      .json({ message: "Address set as default", updatedAddress });
  } catch (error) {
    console.log(`Error in makeDefault controller: ${error}`);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  loadAddAddress,
  addAddress,
  loadEditAddress,
  editAddress,
  deleteAddress,
  makeDefault,
};
