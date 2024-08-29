import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import path from 'path';
import {
	Business,
	cardFieldsProjection,
	excludeBusinessFieldsProjection,
	excludedFieldsProjection,
} from '../models/Business.model.js';

import jwt from 'jsonwebtoken';
import sendVerifyEmail from '../services/index.service.js';
import { Location } from '../models/Location.model.js';
import { sendEmail } from '../services/mail/mail.service.js';
import { dirname } from '../lib/index.js';
import { render } from 'pug';
import LocationBudget from '../models/LocationBudget.js';
import { transformBusinessToLocation } from './locationv2.controller.js';

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
	// const businessName = req.body.businessName;
	// const businessEmail = req.body.businessEmail;
	// const password = req.body.password;
	// const address = req.body.address;
	const { businessName, businessEmail, password, address } = req.body;

	// Encryption
	const salt = await bcrypt.genSalt(13);
	const hashedPassword = await bcrypt.hash(password, salt);
	let verificationCode = Math.floor(Math.random() * 9000) + 1000;

	// Display the verificationCode
	// console.log(verificationCode);
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

			// go to the next middleware
		}
	);
};

export const loginBusiness = async (req, res, next) => {
	// passport.authenticate("businessLocal", function (err, user, info) {
	//   console.log(user);
	//   if (err) {
	//     return next(err);
	//   }
	//   if (!user) {
	//     // *** Display message without using flash option
	//     // re-render the login form with a message
	//     return res.status(400).json({
	//       error: "Invalid email or password",
	//     });
	//   }
	//   req.logIn(user, function (err) {
	//     if (err) {
	//       return next(err);
	//     }
	//     return res.status(200).json({ user });
	//   });
	// })(req, res, next);
	const { businessEmail: email, password } = req.body;

	const business = await Business.findOne({ businessEmail: email }).select(['businessEmail','password', 'emailVerified', 'businessVerified']).populate('reviews');

	if (!business) {
		return res.status(400).json({
			error: 'Invalid email or password',
		});
	}

	const isMatch = await bcrypt.compare(password, business.password);
	if (!isMatch) {
		return res.status(400).json({
			error: 'Invalid email or password',
		});
	}

	const token = jwt.sign({ id: business._id }, process.env.JWT_SECRET, {
		expiresIn: '1d',
	});
	business.password = undefined;
	business.verificationCode = undefined;
	return res.status(200).json({
		token,
		user: business,
	});
};

export const currentUser = async (req, res) => {
	// const user = req.user;
	// user.password = undefined;
	// user.verificationCode = undefined;
	const business = await Business.findById(req.user.id, [
		...cardFieldsProjection,
		...excludedFieldsProjection,
	]).populate('reviews').populate('budgetClass');
	return res.status(200).json({ user: business });
};
// Logout
export const logBusinessOut = (req, res) => {
	req.logOut();
	res.redirect('/login');
};

export const verifyBusiness = async (req, res) => {
	const verificationCode = req.body?.code;

	const user = await Business.findById(req.user._id).select(['businessEmail','password', 'emailVerified', 'businessVerified', 'verificationCode']);
	const isMatch = +verificationCode === user.verificationCode;
	if (!isMatch) {
		return res.status(400).json({ error: 'Invalid Code' });
	}
	// const verifiedUser = await User.findByIdAndUpdate(
	//   { _id: _id },
	//   { verified: true },
	//   { new: true }
	// );
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

		const businessLocationImages = req.files.businessLocationImages || [];
		const cacRegistrationProof = req.files.cacRegistrationProof;
		const proofOfAddress = req.files.proofOfAddress;

		const business = req.user;
		business.businessName = businessName;
		business.businessAddress = businessAddress;
		business.description = businessAbout;
		business.businessCategory = businessCategory
			.toLowerCase()
			.replace(/\s+/g, '-');
		business.businessSubCategory = businessSubCategory;

		business.businessEmail = businessEmail;
		business.businessTelephone = businessTelephone;
		
		business.businessCacProofImageURL = await saveImagesWithModifiedName(
			cacRegistrationProof
		);
		business.businessProofAddressImageURL = await saveImagesWithModifiedName(
			proofOfAddress
		);
		business.businessLocationImages = await saveImagesWithModifiedName(
			businessLocationImages
		);
		business.businessLGA = businessLGA;
		business.businessCity = businessCity;
		business.businessState = businessState;
		business.businessVerified = 'pending';

		const pendingVerification = await business.save();

		const budgetClass = await LocationBudget.find({ label: businessBudget });

		const location = new Location({
			locationName: businessName,
			locationAddress: businessAddress,
			locationCity: businessCity,
			locationState: businessState,
			locationLGA: businessLGA,
			locationRating: business.rating,
			locationDescription: businessAbout,
			locationImagePath: business.businessLocationImages,
			locationCategory: businessCategory,
			locationAddedBy: req.user.email,
			locationSubCategory: businessSubCategory,
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
			password
		} = req.body;

		const budgetClass = await LocationBudget.findOne({ label: req.body.budgetClass });

		// const business = Business.findById(req.user._id);
		const business = req.user;
		
		if (!business) return res.status(400).json({
			error: "Business not found"
		});

		if (businessName) business.businessName = businessName;
		if (businessCategory) business.businessCategory = businessCategory
		.toLowerCase()
		.replace(/\s+/g, '-');
		if (businessSubCategory) business.businessSubCategory = businessSubCategory;
		if (businessAddress) business.businessAddress = businessAddress;
		if (businessState) business.businessState = businessState
		if (businessLGA) business.businessLGA = businessLGA;
		if (businessCity) business.businessCity = businessCity;
		if (description) business.description = description;
		
		if (budgetClass) business.budgetClass = budgetClass._id;
		if (!budgetClass) return res.status(404).json({
			error: "Can't find budget type"
		});

		const salt = await bcrypt.genSalt(13);
		if (password) {
			const check = await bcrypt.compare(password, user.password);
			if (check) return res.status(400).json({
				error: "You can't change to the same password",
			});
			business.password = await bcrypt.hash(password, salt);
		}

		const newBusiness = await business.save();
		
		const location = await Location.findOne({ business: business._id });

		await Location.findByIdAndUpdate(location._id, transformBusinessToLocation(business), { new: true }).populate("budgetClass");

		return res.status(200).json({
			business: newBusiness,
			message: "Business Settings Updated Successfully"
		})
	} catch(err) {
		return res.status(400).json({
			error: 'Failed to update business details',
			message: err.message,
		});
	}
}