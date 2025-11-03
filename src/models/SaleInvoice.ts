import mongoose, { Document, Schema } from 'mongoose';

export interface ISaleInvoiceItem {
  store: string;
  product: string;
  length: number;
  width: number;
  grams: number;
  description: string;
  packing: number;
  brand: string;
  reelNo: string;
  constant: string;
  pkt: number;
  weight: number;
  stock: number;
  rate: number;
  rateOn: string;
  remarks: string;
  value: number;
  pktRate: number;
}

export interface ISaleInvoice extends Document {
  invoiceNumber: string;
  customer: string;
  cDays: number;
  date: Date;
  reference: string;
  deliveredTo: string;
  limit: number;
  balance: number;
  paymentType: 'Cash' | 'Credit' | 'Code';
  deliveryAddress: string;
  adda: string;
  biltyNo: string;
  remarks: string;
  biltyDate: Date;
  ctn: string;
  deliveredBy: string;
  items: ISaleInvoiceItem[];
  totalAmount: number;
  discountPercent: number;
  discountRs: number;
  freight: number;
  labour: number;
  netAmount: number;
  receive: number;
  totalWeight: number;
  createdAt: Date;
  updatedAt: Date;
}

const SaleInvoiceItemSchema: Schema = new Schema({
  store: { type: String, required: true },
  product: { type: String, required: true },
  length: { type: Number, default: 0 },
  width: { type: Number, default: 0 },
  grams: { type: Number, default: 0 },
  description: { type: String, required: true },
  packing: { type: Number, default: 0 },
  brand: { type: String },
  reelNo: { type: String },
  constant: { type: String },
  pkt: { type: Number, default: 0 },
  weight: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  rate: { type: Number, default: 0 },
  rateOn: { type: String, default: 'Weight' },
  remarks: { type: String },
  value: { type: Number, default: 0 },
  pktRate: { type: Number, default: 0 },
});

const SaleInvoiceSchema: Schema = new Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
  },
  customer: {
    type: String,
    required: true,
  },
  cDays: {
    type: Number,
    default: 0,
  },
  date: {
    type: Date,
    required: true,
  },
  reference: {
    type: String,
  },
  deliveredTo: {
    type: String,
  },
  limit: {
    type: Number,
    default: 0,
  },
  balance: {
    type: Number,
    default: 0,
  },
  paymentType: {
    type: String,
    enum: ['Cash', 'Credit', 'Code'],
    required: true,
  },
  deliveryAddress: {
    type: String,
  },
  adda: {
    type: String,
  },
  biltyNo: {
    type: String,
  },
  remarks: {
    type: String,
  },
  biltyDate: {
    type: Date,
  },
  ctn: {
    type: String,
  },
  deliveredBy: {
    type: String,
  },
  items: [SaleInvoiceItemSchema],
  totalAmount: {
    type: Number,
    default: 0,
  },
  discountPercent: {
    type: Number,
    default: 0,
  },
  discountRs: {
    type: Number,
    default: 0,
  },
  freight: {
    type: Number,
    default: 0,
  },
  labour: {
    type: Number,
    default: 0,
  },
  netAmount: {
    type: Number,
    default: 0,
  },
  receive: {
    type: Number,
    default: 0,
  },
  totalWeight: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Generate invoice number before saving
SaleInvoiceSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await mongoose.model('SaleInvoice').countDocuments();
    this.invoiceNumber = `SI-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

export default mongoose.models.SaleInvoice || mongoose.model<ISaleInvoice>('SaleInvoice', SaleInvoiceSchema);
