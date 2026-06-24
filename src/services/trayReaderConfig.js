const TRAY_READER_CONFIG_KEY = 'rfidTrayReaderConfig';

/** Reader SDK attenuation index: 0 = full TX power, higher = weaker (max 300). */
export const TRAY_POWER_ATT_MAX = 300;

/** Allowed preset values sent to the bridge (matches vendor-friendly steps). */
export const TRAY_POWER_PRESET_VALUES = Object.freeze([0, 50, 100, 150, 200, 250, 300]);

/** UI display scale: 300 = maximum power / fastest tray scan, 0 = minimum. */
export const TRAY_POWER_DISPLAY_MAX = 300;

export const attToDisplayPower = (attDb10) => {
  const att = snapPowerAttDb10ToPreset(attDb10);
  return TRAY_POWER_DISPLAY_MAX - att;
};

export const displayPowerToAtt = (displayValue) => {
  const display = snapPowerAttDb10ToPreset(displayValue);
  return snapPowerAttDb10ToPreset(TRAY_POWER_DISPLAY_MAX - display);
};

/** UI labels (internal att: 0 = max power, 300 = min). */
export const TRAY_POWER_PRESET_OPTIONS = Object.freeze([
  { value: 0, label: 'Maximum — fastest scan' },
  { value: 50, label: 'Very high' },
  { value: 100, label: 'High' },
  { value: 150, label: 'Medium' },
  { value: 200, label: 'Low' },
  { value: 250, label: 'Very low' },
  { value: 300, label: 'Minimum — weakest signal' }
]);

export const snapPowerAttDb10ToPreset = (raw) => {
  const n = Number.parseInt(String(raw ?? '').trim(), 10);
  if (!Number.isInteger(n)) return TRAY_POWER_PRESET_VALUES[0];
  const clamped = Math.max(0, Math.min(TRAY_POWER_ATT_MAX, n));
  let best = TRAY_POWER_PRESET_VALUES[0];
  let bestDist = Infinity;
  TRAY_POWER_PRESET_VALUES.forEach((p) => {
    const d = Math.abs(p - clamped);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  });
  return best;
};

const DEFAULT_TRAY_READER_CONFIG = {
  connectionMode: 'serial',
  comPrimary: '7',
  comSecondary: '8',
  baudRate: '115200',
  powerAttDb10: '0'
};

const normalize = (value, fallback) => {
  const next = String(value ?? '').trim();
  return next || fallback;
};

const normalizePowerAttDb10 = (value, fallback) => {
  const fb = snapPowerAttDb10ToPreset(fallback);
  const n = Number.parseInt(String(value ?? '').trim(), 10);
  if (!Number.isInteger(n)) return String(fb);
  return String(snapPowerAttDb10ToPreset(n));
};

/** Returns nearest preset 0|50|…|300, or null if the string is not a number at all. */
export const parsePowerAttDb10 = (value) => {
  const n = Number.parseInt(String(value ?? '').trim(), 10);
  if (!Number.isInteger(n)) return null;
  return snapPowerAttDb10ToPreset(n);
};

const normalizeConnectionMode = (value, fallback) => {
  const next = String(value ?? '').trim().toLowerCase();
  if (next === 'usb' || next === 'serial') return next;
  return fallback;
};

export const getTrayReaderConfig = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(TRAY_READER_CONFIG_KEY) || '{}');
    return {
      connectionMode: normalizeConnectionMode(parsed?.connectionMode, DEFAULT_TRAY_READER_CONFIG.connectionMode),
      comPrimary: normalize(parsed?.comPrimary, DEFAULT_TRAY_READER_CONFIG.comPrimary),
      comSecondary: normalize(parsed?.comSecondary, DEFAULT_TRAY_READER_CONFIG.comSecondary),
      baudRate: normalize(parsed?.baudRate, DEFAULT_TRAY_READER_CONFIG.baudRate),
      powerAttDb10: normalizePowerAttDb10(parsed?.powerAttDb10, DEFAULT_TRAY_READER_CONFIG.powerAttDb10)
    };
  } catch {
    return { ...DEFAULT_TRAY_READER_CONFIG };
  }
};

export const saveTrayReaderConfig = (partial) => {
  const current = getTrayReaderConfig();
  const payload = {
    connectionMode: normalizeConnectionMode(
      partial?.connectionMode ?? current.connectionMode,
      DEFAULT_TRAY_READER_CONFIG.connectionMode
    ),
    comPrimary: normalize(partial?.comPrimary ?? current.comPrimary, DEFAULT_TRAY_READER_CONFIG.comPrimary),
    comSecondary: normalize(partial?.comSecondary ?? current.comSecondary, DEFAULT_TRAY_READER_CONFIG.comSecondary),
    baudRate: normalize(partial?.baudRate ?? current.baudRate, DEFAULT_TRAY_READER_CONFIG.baudRate),
    powerAttDb10: normalizePowerAttDb10(
      partial?.powerAttDb10 ?? current.powerAttDb10,
      DEFAULT_TRAY_READER_CONFIG.powerAttDb10
    )
  };
  localStorage.setItem(TRAY_READER_CONFIG_KEY, JSON.stringify(payload));
  return payload;
};
