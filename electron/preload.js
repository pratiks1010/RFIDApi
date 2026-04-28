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
  moveFile: (sourcePath, destinationPath) => ipcRenderer.invoke("move-file", sourcePath, destinationPath)
});
