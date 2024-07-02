import express from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';

import { upload } from '../config/multer.js';
import {
	completeBusinessRegistration,
	currentUser,
	loginBusiness,
	registerBusiness,
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
	); // http://localhost:8080/api/business/
businessRouter.route('/login').post(loginBusiness);

businessRouter
	.route('/verify')
	.post(passport.authenticate('business', { session: false }), verifyBusiness);

businessRouter.route('/complete').post(
	passport.authenticate('business', { session: false }),
	upload.fields([
		{ name: 'businessLocationImages', maxCount: 40 },
		{ name: 'cacRegistrationProof', maxCount: 1 },
		{ name: 'proofOfAddress', maxCount: 1 },
	]),
	validateBody(
		Joi.object({
			businessName: Joi.string().required(),
			businessAddress: Joi.string().required(),
			businessCategory: Joi.string().required(),
			businessEmail: Joi.string().required(),
			businessTelephone: Joi.string().required(),
			businessLGA: Joi.string().required(),
			businessCity: Joi.string().required(),
			businessState: Joi.string().required(),
			businessSubCategory: Joi.string().required(),
			businessDescription: Joi.string().optional(),
			businessBudget: Joi.string().required(),
		}),
		{
			allowUnknown: true,
		}
	),
	completeBusinessRegistration
);
export default businessRouter;
