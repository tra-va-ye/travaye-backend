import mongoose, { Schema } from 'mongoose';

const businessReview = new Schema({
	reviewer: {
		type: Schema.Types.ObjectId,
		ref: 'user',
	},
	rating: {
		type: Number,
	},
	reviewImagePaths: [{ type: String }],
	reviewerID: {
		type: Schema.Types.ObjectId,
		ref: 'user',
	},
	reviewerFullname: String,
	reviewerDescription: String,
	reviewerRating: Number,
});

export default mongoose.model('BusinessReview', businessReview);
