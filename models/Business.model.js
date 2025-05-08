// A Model File is For structuring and Exporting A single Instance of the required Model that is Needed For Saving Data or to Know which data to put in the database
// Where A Model itself is just the instance of the Schema Structure to apply CRUD in the database .

// Necessary Imports
import mongoose, { Schema } from 'mongoose';
import findOrCreate from 'mongoose-findorcreate';
import passportLocalMongoose from 'passport-local-mongoose';
import paginate from 'mongoose-paginate-v2';

// User Schema Structure
const businessSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      unique: true,
      required: true,
    },
    businessAddress: {
      type: String,
    },
    businessLGA: {
      type: String,
      default: 'Lagos MainLand',
    },
    businessCity: {
      type: String,
      default: 'Lagos',
    },
    businessState: {
      type: String,
      default: 'Lagos',
    },
    businessEmail: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    verificationCode: {
      type: Number,
      required: true,
      select: false,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    businessVerified: {
      type: String,
      enum: ['pending', 'verified', 'denied'],
    },
    businessTelephone: {
      type: Number,
    },
    businessCategory: {
      type: String,
    },
    businessSubCategory: {
      type: String,
    },
    // businessCacProofImageURL: {
    //   type: Array,
    //   default: [],
    //   select: false,
    // },
    // businessProofAddressImageURL: {
    //   type: Array,
    //   default: [],
    //   select: false,
    // },
    businessLocationImages: {
      type: Array,
      default: [],
    },
    // businessCardAuthorizationCode: {
    //   type: String,
    //   select: false,
    // },
    // businessCardBin: {
    //   type: String,
    //   select: false,
    // },
    // businessCardLast4Digit: {
    //   type: String,
    //   select: false,
    // },
    // businessCardExpiryMonth: {
    //   type: String,
    //   select: false,
    // },
    // businessCardExpiryYear: {
    //   type: String,
    //   select: false,
    // },
    // businessCardChannel: {
    //   type: String,
    //   select: false,
    // },
    // businessCardType: {
    //   type: String,
    //   select: false,
    // },
    // businessCardBank: {
    //   type: String,
    //   select: false,
    // },
    // businessCardCountryCode: {
    //   type: String,
    //   select: false,
    // },
    // businessCardBrand: {
    //   type: String,
    //   select: false,
    // },
    // businessCardReusable: {
    //   type: Boolean,
    //   select: false,
    // },
    // businessCardSignature: {
    //   type: String,
    //   select: false,
    // },
    addedCard: {
      type: Boolean,
      default: false,
      select: false,
    },
    description: {
      type: String,
    },
    likes: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    reviews: {
      type: [Schema.Types.ObjectId],
      ref: 'BusinessReview',
    },
    rating: {
      type: Number,
      default: 3,
    },
    profilePhoto: String,
    budgetClass: {
      type: Schema.Types.ObjectId,
      ref: 'Budget',
    },
    profileVisits: {
      required: true,
      type: Number,
      default: 0,
    },
    userVisits: {
      type: Number,
      required: true,
      default: 0,
    },
    engagementRate: {
      type: Number,
      default: 0,
    },
    conversionRate: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

businessSchema.pre('save', function (next) {
  if (
    this.isModified('profileVisits') ||
    this.isModified('likes') ||
    this.isModified('reviews')
  ) {
    const calculatedEngagement =
      ((this.reviews.length + this.likes.length) / this.profileVisits) * 100;
    this.engagementRate = calculatedEngagement;

    const calculatedConversion =
      (this.reviews.length / this.profileVisits) * 100;
    this.conversionRate = calculatedConversion;
  }
  next();
});

const options = {
  usernameField: 'businessEmail',
};
businessSchema.plugin(passportLocalMongoose, options);
businessSchema.plugin(findOrCreate);
businessSchema.plugin(paginate);

businessSchema.virtual('likeCount').get(function () {
  return this.likes?.length || 0;
});

businessSchema.methods.toJSON = function () {
  return { ...this._doc, usersThatLiked: this.likes };
};

// Exporting Model
export const Business = mongoose.model('Business', businessSchema);

// These are projection rules used to secure sensitive information
// Always apply them in queries where they are not needed
export const cardFieldsProjection = [
  '-addedCard',
  '-businessCardBin',
  '-businessCardAuthorizationCode',
  '-businessCardAuthorizationCode',
  '-businessCardBank',
  '-businessCardBrand',
  '-businessCardChannel',
  '-businessCardCountryCode',
  '-businessCardExpiryMonth',
  '-businessCardExpiryYear',
  '-businessCardLast4Digit',
  '-businessCardReusable',
  '-businessCardSignature',
  '-businessCardType',
];

export const excludeBusinessFieldsProjection = [
  '-businessCacProofImageURL',
  '-businessProofAddressImageURL',
];

export const excludedFieldsProjection = [
  '-emailVerified',
  '-verificationCode',
  '-password',
];
