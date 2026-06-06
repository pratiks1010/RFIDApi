// Helper to convert string to hex - no padding, use real hex value
const toHex = (str) => {
  if (!str) return '';
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).toUpperCase();
  }
  return hex;
};


const stringToHex = (str) => {
  return str
    .split("")
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
};




// Calculate EPC bit length and PC value from actual hex length (no zero padding)
// 4 hex digits = 1 EPC word (16 bits). PC = (wordCount << 11) | 0x0400
// Matches *1C00* (48b), *2400* (64b), *2C00* (80b), *3400* (96b)
const calculateEpcMemory = (hexCode) => {
  if (!hexCode) {
    return { epcBits: 96, pcValue: '*3400*', epcHex: '000000000000000000000000' };
  }

  let epcHex = String(hexCode).toUpperCase().replace(/[^0-9A-F]/g, '');
  if (!epcHex) {
    return { epcBits: 96, pcValue: '*3400*', epcHex: '000000000000000000000000' };
  }

  const len = epcHex.length;
  // Minimum 3 words (48 bits) for printer compatibility
  const words = Math.max(3, Math.ceil(len / 4));
  const epcBits = words * 16;
  const maxHexLen = words * 4;
  const pcWord = (words << 11) | 0x0400;
  const pcValue = `*${pcWord.toString(16).toUpperCase().padStart(4, '0')}*`;

  // Exact hex only — never pad with trailing/leading zeros (extra zeros break scanning)
  if (len > maxHexLen) {
    epcHex = epcHex.substring(0, maxHexLen);
  }

  return { epcBits, pcValue, epcHex };
};

// Generate PRN for LS000224
const generateLS000224Prn = (item) => {
  const code = item.ItemCode || item.RFIDCode || '';
  const epcHex = toHex(code);
  const epcPadded = epcHex.padStart(12, '0').substring(0, 12);
  const design = item.DesignName || item.ProductName || item.CategoryName || '';
  const grossWt = item.GrossWt != null && item.GrossWt !== '' ? String(item.GrossWt) : '0.000';
  const netWt = item.NetWt != null && item.NetWt !== '' ? String(item.NetWt) : '0.000';
  const mrp = item.MRP != null && item.MRP !== '' ? String(item.MRP) : '0';

  return `!PTX_SETUP
ENGINE-WIDTH;1478:LENGTH;710:MIRROR;0.
PTX_END
~PAPER;ROTATE 0
~CONFIG
UPC DESCENDERS;0
END
~CONFIG
CHECK DYNAMIC BCD;0
END
~CREATE;FORM-0;51
SCALE;DOT;203;203
ISET;'UTF8'
RFWTAG;16;PC
16;H;*1C00*
STOP
RFWTAG;48;EPC
48;H;*${epcPadded}*
STOP
VERT
3;180;8;135
STOP
FONT;FACE 92250;BOLD 0;SLANT 0
ALPHA
INV;POINT;39;284;9;11;"${code}"
STOP
BARCODE
QRCODE;INV;XD3;T2;E0;M0;I0;72;207
"${code}"
STOP
ALPHA
INV;POINT;115;148;9;9;"${design}"
INV;POINT;83;148;9;10;"G : ${grossWt}"
INV;POINT;51;148;9;10;"N : ${netWt}"
INV;POINT;21;150;9;9;"${mrp}"
STOP
END
~EXECUTE;FORM-0;1

~NORMAL
~DELETE FORM;FORM-0
`;
};

