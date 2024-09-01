import { Router } from 'express';
import { acceptOrDenyApproval, getAllBusinesses, getBusinessByID } from '../controllers/admin.controller.js';
import passport from 'passport';

const router = Router();

router.route('/business').get(
    passport.authenticate(['jwt'], { session: false }),
    getAllBusinesses
);

router.route('/business/:id').get(
    passport.authenticate(['jwt'], { session: false }),
    getBusinessByID
)
.put(
    passport.authenticate(['jwt'], { session: false }),
    acceptOrDenyApproval
);

// router.route('/business/:id')

export default router;