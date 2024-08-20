import { Business } from '../models/Business.model.js';
import { Location } from '../models/Location.model.js';
import BusinessReview from '../models/BusinessReview.js';
import { User } from '../models/User.model.js';
import { saveImagesWithModifiedName } from './location.controllers.js';

export const transformBusinessToLocation = (business) => {
	return {
		id: business.id,
		locationName: business.businessName,
		locationAddress: business.businessAddress,
		locationCity: business.businessCity,
		locationState: business.businessState,
		locationLGA: business.businessLGA,
		locationLandmark: '',
		locationContact: business.businessTelephone,
		locationRating: 0,
		locationDescription: business.description,
		locationCategory: business.businessCategory,
		locationSubCategory: business.businessSubCategory,
		locationReviews: business.reviews,
		locationImagePath: business.businessLocationImages,
		createdAt: business.createdAt,
		updatedAt: business.updatedAt,
		usersThatLiked: business.likes,
	};
};

/**
 * @type {import('express').RequestHandler} likeLocation
 */
export const likeLocation = async (req, res) => {
	try {
		const user = req.user;
		const locationID = req.body?.locationName;
		console.log(locationID);
		const location = await Business.findById(locationID);

		if (!location) {
			return res.status(404).json({
				message: 'Resource not found',
			});
		}

		// Check if the location is already in the liked locations list
		if (!location.likes.includes(user._id)) {
			location.likes.push(user._id);
			await location.save();
		}

		// Add the location to the liked locations list
		if (!user.likedLocations.find((location) => location.id == locationID)) {
			user.likedLocations.push(location);
			// Save the updated user to the database
			await user.save();
		}

		return res.status(201).json(transformBusinessToLocation(location));
	} catch (error) {
		// laas.sendLog(
		// 	{
		// 		level: 'error',
		// 		text: error.message,
		// 		context: {
		// 			user: req.user,
		// 			action: 'like location',
		// 			...req.body,
		// 		},
		// 	},
		// 	process.env.DOPPLER_TOKEN
		// );
		console.error(error);
		return res.status(500).json({ error: error.message });
	}
};

/**
 * @type {import('express').RequestHandler} reviewLocation
 */
export const reviewLocation = async (req, res) => {
	try {
		const { locationID, reviewerID, reviewRating, reviewDescription } =
			req.body;

		// if (!files || files.length === 0) {
		// 	throw new Error('No files uploaded!');
		// }
		const images = req.files;
		const locationLoc = await Location.findById(locationID);
		let locationBusiness = await Business.findById(locationID);
		const reviewer = await User.findById(reviewerID);

		if (!locationBusiness && !locationLoc) {
			return res.status(404).json({ error: 'Location not found' });
		} else if (!locationBusiness && locationLoc) {
			locationBusiness = await Business.findById(locationLoc.business);
		}

		const newReview = {
			reviewRating,
			reviewDescription,
			reviewerID,
			reviewerFullname: reviewer?.fullName,
			reviewImagePaths: await saveImagesWithModifiedName(images ?? []),
			reviewing: locationBusiness._id,
		};
		
		const review = await BusinessReview.create(newReview);
		locationBusiness.reviews.push(review);
		await locationBusiness.save();

		return res.status(201).json(review);
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: 'Internal Server Error', message: error });
	}
};

/**
 * @type {import('express').RequestHandler} unlikeLocation
 */
export const unlikeLocation = async (req, res) => {
	try {
		const user = req.user;
		const locationID = req.body?.locationName;

		console.log(locationID);

		// Filter the location out from the liked locations list
		user.likedLocations =
			user.likedLocations?.filter((location) => {
				return location.id != locationID;
			}) ?? [];
		// Save the updated user to the database
		console.log(user);
		await user.save();

		return res.status(200).json({
			ok: true,
		});
	} catch (error) {
		// laas.sendLog(
		// 	{
		// 		level: 'error',
		// 		text: error.message,
		// 		context: {
		// 			user: req.user,
		// 			action: 'like location',
		// 			...req.body,
		// 		},
		// 	},
		// 	process.env.DOPPLER_TOKEN
		// );
		console.error(error);
		return res.status(500).json({ error: error.message });
	}
};
