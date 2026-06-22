const normalizeTagValue = (value) => String(value || '').trim().toUpperCase();

const pickFirstMatch = (text, patterns = []) => {
  for (let i = 0; i < patterns.length; i += 1) {
    const match = text.match(patterns[i]);
    if (match?.[1]) return normalizeTagValue(match[1]);
  }
  return '';
};

export const getTrayTagIdentity = (tag) => {
  if (!tag) return '';
  const tid = normalizeTagValue(tag?.tid || tag?.TID || tag?.tidNumber || tag?.TIDNumber);
  const epc = normalizeTagValue(tag?.epc || tag?.EPC || tag?.epcValue || tag?.EPCValue);
  return tid || epc || '';
};

export const parseTrayTagLine = (line) => {
  const raw = String(line || '').trim();
  if (!raw) return null;

  const lowered = raw.toLowerCase();
  if (!/(^|\b)(tag|epc|tid)\b/.test(lowered)) return null;
  if (lowered.includes('unable to parse tag line')) return null;
  if (lowered.includes('inventory started') || lowered.includes('inventory stopped')) return null;

  const epc = pickFirstMatch(raw, [
    /\bepc(?:value)?\s*[:=]\s*([A-Fa-f0-9]+)/i,
    /\bepc(?:value)?\s+([A-Fa-f0-9]+)/i,
    /\btag\s*[:=]\s*([A-Fa-f0-9]{8,})/i,
  ]);
  const tid = pickFirstMatch(raw, [
    /\btid(?:number)?\s*[:=]\s*([A-Fa-f0-9]+)/i,
    /\btid(?:number)?\s+([A-Fa-f0-9]+)/i,
  ]);
  const antenna = pickFirstMatch(raw, [/\bant(?:enna)?\s*[:=]\s*(\d+)/i]);
  const deviceId = pickFirstMatch(raw, [/\bdevice(?:id)?\s*[:=]\s*([A-Za-z0-9._-]+)/i]);

  if (!epc && !tid) return null;

  return {
    epc,
    tid,
    antenna: antenna || '',
    deviceId: deviceId || '',
    raw,
  };
};

export default parseTrayTagLine;
