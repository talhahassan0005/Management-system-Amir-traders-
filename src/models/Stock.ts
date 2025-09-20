import mongoose, { Document, Schema } from 'mongoose';

export interface IStockItem {
  productId: string;
  storeId: string;
  quantityPkts: number;
  weightKg: number;
  reelNo?: string;
  notes?: string;
}

export interface IStock extends Document {
  productId: string;
  storeId: string;
  quantityPkts: number;
  weightKg: number;
  reelNo?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StockSchema = new Schema<IStock>({
  productId: { 
    type: String, 
    required: true, 
    trim: true 
  },
  storeId: { 
    type: String, 
    required: true, 
    trim: true 
  },
  quantityPkts: { 
    type: Number, 
    required: true, 
    default: 0, 
    min: 0 
  },
  weightKg: { 
    type: Number, 
    required: true, 
    default: 0, 
    min: 0 
  },
  reelNo: { 
    type: String, 
    trim: true 
  },
  notes: { 
    type: String, 
    trim: true 
  },
}, { 
  timestamps: true 
});

// Compound index to ensure unique product-store combination
StockSchema.index({ productId: 1, storeId: 1 }, { unique: true });

export default mongoose.models.Stock || mongoose.model<IStock>('Stock', StockSchema);
