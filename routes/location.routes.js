import express from 'express';
import {
	addLocationtoLikedLocations,
	createLocation,
	getAllLocations,
	getLocationById,
	planTrip,
	reviewLocation,
} from '../controllers/location.controllers.js';
// import multer
import passport from 'passport';
import { upload } from '../config/multer.js';
import { validateBody } from '../middleware/validations.js';
import Joi from 'joi';

// Created an express routing instance
const locationRouter = express.Router();

// Here I used chained routing to make the code length smaller .
// You can read more about it in Express Docs

// To add New Locations and Get all Existing Location Data
locationRouter
	.route('/')
	.get(getAllLocations)
	.post(
		passport.authenticate(['business', 'jwt'], { session: false }),
		upload.array('pictures'),
		validateBody(
			Joi.object({
				locationName: Joi.string().required(),
				locationAddress: Joi.string().required(),
				locationRating: Joi.number().max(5),
				locationContact: Joi.string().required(),
				locationDescription: Joi.string().required(),
				locationCategory: Joi.string().required(),
				locationCity: Joi.string().required(),
				locationAddedBy: Joi.string().required(),
				locationSubCategory: Joi.string().required(),
				locationLandmark: Joi.string().required(),
				locationState: Joi.string().optional(),
				locationLGA: Joi.string().required(),
			}),
			{
				allowUnknown: true,
			}
		),
		createLocation
	); // http://localhost:8080/api/location/

locationRouter.get(
	'/plan',
	passport.authenticate(['business', 'jwt'], { session: false }),
	planTrip
);
locationRouter.get(
	'/:id',
	passport.authenticate(['business', 'jwt'], { session: false }),
	getLocationById
);
locationRouter.post(
	'/like',
	passport.authenticate(['business', 'jwt'], { session: false }),
	addLocationtoLikedLocations
);
locationRouter.post(
	'/review',
	passport.authenticate(['business', 'jwt'], { session: false }),
	upload.array('pictures'),
	reviewLocation
);

export default locationRouter;
