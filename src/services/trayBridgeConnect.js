/** Connection modes supported by rfid-bridge (Program.cs). */
export const TRAY_CONNECTION_MODES = Object.freeze({
  serial: 'serial',
  usb: 'usb',
});

export const TRAY_CONNECTION_MODE_OPTIONS = Object.freeze([
  { value: TRAY_CONNECTION_MODES.serial, label: 'COM / Serial (dual reader)' },
  { value: TRAY_CONNECTION_MODES.usb, label: 'USB (direct)' },
]);

export const normalizeComNumber = (value) => String(value || '').trim().replace(/^COM/i, '');

export const parseComNumber = (value) => {
  const normalized = normalizeComNumber(value);
  const parsed = Number.parseInt(normalized, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const parseBaudRate = (value) => {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

/**
 * Bridge connect command sequence before set-power / start.
 * @param {{ connectionMode?: string, comPrimary?: string, comSecondary?: string, baudRate?: string }} config
 * @returns {{ commands: string[], mode: string, errors: string[] }}
 */
export const buildTrayConnectCommands = (config = {}) => {
  const mode = String(config.connectionMode || TRAY_CONNECTION_MODES.serial).toLowerCase();
  const errors = [];

  if (mode === TRAY_CONNECTION_MODES.usb) {
    return {
      mode: TRAY_CONNECTION_MODES.usb,
      commands: ['disconnect', 'connect-usb'],
      errors,
    };
  }

  const primaryCom = parseComNumber(config.comPrimary);
  const secondaryCom = parseComNumber(config.comSecondary);
  const baud = parseBaudRate(config.baudRate) || 115200;

  if (!primaryCom) errors.push('Invalid primary COM port. Use number only (example: 7).');
  if (!secondaryCom) errors.push('Invalid secondary COM port. Use number only (example: 8).');

  if (errors.length) {
    return { mode: TRAY_CONNECTION_MODES.serial, commands: [], errors };
  }

  return {
    mode: TRAY_CONNECTION_MODES.serial,
    commands: [
      'disconnect',
      `connect-serial ${primaryCom} ${baud}`,
      `connect-serial ${secondaryCom} ${baud}`,
    ],
    errors,
  };
};

export const evaluateSerialConnectAttempt = (lines, comNumber) => {
  const text = (lines || []).join('\n').toLowerCase();
  const successNeedle = `connected via serial com${comNumber}`.toLowerCase();
  if (text.includes(successNeedle)) {
    return { ok: true, message: `COM${comNumber} connected.` };
  }
  if (text.includes('invalid com number')) {
    return { ok: false, message: `COM${comNumber} invalid. Use number only (example: ${comNumber}).` };
  }
  if (text.includes('serial connect failed')) {
    return { ok: false, message: `COM${comNumber} connection failed. Check cable, driver, and port.` };
  }
  if (text.includes('unable to load dll') && text.includes('uhfapi.dll')) {
    return { ok: false, message: 'RFID SDK DLL missing (UHFAPI.dll).' };
  }
  return { ok: null, message: `No explicit response for COM${comNumber} yet.` };
};

export const evaluateUsbConnectAttempt = (lines) => {
  const text = (lines || []).join('\n').toLowerCase();
  if (text.includes('connected via usb')) {
    return { ok: true, message: 'USB connected.' };
  }
  if (text.includes('usb connect failed')) {
    return { ok: false, message: 'USB connection failed. Check USB cable, driver, and libusb-1.0.dll.' };
  }
  if (text.includes('unable to load dll') && text.includes('uhfapi.dll')) {
    return { ok: false, message: 'RFID SDK DLL missing (UHFAPI.dll).' };
  }
  return { ok: null, message: 'No explicit USB connect response yet.' };
};

export const waitMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const lineText = (lines) =>
  (lines || [])
    .map((line) => (typeof line === 'string' ? line : line?.text || line?.line || ''))
    .join('\n')
    .toLowerCase();

const isConnectCommandSettled = (lines, cmd) => {
  const text = lineText(lines);
  const normalizedCmd = String(cmd || '').trim().toLowerCase();

  if (normalizedCmd === 'connect-usb') {
    return text.includes('connected via usb') || text.includes('usb connect failed');
  }

  if (normalizedCmd === 'disconnect') {
    return text.includes('disconnected') || text.includes('not connected') || text.length > 0;
  }

  const serialMatch = /^connect-serial\s+(\d+)/i.exec(String(cmd || '').trim());
  if (serialMatch) {
    const com = serialMatch[1];
    return (
      text.includes(`connected via serial com${com}`) ||
      text.includes('serial connect failed') ||
      text.includes('invalid com number')
    );
  }

  return text.length > 0;
};

/** Wait until bridge stdout includes a definitive connect/disconnect line. */
export const waitForConnectBridgeResponse = async (
  lineHistory,
  startIndex,
  cmd,
  timeoutMs = 1800
) => {
  const history = Array.isArray(lineHistory) ? lineHistory : [];
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const lines = history.slice(startIndex);
    if (isConnectCommandSettled(lines, cmd)) {
      await waitMs(60);
      return history.slice(startIndex);
    }
    await waitMs(80);
  }

  return history.slice(startIndex);
};
