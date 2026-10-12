import mongoose from 'mongoose';

export const CATEGORIES = [
  'चाइनीज़',
  'साउथ इंडियन',
  'पिज़ा',
  'सीजनल सब्जी',
  'इंडियन',
  'दाल',
  'राइस',
  'रोटी',
  'थाली',
  'पापड़',
  'चाईनीज स्पेशल',
  'सुप',
];

// English labels for the standard categories — sent to the client so the
// language toggle can render the menu card in English.
export const CATEGORY_EN = {
  'चाइनीज़': 'Chinese',
  'साउथ इंडियन': 'South Indian',
  'पिज़ा': 'Pizza',
  'सीजनल सब्जी': 'Seasonal Vegetable',
  'इंडियन': 'Indian',
  'दाल': 'Dal',
  'राइस': 'Rice',
  'रोटी': 'Roti',
  'थाली': 'Thali',
  'पापड़': 'Papad',
  'चाईनीज स्पेशल': 'Chinese Special',
  'सुप': 'Soup',
};

const menuItemSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Setting', required: true, index: true },
    name: { type: String, required: true, trim: true },
    nameEn: { type: String, default: '', trim: true },
    category: { type: String, required: true, trim: true },
    categoryEn: { type: String, default: '', trim: true },
    // half/full portions when the dish is sold in two sizes
    halfPrice: { type: Number, default: null },
    fullPrice: { type: Number, default: null },
    // single fixed price (soups, roti, pizza...) when there is no half/full split
    price: { type: Number, default: null },
    available: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

menuItemSchema.methods.toClient = function () {
  const hasPortions = this.halfPrice != null || this.fullPrice != null;
  return {
    id: this._id.toString(),
    name: this.name,
    nameEn: this.nameEn || '',
    category: this.category,
    categoryEn: this.categoryEn || CATEGORY_EN[this.category] || '',
    halfPrice: hasPortions ? this.halfPrice : null,
    fullPrice: hasPortions ? this.fullPrice : this.price,
    price: hasPortions ? null : this.price,
    portions: hasPortions,
    available: this.available,
    sortOrder: this.sortOrder,
  };
};

export default mongoose.model('MenuItem', menuItemSchema);
