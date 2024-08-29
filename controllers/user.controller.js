import bcrypt from 'bcryptjs';
import { User } from '../models/User.model.js';
import sendVerifyEmail from '../services/index.service.js';
import jwt from 'jsonwebtoken';
import path from 'path';
import { sendEmail } from '../services/mail/mail.service.js';
import { render } from 'pug';
import { dirname } from '../lib/index.js';
import { readFileSync } from 'fs';
import Cache from '../lib/cache.js';
import { exclusions } from '../routes/locationv2.router.js';
import { Business } from '../models/Business.model.js';

export const registerUser = async (req, res, next) => {
	const username = req.body?.username;
	const email = req.body?.email;
	const password = req.body?.password;
	const fullName = req.body?.fullName;
	const occupation = req.body?.occupation;

	// Encryption
	const salt = await bcrypt.genSalt(13);
	const hashedPassword = await bcrypt.hash(password, salt);
	// Random Four digit code
	// Generates a random 4-digit code
	let verificationCode = Math.floor(Math.random() * 9000) + 1000;
	User.register(
		{
			username: username,
			email: email,
			fullName: fullName,
			password: hashedPassword,
			verificationCode: verificationCode,
			occupation,
		},
		password,
		async function (err, user) {
			if (err) {
				console.log(err);
				return res.status(400).json({
					error: 'A User with the given username or email exists',
				});
			}
			const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
				expiresIn: '1d',
			});
			req.headers.authorization = `Bearer ${token}`;

			try {
				const mail = render(
					readFileSync(
						path.resolve(
							dirname(import.meta.url),
							'../views/email/verification-code.pug'
						)
					),
					{
						code: verificationCode,
						filename: 'verification-code',
					}
				);

				await sendEmail(email, mail, 'E-mail Verification');
			} catch (error) {
				console.error(error);
			}
			return next();
		}
	);
};

export const loginUser = async (req, res, next) => {
	const username = req.body.username;
	const password = req.body.password;

	try {
		const user = await User.findOne({ username: username }).select(['username', 'email', 'password', 'emailVerified']);

		if (!user) {
			return res.status(400).json({
				error: 'Invalid username or password',
			});
		}

		const check = await bcrypt.compare(password, user.password);
		if (!check) {
			return res.status(400).json({
				error: 'Invalid username or password',
			});
		}

		const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
			expiresIn: '1d',
		});
		user.password = undefined;
		user.verificationCode = undefined;
		return res.status(200).json({ token, user });
	} catch (err) {
		console.log(err);
		return res.status(500).json({
			message: err.message,
		});
	}
};
// Logout
export const logUserOut = (req, res) => {
	req.logOut();
	res.redirect('/login');
};
// Verify
export const verifyUser = async (req, res) => {
	const verificationCode = req.body?.code;

	const user = await User.findById(req.user._id).select([]);
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
	res.status(200).json({ user });
};

export const getUser = async (req, res) => {
	const user = await User.findById(req.user.id, '-password -verificationCode').populate([
		{
			path: 'likedLocations',
			select: [...exclusions],
			populate: {
				path: 'business'
			}
		}
	]);
	// user.password = undefined;
	// user.verificationCode = undefined;
	return res.status(200).json({ user });
};

/**
 *
 * @param {Express.Request} req
 * @param {*} res
 */
export const updateProfilePhoto = async (req, res) => {
	const file = req.file;
	const user = req.user;

	if (!file)
		return res.status(400).json({ message: 'Please submit a picture' });

	if (['.jpg', '.png', '.jpeg'].includes(path.extname(file.originalname))) {
		user.profilePhoto = file.path;
		await user.save();

		return res.json({ message: 'Upload successful' });
	}

	return res.status(400).json({ message: 'Invalid file type.' });
};

export const updateUserProfile = async (req, res) => {
	try {
		const { fullName, username, occupation, aboutUser, password } = req.body;
		
		const user = await User.findById(req.user._id);

		if (!user) return res.status(404).json({ message: "User not found" });
		const salt = await bcrypt.genSalt(13);

		if (username) user.username = username;
		if (fullName) user.fullName = fullName;
		if (occupation) user.occupation = occupation;
		if (aboutUser) user.aboutUser = aboutUser;
		
		if (password) {
			const check = await bcrypt.compare(password, user.password);
			if (check) return res.status(400).json({
				error: "You can't change to the same password",
			});
			user.password = await bcrypt.hash(password, salt);
		}

		await user.save();
		
		return res.status(200).json({
			message: "Profile updated",
			updatedUser: await User.findById(user._id).populate({
				path: 'likedLocations',
				select: [...exclusions]
			})
		});
	} catch(err) {
		return res.status(500).json({ error: err.message });
	} 
};

export const resendVerification = async (req, res, next) => {
	if (!req.user) {
		return res.status(401).json({ message: 'Unauthorized' });
	}

	if (req.user.emailVerified) {
		return res.status(403).json({ message: 'Already verified' });
	}

	await sendVerifyEmail(req.user.email, req.user.verificationCode);
	return res.status(200).json({ message: 'Successful' });
};

export const forgotPassword = async (req, res) => {
	const cache = new Cache();
	const client = cache.getClient();
	const { email } = req.body;

	const user = await User.findOne({ email }); //.or([{ username: email }]).exec();
	const business = await Business.findOne({ businessEmail: email });

	if (!user && !business) {
		return res.status(400).json({ message: 'User Not Found' });
	}

	let token; 
	if (business && !user) {
		token = jwt.sign(
			{
				id: business.id,
				action: 'reset-password',
			},
			process.env.JWT_SECRET,
			{
				expiresIn: '1d',
			}
		);
	} else if (user && !business) {
		token = jwt.sign(
			{
				id: user.id,
				action: 'reset-password',
			},
			process.env.JWT_SECRET,
			{
				expiresIn: '1d',
			}
		);

	}

	// client.setex(`forgot-password:${user.id}`, 60 * 60 * 24, token);

	let hostname = (process.env.NODE_ENV == 'production'
		? 'travaye.ng'
		: 'travaye-frontend-git-staging-tra-va-yes-projects.vercel.app/');
	const url = `https://${hostname}/reset-password?token=${token}&email=${email}`;
	const message = `Click the link to reset your password <a href='${url}'>link</a>`;

	sendEmail(email, message, 'Password Reset').catch((err) => {
		console.error(err);
	});
	return res.status(200).json({
		ok: true,
	});
};

export const resetPassword = async (req, res) => {
	const { token, password } = req.body;

	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET, {
			complete: false,
		});
		const user = await User.findById(payload.id);
		const business = await Business.findById(payload.id);

		if (!user && !business) {
			return res.status(400).json({
				message: 'User Not Found',
				error: 'Bad request',
			});
		}

		if (user && !business) {
			user.password = bcrypt.hashSync(password, bcrypt.genSaltSync(13));
			await user.save();
	
			return res.status(200).json({
				ok: true,
			});
		} else if (business && !user) {
			business.password = bcrypt.hashSync(password, bcrypt.genSaltSync(13));
			await business.save();
	
			return res.status(200).json({
				ok: true,
			});
		}

	} catch (err) {
		return res.status(500).json({ error: err.message });
	}
};
