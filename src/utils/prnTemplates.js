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
  const grossWt = item.GrossWt || item.GrossWeight || '0.61';
  const epcHex = toHex(barcodeValue);
  
  return `!PTX_SETUP
ENGINE-WIDTH;2794:LENGTH;1301:MIRROR;0.
PTX_END
~PAPER;ROTATE 0
~CONFIG
UPC DESCENDERS;0
END
~CONFIG
CHECK DYNAMIC BCD;0
END
~CREATE;FORM-0;93
SCALE;DOT;203;203
ISET;'UTF8'
RFWTAG;16;PC
16;H;*2C00*
STOP
RFWTAG;80;EPC
80;H;*${epcHex}*
STOP
FONT;FACE 92250;BOLD 0;SLANT 0
ALPHA
INV;POINT;219;537;7;7;"G.Wt :"
INV;POINT;219;476;7;7;"${grossWt}"
INV;POINT;196;524;7;7;"MK :"
INV;POINT;128;537;7;7;"${itemCode}"
STOP
BARCODE
C128B;INV;XRD1:1:2:2:3:3:4:4;H3.9;90;427
"&${itemCode}"
STOP
ALPHA
INV;POINT;68;537;7;7;"18K GOLD JEWELLERY"
INV;POINT;217;304;7;7;"LASHEEN JEWELLERY"
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

  if (rawEpcHex.length % 4 !== 0) {
    const remainder = rawEpcHex.length % 4;
    const padLength = 4 - remainder;
    rawEpcHex = rawEpcHex.padStart(rawEpcHex.length + padLength, "0");
  }
  const epcBytes = rawEpcHex.length / 2;
  const epcBits = epcBytes * 8

  const epcWords = epcBits / 16
  const pcDecimal = epcWords << 11
  const pcValue = "*"+pcDecimal.toString(16).toUpperCase().padStart(4, "0")+"*";

  // const { epcBits, pcValue, epcHex } = calculateEpcMemory(rawEpcHex);
  const barcodeStr = barcodeValue;

  const isGrossWtVisible = parseFloat(grossWt) > 0;
  const isDWtVisible = parseFloat(dWt) > 0;
  const isOWtVisible = parseFloat(oWt) > 0;
  
  return `!PTX_SETUP
ENGINE-WIDTH;2794:LENGTH;1301:MIRROR;0.
PTX_END
~PAPER;ROTATE 0
~CONFIG
UPC DESCENDERS;0
END
~CONFIG
CHECK DYNAMIC BCD;0
END
~CREATE;FORM-0;93
SCALE;DOT;203;203
ISET;'UTF8'
RFWTAG;16;PC
16;H;${pcValue}
STOP
RFWTAG;${epcBits};EPC
${epcBits};H;*${rawEpcHex}*
STOP
FONT;FACE 92250;BOLD 0;SLANT 0
ALPHA
${isGrossWtVisible ? `INV;POINT;238;541;6;6;"G.Wt :"\nINV;POINT;238;464;6;6;"${grossWt}"` : ''}
INV;POINT;178;541;6;6;"${purityName}"
INV;POINT;75;541;6;6;"${itemCode}"
INV;POINT;99;541;6;6;"${description}"
INV;POINT;200;290;6;6;"LASHEEN JEWELLERY"
${isDWtVisible ? `INV;POINT;218;541;6;6;"D.Wt :"\nINV;POINT;218;465;6;6;"${dWt}"` : ''}
${isOWtVisible ? `INV;POINT;198;541;6;6;"O.Wt :"\nINV;POINT;198;465;6;6;"${oWt}"` : ''}
INV;POINT;157;542;6;6;"${vendorName}"
INV;POINT;116;541;6;6;"LJ"
INV;POINT;115;508;6;6;"${mrp}"
STOP
BARCODE
C128B;INV;XRD1:1:2:2:3:3:4:4;H3.1;44;398
"${barcodeStr}"
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
  const purityName = item.PurityName || item.Purity || '';
  const grossWt = item.GrossWt || item.GrossWeight || '0';
  const rawEpcHex = toHex(itemCode);
  const { epcBits, pcValue, epcHex } = calculateEpcMemory(rawEpcHex);
  
  // Format barcode: insert ' after first 3 characters (e.g., SLR25000333 -> SLR'25000333)
  let formattedBarcode = barcodeValue;
  if (barcodeValue.length > 3) {
    formattedBarcode = barcodeValue.substring(0, 3) + "'" + barcodeValue.substring(3);
  }
  
  return `!PTX_SETUP
ENGINE-WIDTH;2794:LENGTH;1301:MIRROR;0.
PTX_END
~PAPER;ROTATE 0
~CONFIG
UPC DESCENDERS;0
END
~CONFIG
CHECK DYNAMIC BCD;0
END
~CREATE;FORM-0;93
SCALE;DOT;203;203
ISET;'UTF8'
RFWTAG;16;PC
16;H;${pcValue}
STOP
RFWTAG;${epcBits};EPC
${epcBits};H;*${epcHex}*
STOP
FONT;FACE 92250;BOLD 0;SLANT 0
ALPHA
INV;POINT;219;537;7;7;"G.Wt :"
INV;POINT;219;476;7;7;"${grossWt}"
INV;POINT;196;524;7;7;"MK :"
INV;POINT;93;537;7;7;"${itemCode}"
INV;POINT;68;537;7;7;"${purityName}"
INV;POINT;217;304;7;7;"LASHEEN JEWELLERY"
STOP
BARCODE
C128B;INV;XRD1:1:2:2:3:3:4:4;H3.9;118;394
"${formattedBarcode}"
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
