import { parseMenuPdf } from '../server/src/lib/menuPdf.js';

// Build a correct minimal PDF using byte-accurate offsets
function buildPdf(textLines) {
  const esc = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const stream = textLines
    .map((l, i) => `BT /F1 12 Tf 40 ${750 - i * 16} Td (${esc(l)}) Tj ET`)
    .join('\n');

  const objs = [];
  objs.push('<< /Type /Catalog /Pages 2 0 R >>');
  objs.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  objs.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');
  objs.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  let body = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xrefPos = body.length;
  body += `xref\n0 ${objs.length + 1}\n`;
  body += '0000000000 65535 f \n';
  offsets.forEach((off) => {
    body += `${String(off).padStart(10, '0')} 00000 n \n`;
  });
  body += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return Buffer.from(body, 'latin1');
}

const lines = [
  'STARTERS',
  'Paneer Tikka ............ 250/350',
  'Veg Soup ---------------- 80',
  'MAIN COURSE',
  'Dal Fry 120',
  'Chole Bhature ..... 70/90',
  'Chicken Curry - 220',
  'ROTI',
  'Tandoori Roti 30',
  'Chinese',
  'Veg Hakka Noodles 130/180',
  'Manchurian Dry 150',
];

const buf = buildPdf(lines);

const result = await parseMenuPdf(buf);
console.log('items:', result.items.length);
for (const it of result.items) {
  console.log(
    `${it.category.padEnd(12)} | ${it.name.padEnd(22)} | half=${it.halfPrice ?? '-'} full=${it.fullPrice ?? '-'} price=${it.price ?? '-'}`
  );
}
