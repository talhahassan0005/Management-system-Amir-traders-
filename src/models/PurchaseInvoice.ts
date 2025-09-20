import mongoose, { Document, Schema } from 'mongoose';

export interface IPurchaseInvoiceItem {
  store: string;
  product: string;
  reelNo: string;
  width: number;
  qty: number;
  weight: number;
  rate?: number;
  rateOn?: 'Weight' | 'Quantity';
  value?: number;
  remarks: string;
  brand: string;
  length: number;
  grams?: number;
  description?: string;
  packing?: number;
}

export interface IPurchaseInvoice extends Document {
  invoiceNumber: string;
  supplier?: string; // supplier code or name
  date: Date;
  reference: string;
  paymentType: 'Cash' | 'Credit';
  items: IPurchaseInvoiceItem[];
  totalAmount: number;
  discount: number;
  freight: number;
  weight: number;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseInvoiceItemSchema: Schema = new Schema({
  store: { type: String },
  product: { type: String, required: true },
  reelNo: { type: String },
  width: { type: Number, default: 0 },
  qty: { type: Number, default: 0 },
  weight: { type: Number, default: 0 },
  rate: { type: Number, default: 0 },
  rateOn: { type: String, enum: ['Weight', 'Quantity'], default: 'Weight' },
  value: { type: Number, default: 0 },
  remarks: { type: String },
  brand: { type: String },
  length: { type: Number, default: 0 },
  grams: { type: Number, default: 0 },
  description: { type: String },
  packing: { type: Number, default: 0 },
});

const PurchaseInvoiceSchema: Schema = new Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
  },
  supplier: {
    type: String,
    trim: true,
  },
  date: {
    type: Date,
    required: true,
  },
  reference: {
    type: String,
  },
  paymentType: {
    type: String,
    enum: ['Cash', 'Credit'],
    required: true,
  },
  items: [PurchaseInvoiceItemSchema],
  totalAmount: {
    type: Number,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  freight: {
    type: Number,
    default: 0,
  },
  weight: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Ensure invoice number exists before validation (so required passes)
PurchaseInvoiceSchema.pre('validate', async function(next) {
  try {
    if (this.isNew && !this.invoiceNumber) {
      const count = await mongoose.model('PurchaseInvoice').countDocuments();
      this.invoiceNumber = `PI-${String(count + 1).padStart(6, '0')}`;
    }
    next();
  } catch (err) {
    next(err as any);
  }
});

export default mongoose.models.PurchaseInvoice || mongoose.model<IPurchaseInvoice>('PurchaseInvoice', PurchaseInvoiceSchema);
