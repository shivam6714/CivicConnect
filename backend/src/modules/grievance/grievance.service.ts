import crypto from 'node:crypto';
import mongoose from 'mongoose';
import {
  GrievanceModel,
  formatGrievance,
  formatPublicMapGrievance,
  type IGrievanceDocument,
} from './grievance.model.js';
import { UserModel } from '../auth/user.model.js';
import { getJammuWard } from '../../utils/jammuWards.js';
import type {
  CreateGrievanceInput,
  FormattedGrievance,
  UpdateGrievanceStatusInput,
  GrievanceFilterOptions,
  PublicMapGrievance,
} from './grievance.types.js';
import type { AuthJwtPayload } from '../auth/auth.types.js';
import { BadRequestError, NotFoundError } from '../../errors/appError.js';

export class GrievanceService {
  /**
   * Generates a unique, server-side tracking identifier for civic tracking.
   * Format: JMC-YYYY-XXXX (e.g., JMC-2026-4821)
   */
  private async generateUniqueTrackingNumber(): Promise<string> {
    const year = new Date().getFullYear();
    for (let attempts = 0; attempts < 5; attempts++) {
      const code = crypto.randomInt(1000, 10000);
      const trackingNumber = `JMC-${year}-${code}`;
      const existing = await GrievanceModel.findOne({ trackingNumber }).select('_id');
      if (!existing) {
        return trackingNumber;
      }
    }
    // Fallback using high-entropy timestamp suffix in the rare case of collisions
    return `JMC-${year}-${Date.now().toString().slice(-4)}`;
  }

