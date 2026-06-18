/** Primary key for a tray tag row (EPC preferred, TID fallback). */
export const getTrayTagIdentity = (tag) => {
  const epc = String(tag?.epc || '').trim().toUpperCase();
  const tid = String(tag?.tid || '').trim().toUpperCase();
  return epc || tid;
};

/** True when bridge stdout line is a TAG read (not "each tag prints" inventory text). */
export const isTrayTagOutputLine = (line) => {
  const normalized = String(line || '').replace(/^rfid>\s*/i, '').trim();
  return /^TAG\b/i.test(normalized) && /\b(dev|epc|tid)=/i.test(normalized);
};

/** Parse bridge TAG line: TAG dev=0 epc=... tid=... rssi=... ant=... */
export const parseTrayTagLine = (line) => {
  if (!isTrayTagOutputLine(line)) return null;

  const raw = String(line || '').trim();
  const tagStart = raw.search(/\bTAG\b/i);
  if (tagStart < 0) return null;

  const body = raw.slice(tagStart).replace(/^TAG[:\s]+/i, '').trim();
  if (!body) return null;

  const fields = {};
  body.split(/\s+/).forEach((token) => {
    const eqIndex = token.indexOf('=');
    if (eqIndex <= 0) return;
    const key = token.slice(0, eqIndex).trim().toLowerCase();
    const value = token.slice(eqIndex + 1).trim();
    if (key) fields[key] = value;
  });

  const epcRegex = /\bEPC\b\s*[:=]\s*([0-9A-Fa-f]+)/i;
  const tidRegex = /\bTID\b\s*[:=]\s*([0-9A-Fa-f]+)/i;
  const devRegex = /\b(?:DEV(?:ICE)?|DEVICEID|DEVICE_ID)\b\s*[:=]\s*([^\s]+)/i;
  const rssiRegex = /\bRSSI\b\s*[:=]\s*([-0-9.]+)/i;
  const antRegex = /\b(?:ANT(?:ENNA)?)\b\s*[:=]\s*([^\s]+)/i;
  const phaseRegex = /\bPHASE\b\s*[:=]\s*([^\s]+)/i;
  const userRegex = /\bUSER\b\s*[:=]\s*([0-9A-Fa-f]+)/i;

  let epc = String(fields.epc || '').trim().toUpperCase();
  let tid = String(fields.tid || '').trim().toUpperCase();

  const epcMatch = epcRegex.exec(raw);
  const tidMatch = tidRegex.exec(raw);
  if (!epc && epcMatch?.[1]) epc = epcMatch[1].trim().toUpperCase();
  if (!tid && tidMatch?.[1]) tid = tidMatch[1].trim().toUpperCase();

  if (!epc && !tid) return null;

  return {
    deviceId: String(fields.dev || fields.device || fields.deviceid || devRegex.exec(raw)?.[1] || '').trim(),
    epc,
    tid,
    rssi: String(fields.rssi || rssiRegex.exec(raw)?.[1] || '').trim(),
    antenna: String(fields.ant || fields.antenna || antRegex.exec(raw)?.[1] || '').trim(),
    phase: String(fields.phase || phaseRegex.exec(raw)?.[1] || '').trim(),
    user: String(fields.user || userRegex.exec(raw)?.[1] || '').trim(),
    raw: line,
  };
};
