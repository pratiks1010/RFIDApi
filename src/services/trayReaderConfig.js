const TRAY_READER_CONFIG_KEY = 'rfidTrayReaderConfig';

const DEFAULT_TRAY_READER_CONFIG = {
  comPrimary: '7',
  comSecondary: '8',
  baudRate: '115200'
};

const normalize = (value, fallback) => {
  const next = String(value ?? '').trim();
  return next || fallback;
};

export const getTrayReaderConfig = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(TRAY_READER_CONFIG_KEY) || '{}');
    return {
      comPrimary: normalize(parsed?.comPrimary, DEFAULT_TRAY_READER_CONFIG.comPrimary),
      comSecondary: normalize(parsed?.comSecondary, DEFAULT_TRAY_READER_CONFIG.comSecondary),
      baudRate: normalize(parsed?.baudRate, DEFAULT_TRAY_READER_CONFIG.baudRate)
    };
  } catch {
    return { ...DEFAULT_TRAY_READER_CONFIG };
  }
};

export const saveTrayReaderConfig = ({ comPrimary, comSecondary, baudRate }) => {
  const payload = {
    comPrimary: normalize(comPrimary, DEFAULT_TRAY_READER_CONFIG.comPrimary),
    comSecondary: normalize(comSecondary, DEFAULT_TRAY_READER_CONFIG.comSecondary),
    baudRate: normalize(baudRate, DEFAULT_TRAY_READER_CONFIG.baudRate)
  };
  localStorage.setItem(TRAY_READER_CONFIG_KEY, JSON.stringify(payload));
  return payload;
};
