import { Business } from '../models/Business.model.js';
import { Location } from '../models/Location.model.js';
import { BusinessReview } from '../models/BusinessReview.js';
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
    locationContact: business.businessTelephone,
    locationDescription: business.description,
    locationCategory: business.businessCategory,
    locationSubCategory: business.businessSubCategory,
    locationImages: business.businessLocationImages,
    createdAt: business.createdAt,
    updatedAt: business.updatedAt,
    usersThatLiked: business.likes,
  };
};

export function calculateAverageRating(reviewArray) {
  if (reviewArray?.length === 0) return 0; // Handle empty reviewArrayay
  const sum = reviewArray?.reduce(
    (accumulator, currentValue) => accumulator + currentValue,
    0
  );
  return sum / reviewArray?.length;
}

/**
 * @type {import('express').RequestHandler} likeLocation
 */
export const likeLocation = async (req, res) => {
  try {
    const user = req.user;
    const locationID = req.body?.locationName;

    const location = await Business.findById(locationID);

    const actualLocation = await Location.findOne({
      business: locationID,
    }).populate('business');

    if (!location) {
      return res.status(404).json({
        message: 'Resource not found',
      });
    }

    if (location.likes.includes(user._id)) {
      return res.status(400).json({
        message: 'Location liked already',
      });
    }

    // Check if the location is already in the liked locations list
    if (!location.likes.includes(user._id)) {
      location.likes.push(user._id);
      await location.save();

      user.likedLocations.push(actualLocation);
      // Save the updated user to the database
      await user.save();
    }

    return res.status(201).json({ message: 'Liked Successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * @type {import('express').RequestHandler} unlikeLocation
 */
export const unlikeLocation = async (req, res) => {
  try {
    const user = req.user;
    const locationID = req.body?.locationName;

    const location = await Business.findById(locationID);

    const actualLocation = await Location.findOne({
      business: locationID,
    }).populate('business');

    if (!location) {
      return res.status(404).json({
        message: 'Resource not found',
      });
    }

    // Check if the location is already in the liked locations list
    if (location.likes.includes(user._id)) {
      location.likes = location.likes.filter((users) => users != user.id);
      await location.save();

      const newLikedLocs = user.likedLocations.filter(
        (locs) => locs.id != actualLocation._id
      );
      user.likedLocations = newLikedLocs;
      // // Save the updated user to the database
      await user.save();

      return res.status(200).json({
        ok: true,
      });
    }
  } catch (error) {
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
    const user = req.user;

    const images = req.files;
    const locationLoc = await Location.findById(locationID);
    let locationBusiness = await Business.findById(locationID).populate(
      'reviews'
    );
    const reviewer = await User.findById(reviewerID);

    if (!locationBusiness && !locationLoc) {
      return res.status(404).json({ error: 'Location not found' });
    } else if (!locationBusiness && locationLoc) {
      locationBusiness = await Business.findById(locationLoc.business).populate(
        'reviews'
      );
    }

    const newReview = await BusinessReview.create({
      reviewRating,
      reviewDescription,
      reviewerID,
      reviewerFullname: reviewer?.fullName,
      reviewImagePaths: await saveImagesWithModifiedName(images ?? []),
      reviewing: locationBusiness._id,
    });

    locationBusiness.reviews.push(newReview);

    const reviewRatings = await locationBusiness?.reviews?.map(
      (rev) => rev?.reviewRating
    );
    const avg = calculateAverageRating(reviewRatings);
    locationBusiness.rating = avg;
    await locationBusiness.save();

    const allUserReviews = await BusinessReview.find({
      reviewerID: req.user._id,
    });

    user.reviews = allUserReviews;
    await user.save();

    return res.status(201).json({ newReview });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: 'Internal Server Error', message: error });
  }
};

export const deleteReviewLocation = async (req, res) => {
  try {
    const { reviewID } = req.body;
    const user = req.user;

    const review = await BusinessReview.findById(reviewID);

    if (!review) {
      return res.status(404).json({ error: "This review doesn't exist" });
    } else if (review.reviewerID._id.toString() !== user.id.toString()) {
      return res
        .status(403)
        .json({ error: "You don't have permission to delete this review" });
    }

    const locationLoc = await Location.findById(review.reviewing);
    let locationBusiness = await Business.findById(review.reviewing).populate(
      'reviews'
    );

    if (!locationBusiness && !locationLoc) {
      return res.status(404).json({ error: 'Location not found' });
    } else if (!locationBusiness && locationLoc) {
      locationBusiness = await Business.findById(locationLoc.business).populate(
        'reviews'
      );
    }

    const newBusinessReviews = await locationBusiness.reviews.filter(
      (rev) => rev._id != reviewID
    );
    await BusinessReview.findByIdAndDelete(reviewID);

    const reviewRatings = await locationBusiness?.reviews?.map(
      (rev) => rev?.reviewRating
    );
    const avg = calculateAverageRating(reviewRatings);

    locationBusiness.reviews = newBusinessReviews;
    if (reviewRatings.length > 1) {
      locationBusiness.rating = avg;
    } else {
      locationBusiness.rating = 3;
    }

    locationBusiness.save();
    const newUserReviews = await user.reviews.filter(
      (review) => review._id === reviewID
    );
    console.log(newUserReviews);
    user.save();

    return res.status(200).json({ message: 'Review deleted' });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: 'Internal Server Error', message: error });
  }
};

const checkDifferenceMoreThanSpecificTime = (date1, date2, difference = 4) => {
  const timeDifference = date2.getTime() - date1.getTime();

  const diffInHours = timeDifference / (1000 * 60 * 60);
  return diffInHours > difference;
};

export const addVisitToLocationAndUser = async (req, res) => {
  try {
    const user = req.user;
    const locationID = req.query.location;

    if (
      user.lastVisit &&
      !checkDifferenceMoreThanSpecificTime(user.lastVisit, new Date(), 2)
    )
      return res.status(401).json({ message: 'Wait 2 hours to scan again' });

    if (locationID) {
      const business = await Business.findById(locationID);

      business.userVisits += 1;
      await business.save();
    }
    user.numberOfVisits += 1;
    user.lastVisit = new Date();
    await user.save();

    return res.status(201).json({ message: 'Visit added successfully' });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: 'Internal Server Error', message: error });
  }
};
