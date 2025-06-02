import express from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';

import { upload } from '../config/multer.js';
import {
  addLocationImages,
  completeBusinessRegistration,
  completeBusinessRegistrationAppScript,
  currentUser,
  deleteLocationImage,
  loginBusiness,
  registerBusiness,
  registerBusinessAppScript,
  updateBusinessSettings,
  updateDisplayPhoto,
  verifyBusiness,
} from '../controllers/business.controller.js';
const businessRouter = express.Router();
import { createValidator, validateBody } from '../middleware/validations.js';
import Joi from 'joi';

// To add New Business and current logged in Business Data
businessRouter
  .route('/')
  .get(passport.authenticate('business', { session: false }), currentUser)
  .post(
    createValidator(
      'body',
      Joi.object({
        businessName: Joi.string().required(),
        businessEmail: Joi.string().required(),
        password: Joi.string().required(),
        address: Joi.string().required(),
      })
    ),
    registerBusiness,
    (req, res, next) => {
      passport.authenticate('business', function (err, user, info) {
        if (err) {
          return next(err);
        }
        if (!user) {
          // *** Display message without using flash option
          // re-render the login form with a message
          res.status(400).json({
            error: 'No Business Found',
          });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
          expiresIn: '1d',
        });
        return res.status(200).json({ business: user, token });
      })(req, res, next);
    }
  );

// To add New Business and current logged in Business Data
businessRouter.post(
  '/register-from-appscript',
  createValidator(
    'body',
    Joi.object({
      businessName: Joi.string().required(),
      businessEmail: Joi.string().required(),
      password: Joi.string().required(),
      address: Joi.string().required(),
    })
  ),
  registerBusinessAppScript,
  (req, res, next) => {
    passport.authenticate('business', function (err, user, info) {
      if (err) {
        return next(err);
      }
      if (!user) {
        // *** Display message without using flash option
        // re-render the login form with a message
        res.status(400).json({
          error: 'No Business Found',
        });
      }

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: '1d',
      });
      return res.status(200).json({ business: user, token });
    })(req, res, next);
  }
);

businessRouter.route('/login').post(loginBusiness);

businessRouter
  .route('/verify')
  .post(passport.authenticate('business', { session: false }), verifyBusiness);

businessRouter.route('/complete').post(
  passport.authenticate('business', { session: false }),
  upload.fields([{ name: 'businessLocationImages', maxCount: 10 }]),
  validateBody(
    Joi.object({
      businessName: Joi.string().required(),
      businessAddress: Joi.string().required(),
      businessCategory: Joi.string().required(),
      businessEmail: Joi.string().required(),
      businessTelephone: Joi.string().required(),
      businessSubCategory: Joi.string().required(),
      businessAbout: Joi.string().optional(),
      businessBudget: Joi.string().required(),
    }),
    {
      allowUnknown: true,
    }
  ),
  completeBusinessRegistration
);

businessRouter.route('/complete-appscript').post(
  passport.authenticate('business', { session: false }),
  validateBody(
    Joi.object({
      businessName: Joi.string().required(),
      businessAddress: Joi.string().required(),
      businessCategory: Joi.string().required(),
      businessEmail: Joi.string().required(),
      businessTelephone: Joi.string().required(),
      businessSubCategory: Joi.string().required(),
      businessAbout: Joi.string().optional(),
      businessBudget: Joi.string().required(),
      // businessLocationImages: Joi.array().items(Joi.string()).required(),
    }),
    {
      allowUnknown: true,
    }
  ),
  completeBusinessRegistrationAppScript
);

businessRouter
  .route('/display-photo')
  .post(
    passport.authenticate('business', { session: false }),
    upload.single('picture'),
    updateDisplayPhoto
  );

businessRouter
  .route('/location-images')
  .put(
    passport.authenticate('business', { session: false }),
    upload.fields([{ name: 'businessLocationImages', maxCount: 10 }]),
    addLocationImages
  )
  .delete(
    passport.authenticate('business', { session: false }),
    deleteLocationImage
  );

businessRouter
  .route('/edit-profile')
  .put(
    passport.authenticate('business', { session: false }),
    updateBusinessSettings
  );

export default businessRouter;
