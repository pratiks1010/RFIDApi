const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  readFile: (filePath) => ipcRenderer.invoke("read-file", filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke("write-file", filePath, content),
  writeBinaryFile: (filePath, base64) => ipcRenderer.invoke("write-binary-file", filePath, base64),
  getFileStats: (filePath) => ipcRenderer.invoke("get-file-stats", filePath)
});

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  readFile: (filePath) => ipcRenderer.invoke("read-file", filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke("write-file", filePath, content),
  writeBinaryFile: (filePath, base64) => ipcRenderer.invoke("write-binary-file", filePath, base64),
  getFileStats: (filePath) => ipcRenderer.invoke("get-file-stats", filePath),
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  itemImagesSetFolder: (folderPath, options) => ipcRenderer.invoke("item-images-set-folder", folderPath, options),
  itemImagesEnsureIndex: (folderPath) => ipcRenderer.invoke("item-images-ensure-index", folderPath),
  itemImagesResolveUrl: (itemCode) => ipcRenderer.invoke("item-images-resolve-url", itemCode),
  itemImagesReadDataUrl: (itemCode) => ipcRenderer.invoke("item-images-read-data-url", itemCode),
  itemImagesGetMeta: () => ipcRenderer.invoke("item-images-get-meta"),
  itemImagesResync: () => ipcRenderer.invoke("item-images-resync"),
  itemImagesSyncNow: () => ipcRenderer.invoke("item-images-sync-now"),
  onItemImagesIndexUpdated: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on("item-images-index-updated", listener);
    return () => ipcRenderer.removeListener("item-images-index-updated", listener);
  },
  selectFile: (options) => ipcRenderer.invoke("select-file", options),
  saveConfig: (username, config) => ipcRenderer.invoke("save-config", username, config),
  getConfig: (username) => ipcRenderer.invoke("get-config", username),
  getExcelFiles: (folderPath) => ipcRenderer.invoke("get-excel-files", folderPath),
  readExcel: (filePath) => ipcRenderer.invoke("read-excel", filePath),
  moveFile: (sourcePath, destinationPath) => ipcRenderer.invoke("move-file", sourcePath, destinationPath),
  feroniaTestService: (authToken) => ipcRenderer.invoke("feronia-test-service", authToken),
  feroniaGetStockOnHand: (authToken) => ipcRenderer.invoke("feronia-get-stock", authToken),
  appGetVersion: () => ipcRenderer.invoke("app-get-version"),
  appCheckForUpdates: () => ipcRenderer.invoke("app-check-for-updates"),
  appStartUpdateDownload: () => ipcRenderer.invoke("app-start-update-download"),
  appInstallDownloadedUpdate: () => ipcRenderer.invoke("app-install-downloaded-update"),
  onAppUpdaterStatus: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on("app-updater-status", listener);
    return () => ipcRenderer.removeListener("app-updater-status", listener);
  },
  rfidBridgeEnsure: () => ipcRenderer.invoke("rfid-bridge-ensure"),
  rfidBridgeCommand: (command) => ipcRenderer.invoke("rfid-bridge-command", command),
  rfidBridgeStopService: () => ipcRenderer.invoke("rfid-bridge-stop-service"),
  onRfidBridgeLine: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on("rfid-bridge-line", listener);
    return () => ipcRenderer.removeListener("rfid-bridge-line", listener);
  },
  onRfidBridgeTag: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on("rfid-bridge-tag", listener);
    return () => ipcRenderer.removeListener("rfid-bridge-tag", listener);
  },
  onRfidBridgeError: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on("rfid-bridge-error", listener);
    return () => ipcRenderer.removeListener("rfid-bridge-error", listener);
  }
});
