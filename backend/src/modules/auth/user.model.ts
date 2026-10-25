import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { CitizenUser } from './auth.types.js';

export interface IUserDocument extends Document {
  phoneNumber: string;
  fullName?: string;
  wardNumber?: number;
  role: 'citizen' | 'official' | 'admin';
  isPhoneVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUserDocument>(
  {
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    fullName: {
      type: String,
      trim: true,
    },
    wardNumber: {
      type: Number,
      min: 1,
      max: 75,
    },
    role: {
      type: String,
      enum: ['citizen', 'official', 'admin'],
      default: 'citizen',
      required: true,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
      required: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const UserModel: Model<IUserDocument> =
  (mongoose.models.User as Model<IUserDocument>) ||
  mongoose.model<IUserDocument>('User', userSchema);

/**
 * Formats a Mongoose user document into the safe public CitizenUser representation.
 * Explicitly omits internal database fields or potential sensitive properties.
 */
export function formatCitizenUser(user: IUserDocument): CitizenUser {
  return {
    id: user._id.toString(),
    phoneNumber: user.phoneNumber,
    fullName: user.fullName || undefined,
    wardNumber: user.wardNumber ?? undefined,
    role: user.role,
    isPhoneVerified: user.isPhoneVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
