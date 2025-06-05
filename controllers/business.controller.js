import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import path from 'path';
import {
  Business,
  cardFieldsProjection,
  excludedFieldsProjection,
} from '../models/Business.model.js';

import jwt from 'jsonwebtoken';
import { Location } from '../models/Location.model.js';
import { sendEmail } from '../services/mail/mail.service.js';
import { dirname } from '../lib/index.js';
import { render } from 'pug';
import LocationBudget from '../models/LocationBudget.js';
import { transformBusinessToLocation } from './locationv2.controller.js';
import { uploadMultipleFiles } from '../config/multer.js';

const saveImagesWithModifiedName = async (files) => {
  const imageUrls = [];
  try {
    files.map((file) => imageUrls.push(file.path));
  } catch (err) {
    console.error(err);
    throw new Error(`Error uploading images: ${err.message}`);
  }
  return imageUrls;
};

/**
 *
 * @param {*} req
 * @param {*} res
 * @param {import("express").NextFunction} next
 */

export const registerBusiness = async (req, res, next) => {
  const { businessName, businessEmail, password, address } = req.body;

  // Encryption
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  let verificationCode = Math.floor(Math.random() * 9000) + 1000;

  Business.register(
    {
      businessName: businessName,
      businessEmail: businessEmail,
      businessAddress: address,
      password: hashedPassword,
      verificationCode: verificationCode,
    },
    password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.status(400).json({
          error: 'A Business with the given username or email exists',
        });
      } else if (!err) {
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
          expiresIn: '1d',
        });
        req.headers.authorization = `Bearer ${token}`;
        sendEmail(
          businessEmail,
          render(
            readFileSync(
              path.resolve(
                dirname(import.meta.url),
                '../views/email/verification-code.pug'
              )
            ),
            {
              code: verificationCode,
              filename: 'verification-code.pug',
            }
          ),
          'E-mail Verification'
        );
        next();
      }
    }
  );
};

export const registerBusinessAppScript = async (req, res, next) => {
  const { businessName, businessEmail, password, address } = req.body;

  // Encryption
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  let verificationCode = Math.floor(Math.random() * 9000) + 1000;

  try {
    Business.register(
      {
        businessName: businessName,
        businessEmail: businessEmail,
        businessAddress: address,
        password: hashedPassword,
        verificationCode: verificationCode,
        emailVerified: true,
      },
      password,
      function (err, user) {
        if (err) {
          res.status(400).json({
            error: 'A Business with the given username or email exists',
            message: err,
          });
        } else if (!err) {
          const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: '1d',
          });
          req.headers.authorization = `Bearer ${token}`;
          next();
        }
      }
    );
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      error: 'Failed to register business',
      message: error,
    });
  }
};