// Generate PRN for LS000428 (Original template)
const generateLS000428Prn = (item) => {
  // Use MRP if available, otherwise fallback to FixedAmt, then '0'
  const price = item.MRP || item.FixedAmt || '0';
  const purity = item.Purity || item.PurityName || '';
  const epcHex = toHex(item.ItemCode || '');
  
  return `!PTX_SETUP
ENGINE-WIDTH;2483:LENGTH;1065:MIRROR;0.
PTX_END
~PAPER;ROTATE 0
~CONFIG
UPC DESCENDERS;0
END
~PAPER;LABELS 1;MEDIA 1
~PAPER;FEED SHIFT 0;INTENSITY 0;SPEED IPS 6;SLEW IPS 6;TYPE 0
~PAPER;CUT 0;PAUSE 0;TEAR 0
~CONFIG
CHECK DYNAMIC BCD;0
SLASH ZERO;0
UPPERCASE;0
AUTO WRAP;0
HOST FORM LENGTH;1
END
~CREATE;FORM-0;76
SCALE;DOT;203;203
ISET;'UTF8'
RFWTAG;16;PC
16;H;*1C00*
STOP
RFWTAG;48;EPC
48;H;*${epcHex}*
STOP
FONT;FACE 92250;BOLD 0;SLANT 0
ALPHA
INV;POINT;160;194;6;8;"OPJ"
INV;POINT;160;104;6;11;"DIV"
INV;POINT;132;194;6;9;"${item.ItemCode || ''}"
INV;POINT;132;104;6;9;"1PC"
INV;POINT;188;195;6;8;"${item.ProductName || ''}"
STOP
BARCODE
C128B;INV;XRD1:1:2:2:3:3:4:4;H3.17;31;33
"&${item.ItemCode || ''}"
STOP
ALPHA
INV;POINT;77;197;6;9;"MSRP:"
INV;POINT;79;117;6;10;"Rs"
INV;POINT;79;80;6;8;"${price}/-"
INV;POINT;41;194;6;8;"${purity}"
STOP
END
~EXECUTE;FORM-0;1

~NORMAL
~DELETE FORM;FORM-0
`;
};

// Gold/Silver barcode: & prefix + apostrophe after 3rd char (Code128)
/*const formatBarcodeForLs000443 = (barcodeValue) => {
  if (!barcodeValue || barcodeValue.length <= 3) return `&${barcodeValue}`;
  return `&${barcodeValue.substring(0, 3)}'${barcodeValue.substring(3)}`;
};*/

// Generate PRN for LS000443 - Gold Category (matches client sample layout)
const generateLS000443GoldPrn = (item) => {
  const itemCode = item.ItemCode || '';
  const barcodeValue = item.BarcodeValue || item.Barcode || itemCode;
  const grossWt = item.GrossWt || item.GrossWeight || '0.610';
  const purityName = item.PurityName || item.Purity || '18K GOLD PENDANT';
  let rawEpcHex = stringToHex(barcodeValue);
  
  // Pad to 20 characters (80 bits) for EPC
  if (rawEpcHex.length < 20) {
    rawEpcHex = rawEpcHex.padStart(20, "0");
  } else if (rawEpcHex.length > 20) {
    rawEpcHex = rawEpcHex.substring(0, 20);
  }

  // Format barcode: & prefix + first 2 chars + apostrophe + rest (e.g., BG00012833 -> &BG'00012833)
  let formattedBarcode = barcodeValue;
  if (barcodeValue.length > 2) {
    const prefix = barcodeValue.substring(0, 2);
    const suffix = barcodeValue.substring(2);
    formattedBarcode = `&${prefix}'${suffix}`;
  } else {
    formattedBarcode = `&${barcodeValue}`;
  }
  
  return `!PTX_SETUP
ENGINE-WIDTH;2838:LENGTH;1380:MIRROR;0.
PTX_END
~PAPER;ROTATE 0
~CONFIG
UPC DESCENDERS;0
END
~PAPER;LABELS 2;MEDIA 1
~PAPER;FEED SHIFT 0;INTENSITY 15;SPEED IPS 2;SLEW IPS 2;TYPE 0
~PAPER;CUT 0;PAUSE 0;TEAR 0
~CONFIG
CHECK DYNAMIC BCD;0
SLASH ZERO;0
UPPERCASE;0
AUTO WRAP;0
HOST FORM LENGTH;1
END
~CREATE;FORM-0;99
SCALE;DOT;203;203
ISET;'UTF8'
RFWTAG;16;PC
16;H;*2C00*
STOP
RFWTAG;80;EPC
80;H;*${rawEpcHex}*
STOP
FONT;FACE 92250;BOLD 0;SLANT 0
ALPHA
INV;POINT;187;543;7;8;"G.Wt :"
INV;POINT;187;473;7;7;"${grossWt}"
INV;POINT;216;543;7;7;"${purityName}"
STOP
BARCODE
C128B;INV;XRD1:1:2:2:3:3:4:4;H3.18;70;381
"${barcodeValue}"
STOP
ALPHA
INV;POINT;39;501;7;7;"${itemCode}"
INV;POINT;190;316;7;7;"LASHEEN JEWELLERY"
STOP
END
~EXECUTE;FORM-0;1

~NORMAL
~DELETE FORM;FORM-0
`;
};

