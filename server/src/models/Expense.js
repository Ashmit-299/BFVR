import mongoose from 'mongoose';

export const EXPENSE_CATEGORIES = [
  { key: 'kirana', label: 'किराना (Kirana)' },
  { key: 'vegetables', label: 'सब्जी (Vegetables)' },
  { key: 'dairy', label: 'डेयरी (Dairy)' },
  { key: 'wages', label: 'मजदूरी (Wages)' },
  { key: 'rent', label: 'किराया (Rent)' },
  { key: 'utilities', label: 'बिजली/पानी (Utilities)' },
  { key: 'transport', label: 'ट्रांसपोर्ट (Transport)' },
  { key: 'other', label: 'अन्य (Other)' },
];

const expenseSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Setting', required: true, index: true },
    clientId: { type: String },
    category: { type: String, enum: EXPENSE_CATEGORIES.map((c) => c.key), required: true },
    label: { type: String, default: '' },
    amount: { type: Number, required: true, min: 0 },
    note: { type: String, default: '' },
    day: { type: String, required: true, index: true },
    hour: { type: Number, default: 0 },
    spentAt: { type: Date, default: Date.now },
    createdBy: { type: Object, default: null },
  },
  { timestamps: true }
);

// per-business offline dedupe (same pattern as Order.clientId)
expenseSchema.index(
  { businessId: 1, clientId: 1 },
  { unique: true, partialFilterExpression: { clientId: { $type: 'string' } } }
);

expenseSchema.methods.toClient = function () {
  return {
    id: this._id.toString(),
    clientId: this.clientId || null,
    category: this.category,
    label: this.label,
    amount: this.amount,
    note: this.note,
    day: this.day,
    hour: this.hour,
    spentAt: this.spentAt,
    createdBy: this.createdBy,
    createdAt: this.createdAt,
  };
};

export default mongoose.model('Expense', expenseSchema);
