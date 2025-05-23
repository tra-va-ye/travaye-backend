import dotenv from 'dotenv';
import { Location } from '../models/Location.model.js';
import { User } from '../models/User.model.js';
import {
  Business,
  cardFieldsProjection,
  excludeBusinessFieldsProjection,
  excludedFieldsProjection,
} from '../models/Business.model.js';

// This function works as an organizer for multiple images to avoid images having same name
dotenv.config();

export const saveImagesWithModifiedName = async (files = []) => {
  const imageUrls = [];
  // console.log(files);
  try {
    files.map((file) => imageUrls.push(file.path));
  } catch (err) {
    console.error(err);
    throw new Error(`Error uploading images: ${err.message}`);
  }
  return imageUrls;
};

export const createLocation = async (req, res) => {
  const {
    locationName,
    locationAddress,
    locationRating,
    locationContact,
    locationDescription,
    locationCategory,
    locationCity,
    locationAddedBy,
    locationSubCategory,
    locationLandmark,
    locationState,
    locationLGA,
  } = req.body;

  const existingLocation = await Location.findOne({
    locationName: locationName,
    locationCity,
    locationState,
  }).then((err, location) => {
    if (err) {
      console.error(err.message);
      return err;
    } else if (location) {
      return location;
    }
  });

  try {
    const files = req.files;

    if (!files || files.length === 0) {
      throw new Error('No files uploaded!');
    }
    const images = req.files;

    if (existingLocation) {
      console.log(existingLocation);
      return res.status(400).json({ message: 'Location already exist.' });
    } else {
      if (!existingLocation) {
        const newLocation = new Location({
          locationName: locationName,
          locationAddress: locationAddress,
          locationContact: locationContact,
          locationDescription: locationDescription,
          locationRating: locationRating,
          locationImages: await saveImagesWithModifiedName(images),
          locationCategory: locationCategory.toLowerCase().replace(/\s+/g, '-'),
          locationSubCategory: locationSubCategory
            .toLowerCase()
            .replace(/\s+/g, '-'),
          locationAddedBy: locationAddedBy,
          locationCity,
          locationState,
          locationLandmark,
          locationLGA,
        });
        const savedLocation = await newLocation.save();
        return res.status(200).json(savedLocation);
      }
    }
  } catch (error) {
    console.log(error.message);
    return res
      .status(400)
      .json({ error: 'Failed to add location', message: error.message });
  }
};

export const getAllLocations = async (req, res) => {
  const { page = 1, count = 10, filters, location } = req.query;
  try {
    const query = {};

    // Using split() method allows to send multiple filters and location in one  query parameter
    // The Frontend guys should join() the array with "," to make it a comma seperated string
    // Using regex for case insensitve (whether capitalized or not returns a match if the string of the filter entails same characters)

    if (filters && filters.toLowerCase() !== 'all') {
      query.locationCategory = {
        $in: filters
          .split(',')
          .map((category) => new RegExp(category.trim(), 'i')),
      };
    }

    query.business.businessVerified = 'verified';

    if (location) {
      query.locationCity = {
        $in: location.split(',').map((loc) => new RegExp(loc.trim(), 'i')),
      };
    }

    const totalLocations = await Location.countDocuments(query);
    const locations = await Location.find(query)
      .limit(Number(count))
      .skip((Number(page) - 1) * Number(count));

    const meta = {
      prev: page > 1 ? page - 1 : null,
      next: locations.length < count ? null : Number(page) + 1,
      from: (Number(page) - 1) * Number(count) + 1,
      to: (Number(page) - 1) * Number(count) + locations.length,
      page: Number(page),
      count: Number(count),
      total: totalLocations,
    };

    return res.status(200).json({ data: locations, meta });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const getLocationById = async (req, res) => {
  try {
    const { id } = req.params;

    const location = await Location.findById(id).populate('budgetClass');
    return res.status(200).json(location);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const planTrip = async (req, res) => {
  try {
    const {
      city,
      state,
      lga,
      category,
      subcategory,
      budget,
      page = 1,
      count = 10,
    } = req.query;

    let query = {};

    if (city) query.locationCity = city;

    if (state) query.locationState = state;

    if (lga) query.locationLGA = lga;

    if (category && category.split(',').length) {
      query.locationCategory = { $in: [...category.split(',')] };
    }

    if (subcategory && subcategory.split(',').length) {
      query.locationSubCategory = { $in: [...subcategory.split(',')] };
    }

    const locations = await Location.find(query)
      .populate([
        {
          path: 'business',
          populate: {
            path: 'budgetClass',
          },
        },
      ])
      .skip((page - 1) * count)
      .limit(count);

    let filteredLocations = locations;

    if (budget) {
      const filtered = locations.filter(
        (loc) => loc.business.budgetClass._id == budget
      );
      filteredLocations = filtered;
    }

    const meta = {
      prev: page > 1 ? page - 1 : null,
      next: filteredLocations.length < count ? null : page + 1,
      from: (page - 1) * count + 1,
      to: (page - 1) * count + filteredLocations.length,
      page,
      count,
      total: await Business.countDocuments({ businessVerified: 'verified' }),
    };

    return res.status(200).json({ data: filteredLocations, meta });
  } catch (err) {
    console.log(err);
    return res.status(400).json({ error: err.message });
  }
};

export const addLocationtoLikedLocations = async (req, res) => {
  try {
    const user = req.user;
    const locationName = req.body?.locationName;

    // Check if the location is already in the liked locations list
    if (user.likedLocations.includes(locationName)) {
      return res.status(400).json({ error: 'Location is already liked' });
    }

    // Add the location to the liked locations list
    user.likedLocations.push(locationName);

    const location = await Location.findOne({ locationName });
    location && location.usersThatLiked.push(user._id);
    // Save the updated user to the database
    await user.save();
    const updatedLocation = await location.save();

    res.status(201).json(updatedLocation);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export const reviewLocation = async (req, res) => {
  try {
    const { locationID, reviewerID, reviewRating, reviewDescription } =
      req.body;
    const files = req.files;

    // if (!files || files.length === 0) {
    // 	throw new Error('No files uploaded!');
    // }
    const images = req.files;
    const location = await Location.findById(locationID);
    const reviewer = await User.findById(reviewerID);

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const newReview = {
      reviewRating,
      reviewDescription,
      reviewerID,
      reviewerFullname: reviewer?.fullName,
      reviewImagePaths: await saveImagesWithModifiedName(images),
    };

    location.locationReviews.push(newReview);

    const updatedLocation = await location.save();

    res.status(201).json(updatedLocation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
