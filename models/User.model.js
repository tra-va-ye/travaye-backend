// A Model File is For structuring and Exporting A single Instance of the required Model that is Needed For Saving Data or to Know which data to put in the database
// Where A Model itself is just the instance of the Schema Structure to apply CRUD in the database .

// Necessary Imports
import mongoose, { Schema } from "mongoose";
import findOrCreate from "mongoose-findorcreate";
import passportLocalMongoose from "passport-local-mongoose";

// User Schema Structure
const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false
    },
    verificationCode: {
      type: Number,
      select: false
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    likedLocations: {
      type: [Schema.Types.ObjectId],
      default: [],
      ref: 'Business'
    },
    profilePhoto: String,
    occupation: String,
  },
  {
    timestamps: true,
  }
);
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// Exporting Model
export const User = mongoose.model("User", userSchema);
