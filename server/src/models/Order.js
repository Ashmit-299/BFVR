import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    name: { type: String, required: true },
    nameEn: { type: String, default: '' },
    category: { type: String, default: '' },
    portion: { type: String, enum: ['half', 'full', 'single'], required: true },
    price: { type: Number, required: true },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    clientId: { type: String },
    method: { type: String, enum: ['cash', 'upi', 'card', 'other'], required: true },
    amount: { type: Number, required: true, min: 0 },
    day: { type: String, required: true },
    hour: { type: Number, required: true },
    at: { type: Date, default: Date.now },
    by: { type: Object, default: null },
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Setting', required: true, index: true },
    clientId: { type: String },
    number: { type: Number, index: true },
    // restaurant table number (1..10) — null for direct/takeaway bills
    table: { type: Number, default: null },
    // open = actively on a table, can be extended; closed = finished/settled
    status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
    closedAt: { type: Date, default: null },
    closedBy: { type: Object, default: null },
    customerName: { type: String, default: '' },
    customerPhone: { type: String, default: '' },
    items: { type: [orderItemSchema], default: [] },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    payments: { type: [paymentSchema], default: [] },
    day: { type: String, index: true },
    hour: { type: Number },
    placedAt: { type: Date, default: Date.now },
    createdBy: { type: Object, default: null },
    updatedBy: { type: Object, default: null },
  },
  { timestamps: true }
);

// per-business offline dedupe: the same clientId may exist in different businesses
orderSchema.index(
  { businessId: 1, clientId: 1 },
  { unique: true, partialFilterExpression: { clientId: { $type: 'string' } } }
);
orderSchema.index({ businessId: 1, day: 1, placedAt: -1 });

export function orderTotals(items, discount = 0) {
  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  const disc = Math.max(0, Math.min(Number(discount) || 0, subtotal));
  return { subtotal, discount: disc, total: subtotal - disc };
}

export function paidAmount(order) {
  return order.payments.reduce((s, p) => s + p.amount, 0);
}

orderSchema.methods.toClient = function () {
  const paid = paidAmount(this);
  return {
    id: this._id.toString(),
    clientId: this.clientId || null,
    number: this.number,
    customerName: this.customerName,
    customerPhone: this.customerPhone,
    items: this.items.map((it) => ({
      item: it.item ? it.item.toString() : null,
      name: it.name,
      nameEn: it.nameEn || '',
      category: it.category,
      portion: it.portion,
      price: it.price,
      qty: it.qty,
      lineTotal: it.price * it.qty,
    })),
    subtotal: this.subtotal,
    discount: this.discount,
    total: this.total,
    paid,
    due: Math.max(0, this.total - paid),
    paymentStatus: paid + 0.001 >= this.total ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
    payments: this.payments.map((p) => ({
      id: p._id.toString(),
      clientId: p.clientId || null,
      method: p.method,
      amount: p.amount,
      at: p.at,
      day: p.day,
      by: p.by,
    })),
    day: this.day,
    hour: this.hour,
    table: this.table,
    status: this.status,
    closedAt: this.closedAt,
    placedAt: this.placedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    createdBy: this.createdBy,
    updatedBy: this.updatedBy,
  };
};

export default mongoose.model('Order', orderSchema);
