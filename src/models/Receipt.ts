import mongoose, { Document, Schema } from 'mongoose';

export interface IReceipt extends Document {
  receiptNumber: string;
  date: Date;
  partyType: 'Customer' | 'Supplier';
  partyId: string;
  mode: 'Cash' | 'Bank' | 'Cheque';
  amount: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReceiptSchema = new Schema<IReceipt>({
  receiptNumber: { type: String, required: true, unique: true },
  date: { type: Date, required: true },
  partyType: { type: String, enum: ['Customer', 'Supplier'], required: true },
  partyId: { type: String, required: true, trim: true },
  mode: { type: String, enum: ['Cash', 'Bank', 'Cheque'], required: true },
  amount: { type: Number, required: true, min: 0 },
  notes: { type: String, trim: true },
}, { timestamps: true });

ReceiptSchema.index({ date: -1 });
ReceiptSchema.index({ partyType: 1, partyId: 1, date: -1 });
// receiptNumber already has a unique index via the schema field definition
// Avoid redefining the same index to prevent duplicate index warnings

ReceiptSchema.pre('validate', async function(next) {
  try {
    if (this.isNew && !this.receiptNumber) {
      const count = await mongoose.model('Receipt').countDocuments();
      this.receiptNumber = `RC-${String(count + 1).padStart(6, '0')}`;
    }
    next();
  } catch (err) {
    next(err as any);
  }
});

export default mongoose.models.Receipt || mongoose.model<IReceipt>('Receipt', ReceiptSchema);
