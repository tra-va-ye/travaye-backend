import { Router } from 'express';
import {
	Business,
	cardFieldsProjection,
	excludeBusinessFieldsProjection,
	excludedFieldsProjection,
} from '../models/Business.model.js';
import { planTrip } from '../controllers/location.controllers.js';
import {
	likeLocation,
	reviewLocation,
	unlikeLocation,
} from '../controllers/locationv2.controller.js';
import passport from 'passport';
import { upload } from '../config/multer.js';
import { Location } from '../models/Location.model.js';

const router = Router();

export const exclusions = [
	...excludeBusinessFieldsProjection,
	...cardFieldsProjection,
	...excludedFieldsProjection,
];

router.get('/', async (req, res) => {
	try {
		const query = Location.find({}).populate('business').populate('budgetClass');

		const businesses = await Location.paginate(query, {
			customLabels: {
				docs: 'data',
				meta: 'meta',
			},
		});

		return res.json(businesses);
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: error.message });
	}
});
router.get('/plan', planTrip);

router.get('/:id', async (req, res) => {
	try {
		const business = await Location.findById(req.params.id).populate(
			'business'
		);
		// .select(exclusions)
		// .populate('reviews');

		return res.json(business.business);
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
});

router.post(
	'/like',
	passport.authenticate(['jwt', 'business'], { session: false }),
	likeLocation
);
router.post(
	'/unlike',
	passport.authenticate(['jwt', 'business'], { session: false }),
	unlikeLocation
);
router.post(
	'/review',
	passport.authenticate(['jwt'], { session: false }),
	upload.array('pictures'),
	reviewLocation
);

export default router;
