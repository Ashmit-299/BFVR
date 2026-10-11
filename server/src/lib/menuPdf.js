// Import from lib path — the package root runs a debug test on require in some setups.
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

// Known category headers (Hindi + English) used on restaurant menu cards.
// A line matching one of these (after cleanup) becomes the current category.
const CATEGORY_PATTERNS = [
  // Hindi
  /शुरुआती|स्टार्टर|starter/i,
  /सूप|soup/i,
  /सलाद|salad/i,
  /भारतीय|इंडियन|indian/i,
  /चाइनीज|छिनीज|चाईनीज|chinese/i,
  /पिज़ा|pizza/i,
  /दाल|dal|lentil/i,
  /राइस|चावल|rice/i,
  /रोटी|परांठा|bread|roti|paratha|naan/i,
  /थाली|thali/i,
  /मेन कोर्स|main course|main dish/i,
  /बिरयानी|biryani|pulao/i,
  /करी|curry/i,
  /स्नैक्स|snacks/i,
  /डेज़र्ट|मिठाई|dessert|sweet/i,
  /ड्रिंक|पेय|beverage|drink|juice|shake/i,
  /मोमो|मंचूरियन|chowmein|noodles|fried rice|manchurian/i,
  // Catch-all: lines that look like ALL-CAPS short headers
];

// Words that are never item names (headers, footers, notes)
const NOISE_RE =
  /^(menu|price|rate|cost|item|dish|page|www\.|http|gst|tax|service charge|note|please|thank|contact|phone|call|address|timing|open|closed|cash|card|upi|swiggy|zomato|home delivery|delivery|takeaway|veg|non[- ]?veg|jain|spicy|hot|fresh|special|best|top|chef|welcome|aapka|स्वागत|अधिक|कृपया|धन्यवाद|संपर्क|पता|समय|डिलीवरी|टेकअवे|भुगतान|नकद|कर|जीएसटी|पृष्ठ|मूल्य|दर)/i;

// Detect category header line
function isCategoryLine(line) {
  const clean = line.replace(/[.…·•\-_=~]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean || clean.length > 40) return false;
  // must not contain a price
  if (/\d/.test(clean)) return false;
  for (const re of CATEGORY_PATTERNS) {
    if (re.test(clean)) return clean;
  }
  // ALL-CAPS short line (e.g. "STARTERS", "MAIN COURSE") with no lowercase
  if (
    clean.length >= 3 &&
    clean === clean.toUpperCase() &&
    /[A-Z]{3,}/.test(clean) &&
    !/[a-z]/.test(clean)
  ) {
    return clean;
  }
  return null;
}

// Extract name + prices from an item line.
// Handles:
//   "Paneer Tikka ........ 250/350"
//   "Dal Fry ---- 120"
//   "पनीर बटर मसाला 180 / 250"
//   "Veg Burger ₹120"
//   "Chicken 65 - 160"
//   "Mix Veg 90"
//   "Chole Bhature ..... 70/90"
function parseItemLine(line) {
  let raw = line.replace(/\s+/g, ' ').trim();
  if (!raw || raw.length < 3) return null;
  if (NOISE_RE.test(raw)) return null;

  // Normalize currency symbols / prefixes
  raw = raw
    .replace(/₹\s*/g, ' ')
    .replace(/rs\.?\s*/gi, ' ')
    .replace(/inr\s*/gi, ' ')
    .replace(/\/-\s*$/g, ' ')
    .replace(/rupees?/gi, ' ')
    .trim();

  // Price patterns at end of line:
  //  1) two numbers separated by / or space or -  → half/full
  //  2) single number                             → single price
  const priceTwo =
    /(\d{1,5})\s*[\/|,]\s*(\d{1,5})\s*$/;
  const priceTwoSpace =
    /(\d{1,5})\s+(\d{1,5})\s*$/;
  const priceOne =
    /(\d{1,5})\s*$/;

  let name = null;
  let half = null;
  let full = null;
  let price = null;

  let m = raw.match(priceTwo);
  if (m) {
    half = Number(m[1]);
    full = Number(m[2]);
    name = raw.slice(0, m.index).replace(/[.…·•\-_=~\s]+$/, '');
  } else {
    m = raw.match(priceTwoSpace);
    // avoid false positives like "Item 1 2" — require first number >= 10
    if (m && Number(m[1]) >= 10) {
      half = Number(m[1]);
      full = Number(m[2]);
      name = raw.slice(0, m.index).replace(/[.…·•\-_=~\s]+$/, '');
    } else {
      m = raw.match(priceOne);
      if (m) {
        const n = Number(m[1]);
        // prices are typically 10–99999; reject page numbers etc. by requiring the name part to exist
        name = raw.slice(0, m.index).replace(/[.…·•\-_=~\s\-–—]+$/, '');
        if (n >= 5 && n <= 99999 && name.replace(/[^A-Za-z\u0900-\u097F]/g, '').length >= 2) {
          price = n;
        } else {
          name = null;
        }
      }
    }
  }

  if (!name) return null;
  name = name.replace(/^[.…·•\-_=~\s]+/, '').trim();
  // reject if name is pure noise or too short after cleanup
  const letters = name.replace(/[^A-Za-z\u0900-\u097F]/g, '');
  if (letters.length < 2) return null;
  if (NOISE_RE.test(name) && !/\d/.test(name)) return null;
  // menu item names are short — long prose lines are not items
  if (name.length > 60) return null;
  // reject prices outside a sane menu range (filters page numbers, years)
  const allPrices = [half, full, price].filter((v) => v != null);
  if (allPrices.some((v) => v < 5 || v > 9999)) return null;

  // sanity: half <= full
  if (half != null && full != null && half > full) {
    [half, full] = [full, half];
  }

  return { name, halfPrice: half, fullPrice: full, price };
}

// Main entry: PDF buffer → { items, warnings }
export async function parseMenuPdf(buffer) {
  let text = '';
  try {
    const data = await pdfParse(buffer);
    text = data.text || '';
  } catch (err) {
    throw new Error('Could not read PDF: ' + err.message);
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items = [];
  let currentCategory = 'अन्य';
  let sortOrder = 0;

  for (const line of lines) {
    const cat = isCategoryLine(line);
    if (cat) {
      currentCategory = cat;
      continue;
    }
    const parsed = parseItemLine(line);
    if (parsed) {
      items.push({
        name: parsed.name,
        category: currentCategory,
        halfPrice: parsed.halfPrice,
        fullPrice: parsed.fullPrice,
        price: parsed.price,
        sortOrder: sortOrder++,
      });
    }
  }

  // de-duplicate by name (case-insensitive)
  const seen = new Set();
  const unique = [];
  for (const it of items) {
    const key = it.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(it);
  }

  return { items: unique, totalLines: lines.length };
}