// Generate PRN for LS000443 - Diamond Category (New template)
const generateLS000443DiamondPrn = (item) => {
  const itemCode = item.ItemCode || '';
  const barcodeValue = item.BarcodeValue || item.Barcode || itemCode;
  const vendorName = item.VendorName || '';
  const purityName = item.PurityName || item.Purity || '';
  const description = item.Description || '';
  const mrp = item.MRP || item.FixedAmt || item.CounterCode || '';
  const grossWt = item.GrossWt || item.GrossWeight || '0.000';
  const dWt = item.TotalDiamondWeight || item.DiamondWt || '0.000';
  const oWt = item.TotalStoneWeight || item.StoneWt || '0.000';
  const { epcHex: rawEpcHex } = calculateEpcMemory(stringToHex(barcodeValue));

  const isGrossWtVisible = parseFloat(grossWt) > 0;
  const isDWtVisible = parseFloat(dWt) > 0;
  const isOWtVisible = parseFloat(oWt) > 0;
  
  return `!PTX_SETUP
ENGINE-WIDTH;2838:LENGTH;1380:MIRROR;0.
PTX_END
~PAPER;ROTATE 0
~CONFIG
UPC DESCENDERS;0
END
~PAPER;LABELS 2;MEDIA 1
~PAPER;FEED SHIFT 0;INTENSITY 15;SPEED IPS 2;SLEW IPS 2;TYPE 0
~PAPER;CUT 0;PAUSE 0;TEAR 0
~CONFIG
CHECK DYNAMIC BCD;0
SLASH ZERO;0
UPPERCASE;0
AUTO WRAP;0
HOST FORM LENGTH;1
END
~CREATE;FORM-0;99
SCALE;DOT;203;203
ISET;'UTF8'
RFWTAG;16;PC
16;H;*3400*
STOP
RFWTAG;96;EPC
96;H;*${rawEpcHex}*
STOP
FONT;FACE 92250;BOLD 0;SLANT 0
ALPHA
${isGrossWtVisible ? `INV;POINT;237;515;8;7;"G.Wt :"\nINV;POINT;240;458;7;7;"${grossWt}"` : ''}
${isDWtVisible ? `INV;POINT;219;515;7;7;"D.Wt :"\nINV;POINT;220;456;7;7;"${dWt}"` : ''}
${isOWtVisible ? `INV;POINT;199;515;7;7;"O.Wt :"\nINV;POINT;199;455;7;7;"${oWt}"` : ''}
INV;POINT;177;515;7;7;"${vendorName}"
INV;POINT;157;536;6;6;"${description}"
INV;POINT;117;531;7;7;"LJ"
INV;POINT;117;489;7;7;"${mrp}"
INV;POINT;94;531;7;7;"${purityName}"
INV;POINT;71;531;7;7;"${itemCode}"
STOP
BARCODE
C128B;INV;XRD1:1:2:2:3:3:4:4;H3.9;36;380
"${barcodeValue}"
STOP
ALPHA
INV;POINT;192;306;7;7;"LASHEEN JEWELLERY"
STOP
END
~EXECUTE;FORM-0;1

~NORMAL
~DELETE FORM;FORM-0
`;
};

