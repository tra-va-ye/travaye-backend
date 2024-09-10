import { Router } from 'express';
import { acceptOrDenyApproval, deleteBusinessProfile, getAllBusinesses, getBusinessByID } from '../controllers/admin.controller.js';
import passport from 'passport';

const router = Router();

router.route('/business').get(
    passport.authenticate(['jwt'], { session: false }),
    getAllBusinesses
);

router.route('/business/:id').get(
    passport.authenticate(['jwt'], { session: false }),
    getBusinessByID
).delete(
    passport.authenticate(['jwt'], { session: false }),
    deleteBusinessProfile
).put(
    passport.authenticate(['jwt'], { session: false }),
    acceptOrDenyApproval
);

export default router;