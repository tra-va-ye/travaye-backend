import { Location } from "../models/Location.model.js";

export const createLocation = async (req, res) => {
  const {
    locationName,
    locationAddress,
    locationRating,
    locationContact,
    picturePath,
    locationDescription,
    locationAddedBy,
  } = await req.body;
  console.log(req.body);
  const existingLocation = await Location.findOne({
    locationName: locationName,
  }).then((err, location) => {
    if (err) {
      return err;
    } else if (location) {
      return location;
    }
  });
  try {
    if (existingLocation) {
      console.log(existingLocation);
      return res.status(400).json({ message: "Location already exist." });
    } else {
      if (!existingLocation) {
        const newLocation = new Location({
          locationName: locationName,
          locationAddress: locationAddress,
          locationContact: "",
          locationDescription: locationDescription,
          locationRating: "",
          locationImagePath: picturePath,
          locationCategory: "wildlife-attractions",
          locationAddedBy,
        });
        const savedLocation = await newLocation.save();
        res.status(200).json(savedLocation);
      }
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ error: "Failed to add location" });
  }
};
export const getAllLocations = async (req, res) => {
  try {
    const locations = await Location.find({});
    return res.status(200).json({ locations });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};