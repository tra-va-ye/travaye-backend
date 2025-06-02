import { Router } from 'express';
import {
  Business,
  cardFieldsProjection,
  excludeBusinessFieldsProjection,
  excludedFieldsProjection,
} from '../models/Business.model.js';
import { planTrip } from '../controllers/location.controllers.js';
import {
  deleteReviewLocation,
  likeLocation,
  reviewLocation,
  unlikeLocation,
  addVisitToLocationAndUser,
} from '../controllers/locationv2.controller.js';
import passport from 'passport';
import { upload } from '../config/multer.js';
import { Location } from '../models/Location.model.js';
import { User } from '../models/User.model.js';

const router = Router();

export const exclusions = [
  ...excludeBusinessFieldsProjection,
  ...cardFieldsProjection,
  ...excludedFieldsProjection,
];

router.get('/', async (req, res) => {
  try {
    console.log('this endpoint');
    const locations = await Location.find({
      $expr: {
        $gt: [{ $size: '$locationImages' }, 1],
      },
    })
      .populate('business')
      .populate('budgetClass');
    return res.json(locations);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});
router.get('/plan', planTrip);

router.get(
  '/:id',
  passport.authenticate(['jwt'], { session: false }),
  async (req, res) => {
    try {
      const business = await Location.findById(req.params.id).populate([
        {
          path: 'business',
          populate: {
            path: 'reviews',
            populate: {
              path: 'reviewerID',
              model: 'User',
            },
          },
        },
        {
          path: 'business',
          populate: {
            path: 'budgetClass',
          },
        },
      ]);
      const user = await User.findById(req.user._id);

      if (!user.profilesPreviewed?.includes(req.params.id)) {
        const actualBusiness = await Business.findById(business.business._id);

        if (actualBusiness?.profileVisits) {
          actualBusiness.profileVisits = actualBusiness.profileVisits + 1;
        } else {
          actualBusiness.profileVisits = 1;
        }
        await actualBusiness.save();

        user.profilesPreviewed?.push(business);
        await user.save();
      }

      return res.json(business);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
);

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
router
  .post(
    '/review',
    passport.authenticate(['jwt'], { session: false }),
    upload.array('pictures'),
    reviewLocation
  )
  .delete(
    '/review',
    passport.authenticate(['jwt'], { session: false }),
    deleteReviewLocation
  );

router.put(
  '/visits',
  passport.authenticate(['jwt'], { session: false }),
  addVisitToLocationAndUser
);

export default router;