// Exact LS000431 baseline PRN from DELHILOGOOPNew (1).prn (byte-preserved via base64)
const LS000431_BASE_PRN_B64 = "PHhwbWw+PHBhZ2UgcXVhbnRpdHk9JzAnIHBpdGNoPScyNy4wIG1tJz48L3hwbWw+IVBUWF9TRVRVUA0KRU5HSU5FLVdJRFRIOzI0ODM6TEVOR1RIOzEwNjU6TUlSUk9SOzAuDQpQVFhfRU5EDQp+UEFQRVI7Uk9UQVRFIDANCn5DT05GSUcNClVQQyBERVNDRU5ERVJTOzANCkVORA0KflBBUEVSO0xBQkVMUyAyO01FRElBIDENCn5QQVBFUjtGRUVEIFNISUZUIDA7SU5URU5TSVRZIDA7U1BFRUQgSVBTIDY7U0xFVyBJUFMgNjtUWVBFIDANCn5QQVBFUjtDVVQgMDtQQVVTRSAwO1RFQVIgMA0KfkNPTkZJRw0KQ0hFQ0sgRFlOQU1JQyBCQ0Q7MA0KU0xBU0ggWkVSTzswDQpVUFBFUkNBU0U7MA0KQVVUTyBXUkFQOzANCkhPU1QgRk9STSBMRU5HVEg7MQ0KRU5EDQo8eHBtbD48L3BhZ2U+PC94cG1sPjx4cG1sPjxwYWdlIHF1YW50aXR5PScxJyBwaXRjaD0nMjcuMCBtbSc+PC94cG1sPn5MT0dPO0xPR08tMDtQQ1gNCgoFAQEAAAAAKQAdACwBLAEAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQYAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwcDEAMH/gMQAf7/B/bd/wf9/f8H3t1/B/7/G/8HwAMH/wcADwf/BwAB/gADB/4AAP8IAf4AAHsIAf4AADMIAf4DEAH/BwB/B4cH+AMH/weAfweHB/gHB/8HwH8HAwf4Dwf/B+A/BwMH8B8H/wfwHwcDB+A/B/8H+A8HhwfAfwf/B/wHB88HgP8H/wf+Awf/BwH/B/8H/wcB/gML/wf/B4D8Bwv/B/8HwHgPC/8H/wfgMB8L/wf/B/AAPwv/B/8H+AB/C/8L/AD/C/8L/gH/C/8L/wcDD/8L/weHD/8L/wfPD/35SQVNURVJFTkQNCkVORA0KfkNSRUFURTtGT1JNLTA7NzYNClNDQUxFO0RPVDsyMDM7MjAzDQpJU0VUOydVVEY4Jw0KUkZXVEFHOzE2O1BDDQoxNjtIOyoxQzAwKg0KU1RPUA0KUkZXVEFHOzQ4O0VQQw0KNDg7SDsqNTM0NjQ5MzMzOTM3Kg0KU1RPUA0KRk9OVDtGQUNFIDkyMjUwO0JPTEQgMDtTTEFOVCAwDQpBTFBIQQ0KSU5WO1BPSU5UOzE2MDsxOTQ7Njs4OyJPUEoiDQpJTlY7UE9JTlQ7MTYwOzEwMzs2OzExOyJESVYiDQpJTlY7UE9JTlQ7MTMyOzE5NDs2Ozk7IlNGSTM5NyINCklOVjtQT0lOVDsxMzI7MTAzOzY7OTsiMVBDIg0KSU5WO1BPSU5UOzE4ODsxOTU7Njs4OyJTSUxWRVIgRkFOQ1kgSVRFTSINClNUT1ANCkJBUkNPREUNCkMxMjhCO0lOVjtYUkQxOjE6MjoyOjM6Mzo0OjQ7SDMuMTc7MzE7MzMNCiIOJlNGSTM5NyINClNUT1ANCkFMUEhBDQpJTlY7UE9JTlQ7Nzc7MTk3OzY7OTsiTVNSUDoiDQpJTlY7UE9JTlQ7Nzk7MTE3OzY7MTA7IlJzIg0KSU5WO1BPSU5UOzc5OzgwOzY7ODsiMjAxMDAvLSINCklOVjtQT0lOVDs4Ozk5OzY7ODsiOTk5Ig0KU1RPUA0KTE9HTw0KMzA7MTUyO0xPR08tMA0KU1RPUA0KRU5EDQp+RVhFQ1VURTtGT1JNLTA7MQ0KPHhwbWw+PC9wYWdlPjwveHBtbD4NCn5OT1JNQUwNCn5ERUxFVEUgRk9STTtGT1JNLTANCn5ERUxFVEUgTE9HTztMT0dPLTANCg==";

