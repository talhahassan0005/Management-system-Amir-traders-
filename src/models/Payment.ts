import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  voucherNumber: string;
  date: Date;
  partyType: 'Customer' | 'Supplier';
  partyId: string; // ref id to Customer/Supplier
  mode: 'Cash' | 'Bank' | 'Cheque';
  amount: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  voucherNumber: { type: String, required: true, unique: true },
  date: { type: Date, required: true },
  partyType: { type: String, enum: ['Customer', 'Supplier'], required: true },
  partyId: { type: String, required: true, trim: true },
  mode: { type: String, enum: ['Cash', 'Bank', 'Cheque'], required: true },
  amount: { type: Number, required: true, min: 0 },
  notes: { type: String, trim: true },
}, { timestamps: true });

// Generate voucher number on validate to satisfy required
PaymentSchema.pre('validate', async function(next) {
  try {
    if (this.isNew && !this.voucherNumber) {
      const count = await mongoose.model('Payment').countDocuments();
      this.voucherNumber = `PM-${String(count + 1).padStart(6, '0')}`;
    }
    next();
  } catch (err) {
    next(err as any);
  }
});

// Define indexes once before model compilation
PaymentSchema.index({ date: -1 });
PaymentSchema.index({ partyType: 1, partyId: 1, date: -1 });
// Note: voucherNumber already has a unique index via the schema field definition
// Avoid defining a duplicate index to silence Mongoose duplicate index warnings

export default mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);
