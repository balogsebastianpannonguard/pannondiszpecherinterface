import { ObjectId, Filter } from "mongodb";
import { getMongoDb } from "./mongodb";

export type BookingStatus = 'pending' | 'modified' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
export type BookingCategory = 'airport' | 'city' | 'long-distance' | 'vip' | 'partner';
export type PaymentMethod = 'card' | 'bank';
export type TransferType = 'standard' | 'executive';

export interface BookingAuditEntry {
  timestamp: number;
  action: string;
  actor: string;
  details?: string;
}

export interface Booking {
  _id?: string;
  bookingCode: string;
  userEmail: string;
  travelerEmail: string;
  travelerName: string;
  travelerPhone: string;
  secondTravelerEmail?: string;
  secondTravelerPhone?: string;
  companyName?: string;
  paymentMethod: PaymentMethod;
  transferType: TransferType;
  fromType: 'airport' | 'other';
  fromAddress: string;
  toType: 'airport' | 'other';
  toAddress: string;
  pickupDate: string;
  pickupTime: string;
  travelers: number;
  luggage: number;
  comment?: string;
  category: BookingCategory;
  status: BookingStatus;
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedVehicleId?: string;
  assignedVehicleName?: string;
  driverNotified?: boolean;
  driverAcknowledged?: boolean;
  price?: number;
  priceApprovalStatus?: 'pending_approval' | 'approved' | 'rejected' | null;
  priceApprovalRequest?: {
    requestedPrice: number;
    requestedBy: string;
    requestedAt: number;
    originalPrice?: number;
    reason?: string;
  } | null;
  priceApprovalResponse?: {
    respondedBy: string;
    respondedAt: number;
    decision: 'approved' | 'rejected';
    comment?: string;
  } | null;
  createdBy?: string;
  createdAt: number;
  updatedAt: number;
  auditTrail?: BookingAuditEntry[];
}

const COLLECTION_NAME = "bookings";

function convertId(doc: any): Booking {
  return {
    ...doc,
    _id: doc._id.toString(),
  } as Booking;
}

export async function getBookingsCollection() {
  const db = await getMongoDb();
  return db.collection<Booking>(COLLECTION_NAME);
}

export async function initBookingIndexes() {
  const col = await getBookingsCollection();
  try {
    await col.createIndex({ bookingCode: 1 }, { unique: true });
    await col.createIndex({ userEmail: 1 });
    await col.createIndex({ status: 1 });
    await col.createIndex({ pickupDate: 1, pickupTime: 1 });
    await col.createIndex({ createdAt: 1 });
  } catch {}
}

export async function getBookingsForDate(dateStr: string): Promise<Booking[]> {
  await initBookingIndexes();
  const col = await getBookingsCollection();
  const docs = await col.find({ pickupDate: dateStr }).sort({ pickupTime: 1 }).toArray();
  return docs.map(convertId);
}

export async function getBookingsForMonth(year: number, month: number): Promise<Booking[]> {
  await initBookingIndexes();
  const col = await getBookingsCollection();
  const mm = String(month + 1).padStart(2, '0');
  const yyyy = String(year);
  const prefix = `${yyyy}-${mm}`;
  const docs = await col.find({ pickupDate: { $regex: `^${prefix}` } }).sort({ pickupDate: 1, pickupTime: 1 }).toArray();
  return docs.map(convertId);
}

export async function getBookingsForWeek(startDate: string, endDate: string): Promise<Booking[]> {
  await initBookingIndexes();
  const col = await getBookingsCollection();
  const query: Filter<any> = {
    pickupDate: { $gte: startDate, $lte: endDate }
  };
  const docs = await col.find(query).sort({ pickupDate: 1, pickupTime: 1 }).toArray();
  return docs.map(convertId);
}

export async function getBookingById(id: ObjectId | string): Promise<Booking | null> {
  const col = await getBookingsCollection();
  const oid: ObjectId = typeof id === "string" ? new ObjectId(id) : id;
  const doc = await col.findOne({ _id: oid } as any);
  if (!doc) return null;
  return convertId(doc);
}
