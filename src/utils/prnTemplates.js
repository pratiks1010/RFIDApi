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




// Calculate EPC bit length and PC value based on hex code length (memory allocation)
const calculateEpcMemory = (hexCode) => {
  if (!hexCode) {
    return { epcBits: 96, pcValue: '*3400*', epcHex: '000000000000000000000000' };
  }
  
  let epcHex = hexCode;
  const len = epcHex.length;
  
  let epcBits;
  let pcValue;
  
  // Pad to nearest standard EPC length
  if (len <= 8) {
    // 32 bits (8 chars) - Rare, but supported
    epcBits = 32;
    pcValue = '*1C00*'; // Length 3 words? No, 32bits is 2 words. 1C00 is 3 words (48 bits). 
                    // 2 words would be 1000 (00010...). Let's stick to 48 bits min to be safe if 32 is odd.
                    // Actually, let's bump to 48 bits (12 chars) minimum for better compatibility.
    epcBits = 48;
    pcValue = '*1C00*';
    epcHex = epcHex.padStart(12, '0');
  } else if (len <= 12) {
    // 48 bits (12 chars)
    epcBits = 48;
    pcValue = '*1C00*';
    epcHex = epcHex.padStart(12, '0');
  } else if (len <= 16) {
    // 64 bits (16 chars)
    epcBits = 64;
    pcValue = '*2400*';
    epcHex = epcHex.padStart(16, '0');
  } else {
    // Default to 96 bits (24 chars) for anything larger than 64 bits
    // This covers 80 bits (20 chars) case by promoting to 96 bits standard
    epcBits = 96;
    pcValue = '*3400*';
    epcHex = epcHex.padStart(24, '0');
  }
  
  return { epcBits, pcValue, epcHex };
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
  let rawEpcHex = stringToHex(barcodeValue);
  
  // Pad to 24 characters (96 bits) for EPC
  if (rawEpcHex.length < 24) {
    rawEpcHex = rawEpcHex.padStart(24, "0");
  } else if (rawEpcHex.length > 24) {
    rawEpcHex = rawEpcHex.substring(0, 24);
  }

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

// Generate PRN for LS000443 - Silver Category (New template)
const generateLS000443SilverPrn = (item) => {
  const itemCode = item.ItemCode || '';
  const barcodeValue = item.BarcodeValue || item.Barcode || itemCode;
  const purityName = item.PurityName || item.Purity || 'SILVER NECKLASE';
  const grossWt = item.GrossWt || item.GrossWeight || '0.610';
  let rawEpcHex = stringToHex(barcodeValue);
  
  // Pad to 24 characters (96 bits) for EPC
  if (rawEpcHex.length < 24) {
    rawEpcHex = rawEpcHex.padStart(24, "0");
  } else if (rawEpcHex.length > 24) {
    rawEpcHex = rawEpcHex.substring(0, 24);
  }
  
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
  // Route to appropriate template based on client code
  switch (clientCode) {
    case 'LS000428':
      return generateLS000428Prn(item);
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
        throw new Error(`PRN template for client ${clientCode} is only available for Gold, Silver, or Diamond category. Current category: ${category || 'N/A'}`);
      }
    default:
      throw new Error(`PRN template not configured for client code: ${clientCode}`);
  }
};
