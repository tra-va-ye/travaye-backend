import { Router } from 'express';
import {
	Business,
	cardFieldsProjection,
	excludeBusinessFieldsProjection,
	excludedFieldsProjection,
} from '../models/Business.model.js';
import { planTrip } from '../controllers/location.controllers.js';

const router = Router();

router.get('/', async (req, res) => {
	try {
		const businesses = await Business.find({}).select([
			...cardFieldsProjection,
			...excludedFieldsProjection,
			...excludeBusinessFieldsProjection
		]);

		return res.json(businesses);
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
});
router.get('/plan', planTrip);

router.get('/:id', async (req, res) => {
	try {
		const business = await Business.findById(id);

		return res.json(business);
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
});

export default router;
