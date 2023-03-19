import express from "express";
import passport from "passport";
import {
  currentUser,
  loginBusiness,
  registerBusiness,
} from "../controllers/business.controller.js";

const businessRouter = express.Router();

// To add New Business and current logged in Business Data
businessRouter
  .route("/")
  .get(currentUser)
  .post(registerBusiness, (req, res, next) => {
    passport.authenticate("businessLocal", function (err, user, info) {
      if (err) {
        return next(err);
      }
      if (!user) {
        // *** Display message without using flash option
        // re-render the login form with a message
        res.status(400).json({
          error: "No Business Found",
        });
      }
      req.logIn(user, function (err) {
        if (err) {
          return next(err);
        }
        return res.status(200).json({ user });
      });
    })(req, res, next);
  }); // http://localhost:8080/api/business/
businessRouter.route("/login").post(loginBusiness);
export default businessRouter;