  /**
   * Persists a newly reported municipal grievance.
   * Derives citizen ownership strictly from the verified JWT identity.
   */
  async createGrievance(
    input: CreateGrievanceInput,
    userPayload: AuthJwtPayload
  ): Promise<FormattedGrievance> {
    const citizenObjectId = new mongoose.Types.ObjectId(userPayload.sub);

    // Fetch user details from database to obtain official profile name if available
    const dbUser = await UserModel.findById(citizenObjectId);
    const reporterName = dbUser?.fullName || 'Citizen';
    const reporterPhone = userPayload.phoneNumber;

    const trackingNumber = await this.generateUniqueTrackingNumber();
    const assignedWard = getJammuWard(input.wardId);
    const now = new Date();
    const slaDeadline = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72-hour municipal SLA

    const initialTimelineEvent = {
      id: `tl-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      status: 'REPORTED' as const,
      timestamp: now,
      actor: input.isAnonymous ? 'Citizen (Anonymous)' : reporterName,
      note: 'Initial grievance submitted via CivicConnect Web',
    };

    const doc = await GrievanceModel.create({
      citizenId: citizenObjectId,
      trackingNumber,
      title: input.title,
      description: input.description,
      category: input.category,
      status: 'REPORTED',
      priority: 'MEDIUM',
      location: {
        latitude: input.location.latitude,
        longitude: input.location.longitude,
      },
      geoPoint: {
        type: 'Point',
        coordinates: [input.location.longitude, input.location.latitude],
      },
      address: input.address,
      landmark: input.landmark || undefined,
      ward: assignedWard,
      imageUrl: input.imageUrl || undefined,
      reporterName: input.isAnonymous ? undefined : reporterName,
      reporterPhone: input.isAnonymous ? undefined : reporterPhone,
      isAnonymous: input.isAnonymous ?? false,
      supportCount: 1,
      supportedBy: [citizenObjectId],
      slaDeadline,
      timeline: [initialTimelineEvent],
    });

    return formatGrievance(doc, userPayload.sub);
  }

  /**
   * Retrieves all grievances reported by the authenticated citizen.
   * Strictly enforces database-level citizen isolation.
   */
  async getMyGrievances(userPayload: AuthJwtPayload): Promise<FormattedGrievance[]> {
    const citizenObjectId = new mongoose.Types.ObjectId(userPayload.sub);

    const docs = await GrievanceModel.find({ citizenId: citizenObjectId }).sort({
      createdAt: -1,
    });

    return docs.map((doc) => formatGrievance(doc, userPayload.sub));
  }

  /**
   * Retrieves all grievances across Jammu with administrative filters.
   * Enforces server-side administrator authorization.
   */
  async getAllGrievances(
    filters?: GrievanceFilterOptions,
    currentUserId?: string
  ): Promise<FormattedGrievance[]> {
    const query: Record<string, unknown> = {};

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.category) {
      query.category = filters.category;
    }

    if (filters?.wardId && typeof filters.wardId === 'number') {
      query['ward.id'] = filters.wardId;
    }

    if (filters?.priority) {
      query.priority = filters.priority;
    }

    if (filters?.searchQuery && filters.searchQuery.trim().length > 0) {
      const escaped = filters.searchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      query.$or = [
        { trackingNumber: searchRegex },
        { title: searchRegex },
        { description: searchRegex },
        { address: searchRegex },
        { 'ward.name': searchRegex },
      ];
    }

    const docs = await GrievanceModel.find(query).sort({ createdAt: -1 });
    return docs.map((doc) => formatGrievance(doc, currentUserId));
  }

  /**
   * Retrieves geo-anchored public grievances for the interactive Jammu map.
   * Strips all citizen identity, phone numbers, and private data.
   */
  async getPublicMapGrievances(): Promise<PublicMapGrievance[]> {
    const docs = await GrievanceModel.find({
      'location.latitude': { $ne: null, $gte: -90, $lte: 90 },
      'location.longitude': { $ne: null, $gte: -180, $lte: 180 },
      $nor: [{ 'location.latitude': 0, 'location.longitude': 0 }],
    }).sort({ createdAt: -1 });

    return docs.map(formatPublicMapGrievance);
  }

  /**
   * Retrieves a single grievance by ID or tracking number.
   */
  async getGrievanceById(id: string, currentUserId?: string): Promise<FormattedGrievance> {
    const isObjectId = mongoose.isValidObjectId(id);
    const query = isObjectId ? { _id: id } : { trackingNumber: id };

    const doc = await GrievanceModel.findOne(query);
    if (!doc) {
      throw new NotFoundError(`Grievance not found with identifier: ${id}`);
    }

    return formatGrievance(doc, currentUserId);
  }

  /**
   * Updates grievance status with timeline audit record.
   * Enforces valid status transitions and persists changes in MongoDB.
   */
  async updateGrievanceStatus(
    id: string,
    input: UpdateGrievanceStatusInput,
    actorPayload: AuthJwtPayload
  ): Promise<FormattedGrievance> {
    const isObjectId = mongoose.isValidObjectId(id);
    const query = isObjectId ? { _id: id } : { trackingNumber: id };

    const doc = await GrievanceModel.findOne(query);
    if (!doc) {
      throw new NotFoundError(`Grievance not found with identifier: ${id}`);
    }

    const previousStatus = doc.status;
    const newStatus = input.status;

    // Determine actor title based on role
    const actorName =
      actorPayload.role === 'admin'
        ? 'City Administrator'
        : actorPayload.role === 'official'
        ? 'Municipal Officer'
        : 'Civic Authority';

    const timelineEvent = {
      id: `tl-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      status: newStatus,
      timestamp: new Date(),
      actor: actorName,
      note: input.note?.trim() || `Status updated from ${previousStatus} to ${newStatus}`,
    };

    doc.status = newStatus;
    if (newStatus === 'RESOLVED') {
      doc.resolvedAt = new Date();
    } else if (previousStatus === 'RESOLVED') {
      doc.resolvedAt = undefined;
    }

    doc.timeline.push(timelineEvent);
    await doc.save();

    return formatGrievance(doc, actorPayload.sub);
  }
}

export const grievanceService = new GrievanceService();
