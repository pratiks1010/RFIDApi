const LS_EXPORT = 'rfid_user_export_download_folder';
const LS_PRN = 'rfid_user_prn_download_folder';

const readPath = (key) => {
  try {
    const v = String(localStorage.getItem(key) || '').trim();
    return v || '';
  } catch {
    return '';
  }
};

export const getExportDownloadFolder = () => readPath(LS_EXPORT);

export const getPrnDownloadFolder = () => readPath(LS_PRN);

export const setExportDownloadFolder = (path) => {
  const p = String(path || '').trim();
  if (!p) {
    try {
      localStorage.removeItem(LS_EXPORT);
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    localStorage.setItem(LS_EXPORT, p);
  } catch {
    /* ignore */
  }
};

export const setPrnDownloadFolder = (path) => {
  const p = String(path || '').trim();
  if (!p) {
    try {
      localStorage.removeItem(LS_PRN);
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    localStorage.setItem(LS_PRN, p);
  } catch {
    /* ignore */
  }
};

export const clearExportDownloadFolder = () => {
  try {
    localStorage.removeItem(LS_EXPORT);
  } catch {
    /* ignore */
  }
};

export const clearPrnDownloadFolder = () => {
  try {
    localStorage.removeItem(LS_PRN);
  } catch {
    /* ignore */
  }
};

export const isElectronBinarySaveAvailable = () =>
  typeof window !== 'undefined' && typeof window.electronAPI?.writeBinaryFile === 'function';

export const isElectronFolderPickerAvailable = () =>
  typeof window !== 'undefined' && typeof window.electronAPI?.selectFolder === 'function';

const joinFolderFile = (folder, filename) => {
  const f = String(folder || '').replace(/[/\\]+$/, '');
  const name = String(filename || 'download').replace(/^[/\\]+/, '');
  const sep = f.includes('\\') ? '\\' : '/';
  return `${f}${sep}${name}`;
};

/** Chunked base64 for large ArrayBuffers (avoids stack limits from spread). */
export const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
};

export const triggerBrowserDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
};

/**
 * @param {Blob} blob
 * @param {string} filename
 * @param {'export'|'prn'} kind — which saved folder path to use (EXE only).
 * @returns {Promise<{ usedFolder: boolean, path?: string, error?: string }>}
 */
export const saveBlobWithPreferredFolder = async (blob, filename, kind) => {
  const folder = kind === 'prn' ? getPrnDownloadFolder() : getExportDownloadFolder();
  const api = typeof window !== 'undefined' ? window.electronAPI : null;

  if (folder && api?.writeBinaryFile) {
    try {
      const ab = await blob.arrayBuffer();
      const b64 = arrayBufferToBase64(ab);
      const fullPath = joinFolderFile(folder, filename);
      await api.writeBinaryFile(fullPath, b64);
      return { usedFolder: true, path: fullPath };
    } catch (err) {
      console.error('saveBlobWithPreferredFolder', err);
      triggerBrowserDownload(blob, filename);
      return { usedFolder: false, error: err?.message || String(err) };
    }
  }

  triggerBrowserDownload(blob, filename);
  return { usedFolder: false };
};
