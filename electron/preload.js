const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  readFile: (filePath) => ipcRenderer.invoke("read-file", filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke("write-file", filePath, content),
  getFileStats: (filePath) => ipcRenderer.invoke("get-file-stats", filePath)
});

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  readFile: (filePath) => ipcRenderer.invoke("read-file", filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke("write-file", filePath, content),
  getFileStats: (filePath) => ipcRenderer.invoke("get-file-stats", filePath),
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  selectFile: (options) => ipcRenderer.invoke("select-file", options),
  saveConfig: (username, config) => ipcRenderer.invoke("save-config", username, config),
  getConfig: (username) => ipcRenderer.invoke("get-config", username),
  getExcelFiles: (folderPath) => ipcRenderer.invoke("get-excel-files", folderPath),
  readExcel: (filePath) => ipcRenderer.invoke("read-excel", filePath),
  moveFile: (sourcePath, destinationPath) => ipcRenderer.invoke("move-file", sourcePath, destinationPath),
  feroniaTestService: (authToken) => ipcRenderer.invoke("feronia-test-service", authToken),
  feroniaGetStockOnHand: (authToken) => ipcRenderer.invoke("feronia-get-stock", authToken),
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
