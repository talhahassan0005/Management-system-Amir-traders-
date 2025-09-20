import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomer extends Document {
  code: string;
  description: string;
  business: string;
  city: string;
  person: string;
  phone: string;
  address: string;
  email: string;
  mobile: string;
  creditDays: number;
  creditLimit: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema: Schema = new Schema({
  code: {
    type: String,
    required: [true, 'Customer code is required'],
    unique: true,
    trim: true,
  set: (v: string) => (v && v.trim().length > 0 ? v : undefined as any),
  },
  description: {
    type: String,
    required: [true, 'Customer description is required'],
    trim: true,
  },
  business: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    trim: true,
  },
  person: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  mobile: {
    type: String,
    trim: true,
  },
  creditDays: {
    type: Number,
    default: 0,
    min: 0,
  },
  creditLimit: {
    type: Number,
    default: 0,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Ensure customer code exists before validation (runs before required validation)
CustomerSchema.pre('validate', async function(next) {
  try {
    if (this.isNew && !this.code) {
      const count = await mongoose.model('Customer').countDocuments();
      // Preserve existing format; adjust as needed later
      this.code = `24-06-${String(count + 1).padStart(6, '0')}`;
    }
    next();
  } catch (err) {
    next(err as any);
  }
});

export default mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);