export const loginBusiness = async (req, res) => {
  const { businessEmail, password } = req.body;
  let matchedBusiness = null;

  if (businessEmail === 'cs.travaye.ng@gmail.com') {
    const businesses = await Business.find({ businessEmail }).select([
      'businessEmail',
      'businessName',
      'emailVerified',
      'password',
    ]);
    if (businesses.length === 0) {
      return res.status(401).json({ error: 'Invalid Email' });
    }

    for (const business of businesses) {
      const isMatch = await bcrypt.compare(password, business.password);
      if (isMatch) {
        matchedBusiness = business;
        break;
      }
    }
  } else {
    const business = await Business.findOne({ businessEmail }).select([
      'businessEmail',
      'password',
      'emailVerified',
    ]);

    if (!business) {
      return res.status(400).json({
        error: 'Invalid email or password',
      });
    } else {
      matchedBusiness = business;
    }
  }
  if (matchedBusiness) {
    const token = jwt.sign(
      { id: matchedBusiness._id },
      process.env.JWT_SECRET,
      {
        expiresIn: '1d',
      }
    );
    matchedBusiness.password = undefined;
    matchedBusiness.verificationCode = undefined;
    return res.status(200).json({
      token,
      user: matchedBusiness,
    });
  } else {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
};

export const currentUser = async (req, res) => {
  const business = await Business.findById(req.user.id, [
    ...cardFieldsProjection,
    ...excludedFieldsProjection,
  ])
    .populate('reviews')
    .populate('budgetClass');
  return res.status(200).json({ user: business });
};

// Logout
export const logBusinessOut = (req, res) => {
  req.logOut();
  res.redirect('/login');
};

export const verifyBusiness = async (req, res) => {
  const verificationCode = req.body?.code;

  const user = await Business.findById(req.user._id).select([
    'businessEmail',
    'emailVerified',
    'businessVerified',
    'verificationCode',
  ]);
  const isMatch = +verificationCode === user.verificationCode;
  if (!isMatch) {
    return res.status(400).json({ error: 'Invalid Code' });
  } else if (user.emailVerified) {
    return res.status(400).json({ error: 'Email already verified' });
  }
  user.emailVerified = true;
  await user.save();
  return res.status(200).json({ user });
};

export const completeBusinessRegistration = async (req, res) => {
  try {
    const {
      businessName,
      businessAddress,
      businessCategory,
      businessEmail,
      businessTelephone,
      businessLGA,
      businessCity,
      businessState,
      businessSubCategory,
      businessBudget,
      businessAbout,
    } = req?.body;

    if (await Location.findOne({ locationName: businessName })) {
      return res.status(400).json({
        error: 'Location already exists',
      });
    }

    const businessLocationImages = req.files.businessLocationImages || [];
    const budgetClass = await LocationBudget.findOne({ label: businessBudget });

    const business = req.user;
    if (business.businessVerified == 'verirfied') {
      return res.status(400).json({
        error: 'Verification already completed',
      });
    }
    if (!businessLocationImages) {
      return res.status(400).json({
        error: 'Cannot verify without images',
      });
    }

    business.businessName = businessName;
    business.businessAddress = businessAddress;
    business.description = businessAbout;
    business.businessCategory = businessCategory
      .toLowerCase()
      .replace(/\s+/g, '-');
    business.businessSubCategory = businessSubCategory;

    business.businessEmail = businessEmail;
    business.businessTelephone = businessTelephone;
    business.budgetClass = budgetClass._id;
    business.businessLocationImages = await saveImagesWithModifiedName(
      businessLocationImages
    );

    business.businessLGA = businessLGA;
    business.businessCity = businessCity;
    business.businessState = businessState;
    business.businessVerified = 'pending';
    const pendingVerification = await business.save();

    const location = new Location({
      locationName: businessName,
      locationAddress: businessAddress,
      locationCity: businessCity,
      locationState: businessState,
      locationLGA: businessLGA,
      locationDescription: businessAbout,
      locationImages: business.businessLocationImages,
      locationCategory: businessCategory,
      locationSubCategory: businessSubCategory,
      locationAddedBy: req.user.email,
      budgetClass: budgetClass._id,
      business: business._id,
    });
    await location.save();

    return res.status(200).json({ pendingVerification });
  } catch (error) {
    return res.status(400).json({
      error: 'Failed to complete business registration',
      message: error.message,
    });
  }
};

export const completeBusinessRegistrationAppScript = async (req, res) => {
  try {
    const {
      businessName,
      businessAddress,
      businessCategory,
      businessEmail,
      businessTelephone,
      businessSubCategory,
      businessBudget,
      businessAbout,
      businessLocationImages,
    } = req?.body;

    if (await Location.findOne({ locationName: businessName })) {
      return res.status(400).json({
        error: 'Location already exists',
      });
    }

    const uploadedFiles = businessLocationImages
      ? await uploadMultipleFiles(businessLocationImages)
      : [];
    const budgetClass = await LocationBudget.findOne({ label: businessBudget });

    const business = req.user;
    if (business.businessVerified == 'verirfied') {
      return res.status(400).json({
        error: 'Verification already completed',
      });
    }

    business.businessName = businessName;
    business.businessAddress = businessAddress;
    business.description = businessAbout;
    business.businessCategory = businessCategory
      .toLowerCase()
      .replace(' & ', '-and-')
      .replace(/\s+/g, '-');
    business.businessSubCategory = businessSubCategory
      .toLowerCase()
      .replace(' & ', '-and-')
      .replace(/\s+/g, '-');

    business.businessEmail = businessEmail;
    business.businessTelephone = businessTelephone;
    business.budgetClass = budgetClass._id;
    business.businessLocationImages = uploadedFiles;
    business.businessVerified = 'verified';
    const pendingVerification = await business.save();

    const location = new Location({
      locationName: businessName,
      locationAddress: businessAddress,
      locationCity: 'Lagos',
      locationState: 'Lagos',
      locationLGA: 'Lagos Mainland',
      locationDescription: businessAbout,
      locationImages: business.businessLocationImages,
      locationCategory: business.businessCategory,
      locationSubCategory: business.businessSubCategory,
      budgetClass: budgetClass._id,
      business: business._id,
    });
    await location.save();

    return res.status(200).json({ pendingVerification });
  } catch (error) {
    return res.status(400).json({
      error: 'Failed to complete business registration',
      message: error.message,
    });
  }
};

export const updateBusinessSettings = async (req, res) => {
  try {
    const {
      businessName,
      businessCategory,
      businessAddress,
      businessLGA,
      businessState,
      businessCity,
      description,
      businessSubCategory,
      password,
    } = req.body;

    const budgetClass = await LocationBudget.findOne({
      label: req.body.budgetClass,
    });
    const business = req.user;

    if (!business)
      return res.status(400).json({
        error: 'Business not found',
      });

    if (businessName) business.businessName = businessName;
    if (businessCategory)
      business.businessCategory = businessCategory
        .toLowerCase()
        .replace(/\s+/g, '-');
    if (businessSubCategory) business.businessSubCategory = businessSubCategory;
    if (businessAddress) business.businessAddress = businessAddress;
    if (businessState) business.businessState = businessState;
    if (businessLGA) business.businessLGA = businessLGA;
    if (businessCity) business.businessCity = businessCity;
    if (description) business.description = description;

    if (budgetClass) business.budgetClass = budgetClass._id;
    if (!budgetClass)
      return res.status(404).json({
        error: "Can't find budget type",
      });

    const salt = await bcrypt.genSalt(13);
    if (password) {
      const check = await bcrypt.compare(password, user.password);
      if (check)
        return res.status(400).json({
          error: "You can't change to the same password",
        });
      business.password = await bcrypt.hash(password, salt);
    }

    const newBusiness = await business.save();

    const location = await Location.findOne({ business: business._id });

    await Location.findByIdAndUpdate(
      location._id,
      transformBusinessToLocation(business),
      { new: true }
    ).populate('budgetClass');

    return res.status(200).json({
      business: newBusiness,
      message: 'Business Settings Updated Successfully',
    });
  } catch (err) {
    return res.status(400).json({
      error: 'Failed to update business details',
      message: err.message,
    });
  }
};

export const updateDisplayPhoto = async (req, res) => {
  const file = req.file;
  const business = req.user;

  if (!file)
    return res.status(400).json({ message: 'Please submit a picture' });

  if (['.jpg', '.png', '.jpeg'].includes(path.extname(file.originalname))) {
    business.displayPhoto = file.path;
    await business.save();

    return res.json({ message: 'Upload successful' });
  }

  return res.status(400).json({ message: 'Invalid file type.' });
};

export const addLocationImages = async (req, res) => {
  try {
    const business = req.user;
    const businessLocationImages = req.files.businessLocationImages || [];

    if (!business)
      return res.status(400).json({
        error: 'Business not found',
      });

    if (!businessLocationImages.length)
      return res.status(400).json({
        error: 'No image to upload',
      });

    const newImages = await saveImagesWithModifiedName(businessLocationImages);

    business.businessLocationImages.push(...newImages);
    await business.save();

    const location = await Location.findOne({ business: business._id });
    location.locationImages.push(...newImages);
    await location.save();

    return res.status(200).json({
      message: 'Images Uploaded Successfully',
    });
  } catch (err) {
    return res.status(400).json({
      error: 'Failed to Upload new Images',
      message: err.message,
    });
  }
};

export const deleteLocationImage = async (req, res) => {
  try {
    const business = req.user;
    const imageToDelete = req.body.image;

    if (!business)
      return res.status(400).json({
        error: 'Business not found',
      });
    if (!imageToDelete)
      return res.status(400).json({
        error: 'No image to delete',
      });

    business.businessLocationImages = business.businessLocationImages.filter(
      (img) => img !== imageToDelete
    );
    await business.save();

    const location = await Location.findOne({ business: business._id });
    location.locationImages = location.locationImages.filter(
      (img) => img !== imageToDelete
    );
    await location.save();

    return res.status(200).json({
      message: 'Image Deleted Successfully',
    });
  } catch (err) {
    return res.status(400).json({
      error: 'Failed to Delete Image',
      message: err.message,
    });
  }
};
