import mongoose, { Document, Schema } from 'mongoose';

export interface ISaleReturnItem {
  productId: string;
  description?: string;
  quantityPkts: number;
  weightKg: number;
  rate: number;
  value: number;
  reelNo?: string;
  notes?: string;
}

export interface ISaleReturn extends Document {
  returnNumber: string; // SR-000001
  date: Date;
  originalInvoiceNumber: string; // Reference to original sale invoice
  customer: string;
  items: ISaleReturnItem[];
  totalAmount: number;
  netAmount: number;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SaleReturnItemSchema = new Schema<ISaleReturnItem>({
  productId: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  quantityPkts: { type: Number, required: true, min: 0 },
  weightKg: { type: Number, required: true, min: 0 },
  rate: { type: Number, required: true, min: 0 },
  value: { type: Number, required: true, min: 0 },
  reelNo: { type: String, trim: true },
  notes: { type: String, trim: true },
}, { _id: false });

const SaleReturnSchema = new Schema<ISaleReturn>({
  returnNumber: { type: String, required: true, unique: true },
  date: { type: Date, required: true },
  originalInvoiceNumber: { type: String, required: true, trim: true },
  customer: { type: String, required: true, trim: true },
  items: { type: [SaleReturnItemSchema], default: [] },
  totalAmount: { type: Number, required: true, default: 0, min: 0 },
  netAmount: { type: Number, required: true, default: 0, min: 0 },
  remarks: { type: String, trim: true },
}, { timestamps: true });

SaleReturnSchema.pre('validate', async function(next) {
  try {
    if (this.isNew && !this.returnNumber) {
      const count = await mongoose.model('SaleReturn').countDocuments();
      this.returnNumber = `SR-${String(count + 1).padStart(6, '0')}`;
    }
    next();
  } catch (err) { next(err as any); }
});

export default mongoose.models.SaleReturn || mongoose.model<ISaleReturn>('SaleReturn', SaleReturnSchema);
