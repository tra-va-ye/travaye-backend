import { Business } from '../models/Business.model.js';
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
		// if (user.likedLocations.includes(locationName)) {
		// 	return res.status(400).json({ error: 'Location is already liked' });
		// }
		if (location.likes.includes(user._id)) {
			return res.status(201).json(transformBusinessToLocation(location));
			// return res.json({ ok: true, error: 'Location is already liked' });
		}

		// Add the location to the liked locations list
		user.likedLocations.push(locationID);
		location && location.likes.push(user._id);
		// Save the updated user to the database
		await user.save();
		await location.save();

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
		const location = await Business.findById(locationID);
		const reviewer = await User.findById(reviewerID);

		if (!location) {
			return res.status(404).json({ error: 'Location not found' });
		}

		const newReview = {
			reviewRating,
			reviewDescription,
			reviewerID,
			reviewerFullname: reviewer?.fullName,
			reviewImagePaths: await saveImagesWithModifiedName(images ?? []),
		};

		const review = await BusinessReview.create(newReview);

		location.reviews.push(review);

		const updatedLocation = await location.save();

		return res.status(201).json(review);
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: 'Internal Server Error' });
	}
};
