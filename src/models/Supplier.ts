import mongoose, { Document, Schema } from 'mongoose';

export interface ISupplier extends Document {
  code: string;
  description: string;
  business: string;
  city: string;
  person: string;
  phone: string;
  address: string;
  email: string;
  mobile: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema: Schema = new Schema({
  code: {
    type: String,
    required: [true, 'Supplier code is required'],
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Supplier description is required'],
    trim: true,
  },
  business: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    trim: true,
  },
  person: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  mobile: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Robust sequential code generator with fallback; keeps logic centralized so API route can stay simple.
SupplierSchema.pre('validate', async function(next) {
  try {
    if (!this.isNew) return next();
    const raw = (this as any).code;
    if (raw && String(raw).trim().length > 0) return next();

    const SupplierModel = mongoose.model('Supplier');

    // Try atomic counter collection first (if present) to avoid race. We lazy require to avoid circular deps.
    let seq: number | null = null;
    try {
      // Only attempt if Counter model is registered; otherwise skip silently.
      const CounterModel = (mongoose.models as any).Counter ? (mongoose.models as any).Counter : null;
      if (CounterModel) {
        const counterDoc: any = await CounterModel.findByIdAndUpdate(
          'supplier',
          { $inc: { seq: 1 } },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        ).lean();
        seq = counterDoc?.seq ?? null;
      }
    } catch (e) {
      // Ignore counter errors; fallback path below will still produce a code.
    }

    const formatCode = (n: number) => `11-02-${String(n).padStart(6, '0')}`;

    if (seq != null) {
      this.code = formatCode(seq);
      // Quick duplicate check; if unique we're done.
      const existing = await SupplierModel.exists({ code: this.code });
      if (!existing) return next();
    }

    // Fallback: derive max numeric suffix currently stored to continue sequence.
    const maxDoc: any = await SupplierModel
      .findOne({ code: { $regex: '^11-02-\\d{6}$' } })
      .sort({ code: -1 })
      .select('code')
      .lean();
    let base = 0;
    if (maxDoc?.code) {
      const num = parseInt(String(maxDoc.code).slice(-6));
      if (!isNaN(num)) base = num;
    }

    for (let i = 1; i <= 5; i++) {
      const candidate = formatCode(base + i);
      const exists = await SupplierModel.exists({ code: candidate });
      if (!exists) {
        this.code = candidate;
        return next();
      }
    }

    // Final random fallback (extremely unlikely) to guarantee code assignment.
    for (let i = 0; i < 20; i++) {
      const rand = Math.floor(100000 + Math.random() * 900000); // 6 digits
      const candidate = formatCode(rand);
      const exists = await SupplierModel.exists({ code: candidate });
      if (!exists) {
        this.code = candidate;
        return next();
      }
    }
    // If we still didn't assign, surface a descriptive error.
    next(new Error('Failed to allocate unique supplier code after multiple attempts'));
  } catch (err) {
    next(err as any);
  }
});

export default mongoose.models.Supplier || mongoose.model<ISupplier>('Supplier', SupplierSchema);
