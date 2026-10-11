import mongoose from 'mongoose';

// One record per day: what was taken out ("pocketed") and what stayed in the drawer.
// The next day opens with `closingCash` — NOT a fixed float. The very first day
// (no prior closing) opens with settings.openingFloat.
const closingSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Setting', required: true, index: true },
    day: { type: String, required: true },
    opening: { type: Number, default: 0 },
    floatAmount: { type: Number, default: 0 }, // legacy/compat: snapshot of opening
    withdrawn: { type: Number, default: 0 },
    closingCash: { type: Number, default: null }, // kept in drawer → next day's opening
    note: { type: String, default: '' },
    closedBy: { type: Object, default: null },
    closedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// one closing record per day per business
closingSchema.index({ businessId: 1, day: 1 }, { unique: true });

closingSchema.methods.toClient = function () {
  return {
    id: this._id.toString(),
    day: this.day,
    opening: this.opening ?? this.floatAmount ?? 0,
    floatAmount: this.floatAmount,
    withdrawn: this.withdrawn,
    closingCash: this.closingCash != null ? this.closingCash : null,
    note: this.note,
    closedBy: this.closedBy,
    closedAt: this.closedAt,
  };
};

export default mongoose.model('Closing', closingSchema);
