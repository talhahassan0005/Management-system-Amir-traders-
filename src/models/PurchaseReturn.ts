import mongoose, { Document, Schema } from 'mongoose';

export interface IPurchaseReturnItem {
  productId: string;
  description?: string;
  quantityPkts: number;
  weightKg: number;
  rate: number;
  value: number;
  reelNo?: string;
  notes?: string;
}

export interface IPurchaseReturn extends Document {
  returnNumber: string; // PR-000001
  date: Date;
  originalInvoiceNumber: string; // Reference to original purchase invoice
  supplier: string;
  items: IPurchaseReturnItem[];
  totalAmount: number;
  netAmount: number;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseReturnItemSchema = new Schema<IPurchaseReturnItem>({
  productId: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  quantityPkts: { type: Number, required: true, min: 0 },
  weightKg: { type: Number, required: true, min: 0 },
  rate: { type: Number, required: true, min: 0 },
  value: { type: Number, required: true, min: 0 },
  reelNo: { type: String, trim: true },
  notes: { type: String, trim: true },
}, { _id: false });

const PurchaseReturnSchema = new Schema<IPurchaseReturn>({
  returnNumber: { type: String, required: true, unique: true },
  date: { type: Date, required: true },
  originalInvoiceNumber: { type: String, required: true, trim: true },
  supplier: { type: String, required: true, trim: true },
  items: { type: [PurchaseReturnItemSchema], default: [] },
  totalAmount: { type: Number, required: true, default: 0, min: 0 },
  netAmount: { type: Number, required: true, default: 0, min: 0 },
  remarks: { type: String, trim: true },
}, { timestamps: true });

PurchaseReturnSchema.pre('validate', async function(next) {
  try {
    if (this.isNew && !this.returnNumber) {
      const count = await mongoose.model('PurchaseReturn').countDocuments();
      this.returnNumber = `PRR-${String(count + 1).padStart(6, '0')}`;
    }
    next();
  } catch (err) { next(err as any); }
});

export default mongoose.models.PurchaseReturn || mongoose.model<IPurchaseReturn>('PurchaseReturn', PurchaseReturnSchema);
