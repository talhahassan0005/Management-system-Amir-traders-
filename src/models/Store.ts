import mongoose, { Document, Schema } from 'mongoose';

export interface IStore extends Document {
  store: string;
  description: string;
  status: 'Active' | 'Inactive';
  createdAt: Date;
  updatedAt: Date;
}

const StoreSchema: Schema = new Schema({
  store: {
    type: String,
    required: [true, 'Store name is required'],
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  },
}, {
  timestamps: true,
});

export default mongoose.models.Store || mongoose.model<IStore>('Store', StoreSchema);
