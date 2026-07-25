/** Strip non-hex chars and uppercase. */
export const normalizeEpcHex = (value) =>
  String(value || '').trim().toUpperCase().replace(/[^0-9A-F]/g, '');

/** ASCII text → contiguous hex (e.g. "3016" → "33303136"). */
export const stringToAsciiHex = (text) =>
  String(text || '')
    .split('')
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

/** Left-pad hex to a fixed EPC bit length (48/64/80/96-bit). */
export const padEpcHexToBitLength = (hex, bits) => {
  const len = bits / 4;
  const cleaned = normalizeEpcHex(hex);
  if (!cleaned) return '0'.repeat(len);
  if (cleaned.length > len) return cleaned.slice(-len);
  return cleaned.padStart(len, '0');
};

/** Decode printable ASCII embedded in an EPC hex string (ignores leading zero padding). */
export const hexToAscii = (hex) => {
  const cleaned = normalizeEpcHex(hex);
  if (!cleaned || cleaned.length % 2 !== 0) return '';

  const trimmed = cleaned.replace(/^0+/, '') || '0';
  const ascii = (trimmed.match(/.{1,2}/g) || [])
    .map((pair) => String.fromCharCode(parseInt(pair, 16)))
    .join('');

  return /^[\x20-\x7E]+$/.test(ascii) ? ascii : '';
};

/** Decode scanned EPC hex to LS000533 item code when tag uses ASCII encoding. */
export const decodeAsciiEpcToItemCode = (epcValue) => hexToAscii(epcValue);

/** All EPC/TID hex variants worth sending to lookup APIs for one scanned value. */
export const expandEpcLookupKeys = (epcValue) => {
  const raw = normalizeEpcHex(epcValue);
  if (!raw) return [];

  const keys = new Set([raw]);
  const trimmed = raw.replace(/^0+/, '') || '0';
  keys.add(trimmed);

  [12, 16, 20, 24].forEach((len) => {
    keys.add(trimmed.padStart(len, '0'));
    if (raw.length <= len) keys.add(raw.padStart(len, '0'));
  });

  const ascii = hexToAscii(raw);
  if (ascii) {
    const asciiHex = stringToAsciiHex(ascii);
    keys.add(asciiHex);
    [12, 16, 20, 24].forEach((len) => {
      keys.add(asciiHex.padStart(len, '0'));
    });
  }

  return Array.from(keys).filter(Boolean);
};

/** Map API results back onto the raw scanned EPC keys shown in the UI. */
export const propagateRfidMappingToRawEpcs = (rawEpcs, mapping = {}) => {
  const result = { ...mapping };
  (rawEpcs || []).forEach((rawValue) => {
    const raw = normalizeEpcHex(rawValue);
    if (!raw || result[raw]) return;

    expandEpcLookupKeys(raw).some((variant) => {
      const rfid = mapping[variant];
      if (rfid) {
        result[raw] = rfid;
        return true;
      }
      return false;
    });

    if (!result[raw]) {
      const decoded = hexToAscii(raw);
      if (decoded && mapping[decoded]) {
        result[raw] = mapping[decoded];
      }
    }
  });
  return result;
};

/** Expected EPC hex values written on LS000533 labels for a given item code. */
export const computeLS000533EpcHexCandidates = (itemCode, variant = 'standard') => {
  const source = String(itemCode || '').trim();
  if (!source) return [];

  const asciiHex = stringToAsciiHex(source);
  const keys = new Set([asciiHex]);

  keys.add(padEpcHexToBitLength(asciiHex, 48));
  keys.add(padEpcHexToBitLength(asciiHex, 64));
  keys.add(padEpcHexToBitLength(asciiHex, 80));
  keys.add(padEpcHexToBitLength(asciiHex, 96));

  return Array.from(keys);
};

/** Build tray/stock lookup keys from scanned tags.
 * Prefer resolved RFID codes from TrayScanModal (SJ…); do not treat EPC hex as RFID.
 */
export const buildTrayStockLookupPayload = (scannedTags = []) => {
  const list = Array.isArray(scannedTags) ? scannedTags : [];

  const rfidCodes = Array.from(
    new Set(
      list
        .map((item) => {
          if (typeof item === 'string') return '';
          return String(item?.rfidCode || item?.RFIDCode || item?.RfidCode || '').trim();
        })
        .filter((code) => code && code !== '-')
    )
  );

  const rawIdentities = list
    .map((item) => {
      if (typeof item === 'string') return String(item || '').trim().toUpperCase();
      return String(item?.epc || item?.EPC || item?.tid || item?.TID || '').trim().toUpperCase();
    })
    .filter(Boolean);

  const epcKeys = Array.from(new Set(rawIdentities.flatMap((identity) => expandEpcLookupKeys(identity))));
  const decodedCodes = Array.from(new Set(
    rawIdentities.map(decodeAsciiEpcToItemCode).filter(Boolean)
  ));

  return {
    rawIdentities: Array.from(new Set(rawIdentities)),
    epcKeys,
    decodedCodes,
    /** Resolved item RFID codes from EPC→RFID lookup (use these for stock APIs). */
    rfidCodes,
  };
};
