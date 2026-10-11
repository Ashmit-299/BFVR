import mongoose from 'mongoose';

// One Setting document = one business (its _id is the businessId used to
// scope every other collection). Holds business profile + counters.
const settingSchema = new mongoose.Schema(
  {
    restaurant: {
      name: { type: String, default: '' },
      nameEn: { type: String, default: '' },
      tagline: { type: String, default: '' },
      address: { type: String, default: '' },
      phone: { type: String, default: '' },
      upiId: { type: String, default: '' },
      gstin: { type: String, default: '' },
    },
    currency: { type: String, default: '₹' },
    openingFloat: { type: Number, default: 100 },
    tableCount: { type: Number, default: 6 },
    orderSeq: { type: Number, default: 1000 },
  },
  { timestamps: true }
);

settingSchema.statics.get = async function (businessId) {
  let doc = businessId ? await this.findById(businessId) : null;
  if (!doc) doc = await this.create({});
  return doc;
};

settingSchema.statics.nextOrderNumber = async function (businessId) {
  const doc = await this.findOneAndUpdate(
    { _id: businessId },
    { $inc: { orderSeq: 1 } },
    { new: true }
  );
  if (!doc) {
    const fresh = await this.create({});
    return fresh.orderSeq;
  }
  return doc.orderSeq;
};

export default mongoose.model('Setting', settingSchema);
