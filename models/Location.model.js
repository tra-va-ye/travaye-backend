// A Model File is For structuring and Exporting A single Instance of the required Model that is Needed For Saving Data or to Know which data to put in the database
// Where A Model itself is just the instance of the Schema Structure to apply CRUD in the database .

// Necessary Imports
import mongoose, { Schema } from 'mongoose';
import paginate from 'mongoose-paginate-v2';

// Location Schema Structure
const locationSchema = new mongoose.Schema(
	{
		locationName: {
			type: String,
			unique: true,
			required: true,
		},
		locationAddress: {
			type: String,
			required: true,
		},
		locationCity: {
			type: String,
			required: true,
		},
		locationState: {
			type: String,
			required: true,
		},
		locationLGA: {
			type: String,
			required: true,
		},
		locationLandmark: {
			type: String,
			required: true,
		},
		locationContact: {
			type: Number,
			// required: true,
		},
		locationRating: {
			type: Number,
			required: true,
			default: 3
		},
		locationDescription: {
			type: String,
			// required: true,
		},
		locationImagePath: {
			type: Array,
			default: [],
		},
		locationCategory: {
			type: String,
		},
		locationAddedBy: {
			type: String,
		},
		locationSubCategory: {
			type: String,
		},
		locationReviews: {
			type: Array,
			default: [],
		},
		usersThatLiked: {
			type: Array,
			default: [],
		},
		budgetClass: {
			type: Schema.Types.ObjectId,
			ref: 'Budget',
		},
		business: {
			type: Schema.Types.ObjectId,
			ref: 'Business',
		},
	},
	{
		timestamps: true,
	}
);

locationSchema.plugin(paginate);

// Exporting Model
export const Location = mongoose.model('Location', locationSchema);
