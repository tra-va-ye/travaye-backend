import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import {
	loginUser,
	registerUser,
	verifyUser,
	getUser,
	updateProfilePhoto,
	resendVerification,
	forgotPassword,
	resetPassword,
	updateUserProfile,
} from '../controllers/user.controller.js';
import { upload } from '../config/multer.js';
import { validateBody } from '../middleware/validations.js';
import Joi from 'joi';

// Created an express routing instance
const userRouter = express.Router();

// Here I used chained routing to make the code length smaller .
// You can read more about it in Express Docs

// To add New Users and Get all Existing Users Data
userRouter
	.route('/')
	.get(passport.authenticate('jwt', { session: false }), getUser)
	.post(registerUser, (req, res, next) => {
		passport.authenticate(
			'jwt',
			{ session: false },
			function (err, user, info) {
				if (err) {
					return next(err);
				}
				if (!user) {
					// *** Display message without using flash option
					// re-render the login form with a message
					return res.status(400).json({
						error:
							info.message ?? 'A User with the given username or email exists',
					});
				}

				user.password = undefined;

				const token = req.headers.authorization?.split('Bearer ')[1];
				return res.status(201).json({ user, token });
			}
		)(req, res, next);
	}); // http://localhost:8080/api/user/
userRouter.route('/login').post(loginUser);
userRouter
	.route('/verify')
	.post(passport.authenticate('jwt', { session: false }), verifyUser);
userRouter
	.route('/resend-verification')
	.post(passport.authenticate('jwt', { session: false }), resendVerification);

userRouter
	.route('/profile-photo')
	.post(
		passport.authenticate(['business', 'jwt'], { session: false }),
		upload.single('picture'),
		updateProfilePhoto
	);

userRouter
	.put(
		'/edit-profile',
		passport.authenticate('jwt', {session: false}), 
		updateUserProfile	
	);

userRouter.post('/forgot-password', forgotPassword);

userRouter.post(
	'/reset-password',
	validateBody(
		Joi.object({
			password: Joi.string().required(),
			email: Joi.string().required(),
			token: Joi.string().required(),
		}),
		{
			allowUnknown: true
		}
	),
	resetPassword
);

export default userRouter;
