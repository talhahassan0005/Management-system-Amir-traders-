import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  item: string;
  description: string;
  brand: string;
  sheetsPerPkt: number;
  width: number;
  length: number;
  grams: number;
  constant: string;
  pktPerReem: number;
  salePriceQt: number;
  salePriceKg: number;
  costRateQty: number;
  minStockLevel: number;
  maxStockLevel: number;
  category: string;
  type: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema({
  item: {
    type: String,
    required: [true, 'Item code is required'],
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
  },
  brand: {
    type: String,
    trim: true,
  },
  sheetsPerPkt: {
    type: Number,
    default: 0,
    min: 0,
  },
  width: {
    type: Number,
    default: 0,
    min: 0,
  },
  length: {
    type: Number,
    default: 0,
    min: 0,
  },
  grams: {
    type: Number,
    default: 0,
    min: 0,
  },
  constant: {
    type: String,
    trim: true,
  },
  pktPerReem: {
    type: Number,
    default: 0,
    min: 0,
  },
  salePriceQt: {
    type: Number,
    default: 0,
    min: 0,
  },
  salePriceKg: {
    type: Number,
    default: 0,
    min: 0,
  },
  costRateQty: {
    type: Number,
    default: 0,
    min: 0,
  },
  minStockLevel: {
    type: Number,
    default: 0,
    min: 0,
  },
  maxStockLevel: {
    type: Number,
    default: 0,
    min: 0,
  },
  category: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    enum: ['Reel', 'Board'],
    required: [true, 'Product type is required'],
    trim: true,
    default: 'Reel',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
