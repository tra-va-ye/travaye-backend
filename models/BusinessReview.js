import mongoose, { Schema } from 'mongoose';

const businessReview = new Schema(
	{
		reviewImagePaths: [{ type: String }],
		reviewerID: {
			type: Schema.Types.ObjectId,
			ref: 'user',
		},
		reviewing: {
			type: Schema.Types.ObjectId,
			ref: 'Business',
			required: true
		},
		reviewerFullname: String,
		reviewDescription: String,
		reviewRating: Number,
	},
	{
		timestamps: true,
	}
);

export const BusinessReview = mongoose.model('BusinessReview', businessReview);
