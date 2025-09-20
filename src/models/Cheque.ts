import mongoose, { Document, Schema } from 'mongoose';

export type ChequeStatus = 'Due' | 'Paid' | 'Bounced';
export type PartyType = 'Customer' | 'Supplier';

export interface ICheque extends Document {
  chequeNumber: string; // internal sequence e.g., CQ-000001
  chequeNo: string; // bank cheque no
  bank: string;
  partyType: PartyType;
  partyId: string;
  amount: number;
  issueDate: Date;
  dueDate: Date;
  status: ChequeStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChequeSchema = new Schema<ICheque>({
  chequeNumber: { type: String, required: true, unique: true },
  chequeNo: { type: String, required: true, trim: true },
  bank: { type: String, required: true, trim: true },
  partyType: { type: String, enum: ['Customer', 'Supplier'], required: true },
  partyId: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  issueDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['Due', 'Paid', 'Bounced'], default: 'Due' },
  notes: { type: String, trim: true },
}, { timestamps: true });

// Helpful indexes for filtering/search
ChequeSchema.index({ status: 1, dueDate: 1 });
ChequeSchema.index({ partyType: 1, partyId: 1 });
ChequeSchema.index({ chequeNo: 1 });

ChequeSchema.pre('validate', async function(next) {
  try {
    if (this.isNew && !this.chequeNumber) {
      const count = await mongoose.model('Cheque').countDocuments();
      this.chequeNumber = `CQ-${String(count + 1).padStart(6, '0')}`;
    }
    next();
  } catch (err) {
    next(err as any);
  }
});

export default mongoose.models.Cheque || mongoose.model<ICheque>('Cheque', ChequeSchema);
