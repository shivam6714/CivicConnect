import mongoose from 'mongoose';

const wardSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
    },
    number: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    zone: {
      type: String,
      enum: ['South Jammu', 'North Jammu', 'Old City', 'Bahu'],
      required: true,
    },
    councillor: {
      type: String,
    },
    contactNumber: {
      type: String,
    },
    centerCoordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    localityAliases: {
      type: [String],
      default: [],
    },
    approxRadiusMeters: {
      type: Number,
      default: 1200,
    },
  },
  {
    timestamps: true,
  }
);

export const Ward = mongoose.model('Ward', wardSchema);