const decodeBase64Latin1 = (base64) => {
  const binary = atob(base64);
  return Array.from(binary, (ch) => String.fromCharCode(ch.charCodeAt(0))).join('');
};

// Generate PRN for LS000431 by replacing only dynamic fields in exact base file
const generateLS000431Prn = (item) => {
  const price = item.MRP || item.FixedAmt || '0';
  const purity = item.Purity || item.PurityName || '';
  const itemCode = item.ItemCode || '';
  const productName = item.ProductName || '';
  const description = String(
    item.Description || item.description || productName || ''
  )
    .replace(/"/g, ' ')
    .trim();
  const vendorName = String(item.VendorName || item.Vendor || item.vendor_id || '').trim();
  const epcHex = toHex(itemCode).padStart(12, '0').substring(0, 12);
  const barcodePrefix = String.fromCharCode(14);

  let prn = decodeBase64Latin1(LS000431_BASE_PRN_B64);
  prn = prn.replace("*534649333937*", `*${epcHex}*`);
  prn = prn.replaceAll('"SFI397"', `"${itemCode}"`);
  prn = prn.replaceAll('"OP16P0426"', `"${description}"`);
  prn = prn.replaceAll('"OP10B0426"', `"${description}"`);
  prn = prn.replace('"SILVER FANCY ITEM"', `"${productName}"`);
  prn = prn.replace('"DIV"', `"${vendorName || 'DIV'}"`);
  prn = prn.replace('"20100/-"', `"${price}/-"`);
  prn = prn.replace('"999"', `"${purity}"`);
  prn = prn.replace(`${barcodePrefix}&SFI397`, `${barcodePrefix}&${itemCode}`);
  prn = prn.split(`${barcodePrefix}&OP16P0426`).join(`${barcodePrefix}&${description}`);
  prn = prn.split(`${barcodePrefix}&OP10B0426`).join(`${barcodePrefix}&${description}`);
  return prn;
};

/** Escape text embedded in PRN quoted strings */
const prnQuote = (value) => String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const formatWeight3 = (value) => {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return '0.000';
  return n.toFixed(3);
};

const formatDiamondCt = (value) => {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return '0.00 Ct';
  return `${n.toFixed(2)} Ct`;
};

/** Design label for LS000533 bottom field — matches grid "Design" column (e.g. 1pt, 1.5pt, 3pt) */
const resolveLS000533DesignLabel = (item) => {
  const designName = String(
    item.DesignName || item.Design || item.design || item.design_name || ''
  ).trim();
  if (designName) return designName;

  const designId = item.DesignId ?? item.design_id ?? item.DesignID ?? '';
  if (designId !== '' && designId != null && String(designId).trim() !== '0') {
    return String(designId).trim();
  }

  return '';
};

/** Purity line on LS000533 label (e.g. "14Kt") */
const resolveLS000533Purity = (item) =>
  String(item.PurityName || item.Purity || item.purity || '').trim();

/** Description line on LS000533 label (e.g. "7.25inch") */
const resolveLS000533Description = (item) =>
  String(item.Description || item.description || item.ProductName || '').trim();

/** ASCII EPC memory for LS000533 — dynamic PC + EPC bank, no leading zeros */
const calculateAsciiEpcMemory = (text) => {
  const rawHex = stringToHex(String(text || '').trim());
  return calculateEpcMemory(rawHex);
};

/** Code128B payload: FNC1 (0x0E) + & + item code (matches client sample `&FLX-4P1.5FD`) */
const formatLS000533C128BPayload = (itemCode) => {
  const v = String(itemCode || '').trim();
  return `${String.fromCharCode(14)}&${v}`;
};

// LS000533 — diamond / fancy label (ENGINE 3941×710, RFID 96-bit EPC, QR + C128B)
const generateLS000533Prn = (item) => {
  const itemCode = String(item.ItemCode || item.RFIDCode || '').trim();
  const barcodeValue = String(item.RFIDCode || item.Barcode || item.BarcodeValue || itemCode).trim();
  const grossWt = formatWeight3(item.GrossWt ?? item.GrossWeight ?? item.grosswt ?? item.TWt);
  const diamondWt = formatDiamondCt(
    item.TotalDiamondWeight ?? item.DiamondWt ?? item.DiamondWeight ?? item.diamondweight
  );
  const purity = prnQuote(resolveLS000533Purity(item));
  const description = prnQuote(resolveLS000533Description(item));
  const designLabel = prnQuote(resolveLS000533DesignLabel(item));
  const displayCode = prnQuote(itemCode);
  const { epcBits, pcValue, epcHex } = calculateAsciiEpcMemory(itemCode || barcodeValue);
  const c128Payload = formatLS000533C128BPayload(itemCode);

  return `!PTX_SETUP
ENGINE-WIDTH;3941:LENGTH;710:MIRROR;0.
PTX_END
~PAPER;ROTATE 0
~CONFIG
UPC DESCENDERS;0
END
~PAPER;LABELS 2;MEDIA 1
~PAPER;FEED SHIFT 0;INTENSITY 15;SPEED IPS 2;SLEW IPS 2;TYPE 0
~PAPER;CUT 0;PAUSE 0;TEAR 0
~CONFIG
CHECK DYNAMIC BCD;0
SLASH ZERO;0
UPPERCASE;0
AUTO WRAP;0
HOST FORM LENGTH;1
END
~CREATE;FORM-0;51
SCALE;DOT;203;203
ISET;'UTF8'
RFWTAG;16;PC
16;H;${pcValue}
STOP
RFWTAG;${epcBits};EPC
${epcBits};H;*${epcHex}*
STOP
FONT;FACE 92250;BOLD 1;SLANT 0
ALPHA
INV;POINT;116;778;9;10;"${displayCode}"
STOP
FONT;FACE 92250;BOLD 0;SLANT 0
ALPHA
INV;POINT;90;778;7;8;"Wt :"
INV;POINT;90;728;7;7;"${grossWt}"
INV;POINT;59;780;7;7;"Dw :"
INV;POINT;59;728;7;7;"${diamondWt}"
INV;POINT;24;693;7;7;"${purity}"
INV;POINT;24;780;7;7;"${description}"
STOP
BARCODE
QRCODE;INV;XD4;T2;E0;M0;I0;23;558
"${displayCode}"
STOP
ALPHA
INV;POINT;119;615;7;7;"${designLabel}"
STOP
BARCODE
C128B;INV;XRD1:1:2:2:3:3:4:4;H4.8;49;326
"${c128Payload}"
STOP
END
~EXECUTE;FORM-0;1

~NORMAL
~DELETE FORM;FORM-0
`;
};

// Generate PRN for LS000443 - Silver Category (New template)
const generateLS000443SilverPrn = (item) => {
  const itemCode = item.ItemCode || '';
  const barcodeValue = item.BarcodeValue || item.Barcode || itemCode;
  const purityName = item.PurityName || item.Purity || 'SILVER NECKLASE';
  const grossWt = item.GrossWt || item.GrossWeight || '0.610';
  const { epcHex: rawEpcHex } = calculateEpcMemory(stringToHex(barcodeValue));

  // Format barcode: & prefix + first 3 chars + apostrophe + rest (e.g., SLR25000333 -> &SLR'25000333)
  let formattedBarcode = barcodeValue;
  if (barcodeValue.length > 3) {
    const prefix = barcodeValue.substring(0, 3);
    const suffix = barcodeValue.substring(3);
    formattedBarcode = `&${prefix}'${suffix}`;
  } else {
    formattedBarcode = `&${barcodeValue}`;
  }
  
  return `!PTX_SETUP
ENGINE-WIDTH;2838:LENGTH;1380:MIRROR;0.
PTX_END
~PAPER;ROTATE 0
~CONFIG
UPC DESCENDERS;0
END
~PAPER;LABELS 2;MEDIA 1
~PAPER;FEED SHIFT 0;INTENSITY 15;SPEED IPS 2;SLEW IPS 2;TYPE 0
~PAPER;CUT 0;PAUSE 0;TEAR 0
~CONFIG
CHECK DYNAMIC BCD;0
SLASH ZERO;0
UPPERCASE;0
AUTO WRAP;0
HOST FORM LENGTH;1
END
~CREATE;FORM-0;99
SCALE;DOT;203;203
ISET;'UTF8'
RFWTAG;16;PC
16;H;*3400*
STOP
RFWTAG;96;EPC
96;H;*${rawEpcHex}*
STOP
FONT;FACE 92250;BOLD 0;SLANT 0
ALPHA
INV;POINT;192;538;7;8;"GWt :"
INV;POINT;192;472;7;7;"${grossWt}"
INV;POINT;218;538;7;7;"${purityName}"
STOP
BARCODE
C128B;INV;XRD1:1:2:2:3:3:4:4;H3.17;81;390
"${barcodeValue}"
STOP
ALPHA
INV;POINT;48;511;7;7;"${itemCode}"
INV;POINT;193;323;7;7;"LASHEEN JEWELLERY"
STOP
END
~EXECUTE;FORM-0;1

~NORMAL
~DELETE FORM;FORM-0
`;
};

// Main function to generate client-specific PRN
export const generateClientPrn = (item, clientCode) => {
  const code = (clientCode || '').trim();
  switch (code) {
    case 'LS000224':
      return generateLS000224Prn(item);
    case 'LS000428':
      return generateLS000428Prn(item);
    case 'LS000431':
      return generateLS000431Prn(item);
    case 'LS000533':
      return generateLS000533Prn(item);
    case 'LS000443':
      // Check category for LS000443 - Gold, Silver, or Diamond
      // Also check ProductId for category detection
      const category = item.Category || item.CategoryName || item.ProductId || '';
      const categoryUpper = category.toUpperCase();
      
      if (categoryUpper === 'GOLD' || categoryUpper.includes('GOLD')) {
        return generateLS000443GoldPrn(item);
      } else if (categoryUpper === 'SILVER' || categoryUpper.includes('SILVER')) {
        return generateLS000443SilverPrn(item);
      } else if (categoryUpper === 'DIAMOND' || categoryUpper.includes('DIAMOND')) {
        return generateLS000443DiamondPrn(item);
      } else {
        throw new Error(`PRN template for client ${code} is only available for Gold, Silver, or Diamond category. Current category: ${category || 'N/A'}`);
      }
    default:
      throw new Error(`PRN template not configured for client code: ${code}`);
  }
};
