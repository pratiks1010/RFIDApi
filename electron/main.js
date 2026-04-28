const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs/promises");
const XLSX = require("xlsx");

const isDev = !app.isPackaged;

function createWindow() {
  const iconPath = path.join(__dirname, "..", "build-resources", "icon.png");
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    win.loadURL("http://localhost:3000");
  } else {
    win.loadFile(path.join(__dirname, "..", "build", "index.html"), { hash: "/login" });
  }
}

const getConfigPath = (username) => {
  const safeName = String(username || "default").replace(/[^a-zA-Z0-9-_]/g, "_");
  return path.join(app.getPath("userData"), `autopush-config-${safeName}.json`);
};

ipcMain.handle("read-file", async (_, filePath) => {
  return fs.readFile(filePath, "utf8");
});

ipcMain.handle("write-file", async (_, filePath, content) => {
  await fs.writeFile(filePath, content, "utf8");
  return true;
});

ipcMain.handle("get-file-stats", async (_, filePath) => {
  const stats = await fs.stat(filePath);
  return {
    mtime: stats.mtime.toISOString(),
    size: stats.size
  };
});

ipcMain.handle("select-folder", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"]
  });
  if (result.canceled || !result.filePaths?.length) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle("select-file", async (_, options) => {
  const filters = Array.isArray(options?.filters) && options.filters.length
    ? options.filters
    : [{ name: "Excel Files", extensions: ["xlsx", "xls"] }];

  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters
  });

  if (result.canceled || !result.filePaths?.length) return null;
  return result.filePaths[0];
});

ipcMain.handle("save-config", async (_, username, config) => {
  const filePath = getConfigPath(username);
  const payload = JSON.stringify(config || {}, null, 2);
  await fs.writeFile(filePath, payload, "utf8");
  return true;
});

ipcMain.handle("get-config", async (_, username) => {
  try {
    const filePath = getConfigPath(username);
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch {
    return null;
  }
});

ipcMain.handle("get-excel-files", async (_, folderPath) => {
  try {
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => /\.(xlsx|xls|csv)$/i.test(name))
      .map((name) => ({
        name,
        path: path.join(folderPath, name)
      }));
  } catch {
    return [];
  }
});

ipcMain.handle("read-excel", async (_, filePath) => {
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return {
    headers,
    rows
  };
});

ipcMain.handle("move-file", async (_, sourcePath, destinationPath) => {
  await fs.rename(sourcePath, destinationPath);
  return true;
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
