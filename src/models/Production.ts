import mongoose, { Document, Schema } from 'mongoose';

export interface IProductionItem {
  productId: string;
  reelNo?: string; // optional reel/lot identifier
  quantityPkts?: number; // packets produced
  weightKg?: number; // weight produced
  notes?: string;
  // UI fields similar to legacy app
  description?: string;
  width?: number;
  grams?: number;
  length?: number;
  packing?: number;
  brand?: string;
  constant?: boolean; // legacy "Constant" flag
  rateOn?: 'Weight' | 'Quantity';
  rate?: number;
  value?: number;
}

export interface IMaterialOutItem {
  productId: string;
  storeId: string; // source store
  quantityPkts: number;
  weightKg: number;
  reelNo?: string;
  notes?: string;
  // UI fields
  description?: string;
  width?: number;
  grams?: number;
  length?: number;
  packing?: number;
  brand?: string;
  constant?: boolean;
}

export interface IProduction extends Document {
  productionNumber: string; // PR-000001
  date: Date;
  remarks?: string;
  materialOut: IMaterialOutItem[]; // materials taken out for production
  items: IProductionItem[]; // products created
  outputStoreId: string; // store where products will be stored
  createdAt: Date;
  updatedAt: Date;
}

const ProductionItemSchema = new Schema<IProductionItem>({
  productId: { type: String, required: true, trim: true },
  reelNo: { type: String, trim: true },
  quantityPkts: { type: Number, default: 0, min: 0 },
  weightKg: { type: Number, default: 0, min: 0 },
  notes: { type: String, trim: true },
  description: { type: String, trim: true },
  width: { type: Number, min: 0 },
  grams: { type: Number, min: 0 },
  length: { type: Number, min: 0 },
  packing: { type: Number, min: 0 },
  brand: { type: String, trim: true },
  constant: { type: Boolean, default: false },
  rateOn: { type: String, enum: ['Weight', 'Quantity'], default: 'Weight' },
  rate: { type: Number, min: 0 },
  value: { type: Number, min: 0 },
}, { _id: false });

const MaterialOutItemSchema = new Schema<IMaterialOutItem>({
  productId: { type: String, required: true, trim: true },
  storeId: { type: String, required: true, trim: true },
  quantityPkts: { type: Number, required: true, min: 0 },
  weightKg: { type: Number, required: true, min: 0 },
  reelNo: { type: String, trim: true },
  notes: { type: String, trim: true },
  description: { type: String, trim: true },
  width: { type: Number, min: 0 },
  grams: { type: Number, min: 0 },
  length: { type: Number, min: 0 },
  packing: { type: Number, min: 0 },
  brand: { type: String, trim: true },
  constant: { type: Boolean, default: false },
}, { _id: false });

const ProductionSchema = new Schema<IProduction>({
  productionNumber: { type: String, required: true, unique: true },
  date: { type: Date, required: true },
  remarks: { type: String, trim: true },
  materialOut: { type: [MaterialOutItemSchema], default: [] },
  items: { type: [ProductionItemSchema], default: [] },
  outputStoreId: { type: String, required: true, trim: true },
}, { timestamps: true });

ProductionSchema.pre('validate', async function(next) {
  try {
    if (this.isNew && !this.productionNumber) {
      const count = await mongoose.model('Production').countDocuments();
      this.productionNumber = `PR-${String(count + 1).padStart(6, '0')}`;
    }
    next();
  } catch (err) { next(err as any); }
});

export default mongoose.models.Production || mongoose.model<IProduction>('Production', ProductionSchema);
