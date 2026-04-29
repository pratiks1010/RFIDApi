const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fsSync = require("fs");
const fs = require("fs/promises");
const { spawn } = require("child_process");
const axios = require("axios");
const XLSX = require("xlsx");
const { autoUpdater } = require("electron-updater");

const isDev = !app.isPackaged;
let mainWindow = null;
let bridgeProcess = null;
let bridgeStdoutBuffer = "";
const FERONIA_BASE_URL = "http://192.168.29.245:93/api/TamannaahBS";
const DEFAULT_FERONIA_TOKEN = "EC3276D0-6700-4B2A-82D4-A1C028827625";
const APP_UPDATE_URL = String(process.env.ELECTRON_AUTO_UPDATE_URL || "").trim();
let updateDownloadRequested = false;
let updateHandlersBound = false;

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildFatalPage = (title, details) => {
  const safeTitle = escapeHtml(title || "Application Error");
  const safeDetails = escapeHtml(details || "Unexpected issue");
  return `
  <!doctype html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>${safeTitle}</title>
    <style>
      body { margin:0; font-family: Segoe UI, Arial, sans-serif; background:#f8fafc; color:#0f172a; }
      .wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
      .card { width:min(760px, 95vw); background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:20px; box-shadow:0 10px 30px rgba(2,6,23,.08);}
      h2 { margin:0 0 8px; }
      p { margin:0 0 8px; color:#334155; }
      pre { margin:0 0 14px; background:#f1f5f9; border-radius:8px; padding:10px; color:#475569; white-space:pre-wrap; }
      button { border:0; border-radius:8px; padding:10px 14px; background:#2563eb; color:#fff; cursor:pointer; font-weight:600; }
      button + button { margin-left:8px; background:#0f172a; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h2>${safeTitle}</h2>
        <p>App process is still running. You can retry without closing the EXE.</p>
        <pre>${safeDetails}</pre>
        <button onclick="location.reload()">Retry</button>
        <button onclick="location.href='file://${path.join(__dirname, "..", "build", "index.html").replace(/\\/g, "/")}#/login'">Open Login</button>
      </div>
    </div>
  </body>
  </html>
  `;
};

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

  const toggleDevTools = () => {
    if (win.isDestroyed()) return;
    if (win.webContents.isDevToolsOpened()) {
      win.webContents.closeDevTools();
      return;
    }
    win.webContents.openDevTools({ mode: "detach", activate: true });
  };

  win.webContents.on("before-input-event", (event, input) => {
    const key = String(input.key || "").toLowerCase();
    const withCtrlShiftI = input.control && input.shift && key === "i";
    const withF12 = key === "f12";
    if (!withCtrlShiftI && !withF12) return;
    event.preventDefault();
    toggleDevTools();
  });

  win.webContents.on("did-fail-load", (_event, code, desc, validatedURL) => {
    const reason = `Code: ${code}\nDescription: ${desc || "Unknown"}\nURL: ${validatedURL || "N/A"}`;
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildFatalPage("Failed to load app screen", reason))}`);
  });

  win.webContents.on("render-process-gone", (_event, details) => {
    const reason = `Reason: ${details?.reason || "unknown"}\nExit code: ${details?.exitCode ?? "N/A"}`;
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildFatalPage("Renderer crashed", reason))}`);
  });

  win.on("unresponsive", () => {
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildFatalPage("Window is unresponsive", "The renderer stopped responding. Retry to recover without closing app."))}`);
  });

  mainWindow = win;
}

const sendBridgeEvent = (channel, payload) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send(channel, payload);
};

const setupAutoUpdater = () => {
  if (isDev || !APP_UPDATE_URL || updateHandlersBound) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.setFeedURL({
    provider: "generic",
    url: APP_UPDATE_URL
  });

  autoUpdater.on("update-available", async (info) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const nextVersion = String(info?.version || "").trim() || "new version";
    const result = await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Update Available",
      message: `Version ${nextVersion} is available.`,
      detail: "Would you like to download and install it now?",
      buttons: ["Download now", "Later"],
      defaultId: 0,
      cancelId: 1
    });
    if (result.response !== 0 || updateDownloadRequested) return;
    updateDownloadRequested = true;
    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      updateDownloadRequested = false;
      await dialog.showMessageBox(mainWindow, {
        type: "error",
        title: "Update Download Failed",
        message: "Failed to download the update.",
        detail: error?.message || "Unknown update download error."
      });
    }
  });

  autoUpdater.on("update-not-available", () => {
    updateDownloadRequested = false;
  });

  autoUpdater.on("error", async (error) => {
    updateDownloadRequested = false;
    if (!mainWindow || mainWindow.isDestroyed()) return;
    await dialog.showMessageBox(mainWindow, {
      type: "error",
      title: "Update Check Failed",
      message: "Unable to check for updates right now.",
      detail: error?.message || "Unknown updater error."
    });
  });

  autoUpdater.on("update-downloaded", async (info) => {
    updateDownloadRequested = false;
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const nextVersion = String(info?.version || "").trim() || "latest version";
    const result = await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Update Ready",
      message: `Version ${nextVersion} is ready to install.`,
      detail: "The app will restart to complete the update.",
      buttons: ["Install and Restart", "Later"],
      defaultId: 0,
      cancelId: 1
    });
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  updateHandlersBound = true;
};

const checkForAppUpdates = async () => {
  if (isDev || !APP_UPDATE_URL) {
    return { ok: false, reason: "skipped" };
  }
  try {
    await autoUpdater.checkForUpdates();
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error?.message || "Update check failed." };
  }
};

const parseTagLine = (line) => {
  const match = line.match(
    /^TAG dev=([^\s]+)\s+epc=([^\s]+)\s+tid=([^\s]*)\s+rssi=([^\s]*)\s+ant=([^\s]*)\s+phase=([^\s]*)\s+user=([^\s]*)/i
  );
  if (!match) return null;
  return {
    deviceId: match[1],
    epc: match[2],
    tid: match[3] || "",
    rssi: match[4] || "",
    antenna: match[5] || "",
    phase: match[6] || "",
    user: match[7] || "",
    raw: line
  };
};

const handleBridgeOutputLine = (line) => {
  if (!line) return;
  sendBridgeEvent("rfid-bridge-line", line);
  if (line.startsWith("TAG ")) {
    const tag = parseTagLine(line);
    if (tag) sendBridgeEvent("rfid-bridge-tag", tag);
  }
};

const getBridgeStartConfig = () => {
  if (!app.isPackaged) {
    const projectPath = path.join(app.getAppPath(), "rfid-bridge", "rfid-bridge.csproj");
    const cwd = path.join(app.getAppPath(), "rfid-bridge");
    return {
      command: "dotnet",
      args: ["run", "--project", projectPath],
      cwd
    };
  }

  const exePath = path.join(process.resourcesPath, "rfid-bridge", "rfid-bridge.exe");
  return {
    command: exePath,
    args: [],
    cwd: path.dirname(exePath)
  };
};

const ensureBridgeProcess = async () => {
  if (bridgeProcess && !bridgeProcess.killed) {
    return true;
  }

  const cfg = getBridgeStartConfig();
  if (app.isPackaged && !fsSync.existsSync(cfg.command)) {
    const msg = `RFID bridge executable not found at: ${cfg.command}. Rebuild installer with bridge packaging enabled.`;
    sendBridgeEvent("rfid-bridge-error", msg);
    throw new Error(msg);
  }

  bridgeProcess = spawn(cfg.command, cfg.args, {
    cwd: cfg.cwd,
    windowsHide: true
  });

  bridgeStdoutBuffer = "";

  bridgeProcess.stdout.on("data", (chunk) => {
    bridgeStdoutBuffer += chunk.toString("utf8");
    const lines = bridgeStdoutBuffer.split(/\r?\n/);
    bridgeStdoutBuffer = lines.pop() || "";
    lines.forEach((line) => handleBridgeOutputLine(line.trim()));
  });

  bridgeProcess.stderr.on("data", (chunk) => {
    const text = chunk.toString("utf8").trim();
    if (text) sendBridgeEvent("rfid-bridge-error", text);
  });

  bridgeProcess.on("exit", (code) => {
    sendBridgeEvent("rfid-bridge-line", `Bridge exited (code=${code ?? "unknown"})`);
    bridgeProcess = null;
  });

  bridgeProcess.on("error", (error) => {
    sendBridgeEvent("rfid-bridge-error", `Bridge process error: ${error.message}`);
    bridgeProcess = null;
  });

  return true;
};

const sendBridgeCommand = async (command) => {
  await ensureBridgeProcess();
  if (!bridgeProcess || bridgeProcess.killed || !bridgeProcess.stdin.writable) {
    throw new Error("RFID bridge is not available.");
  }
  bridgeProcess.stdin.write(`${command}\n`);
  return true;
};

const getConfigPath = (username) => {
  const safeName = String(username || "default").replace(/[^a-zA-Z0-9-_]/g, "_");
  return path.join(app.getPath("userData"), `autopush-config-${safeName}.json`);
};

const feroniaGet = async (apiPath, authToken) => {
  const cleanPath = String(apiPath || "").replace(/^\//, "");
  const token = String(authToken || "").trim() || DEFAULT_FERONIA_TOKEN;
  const url = `${FERONIA_BASE_URL}/${cleanPath}`;
  const response = await axios.get(url, {
    timeout: 45000,
    headers: {
      AuthorizationToken: token,
      Accept: "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache"
    },
    params: { _ts: Date.now() }
  });
  return response.data;
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

ipcMain.handle("feronia-test-service", async (_, authToken) => {
  try {
    const data = await feroniaGet("TestService", authToken);
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error?.response?.data?.message || error?.response?.data?.error || error?.message || "Feronia TestService failed",
      debug: {
        status: error?.response?.status || null,
        code: error?.code || null
      }
    };
  }
});

ipcMain.handle("feronia-get-stock", async (_, authToken) => {
  try {
    const data = await feroniaGet("GetStockOnHand", authToken);
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error?.response?.data?.message || error?.response?.data?.error || error?.message || "Feronia GetStockOnHand failed",
      debug: {
        status: error?.response?.status || null,
        code: error?.code || null
      }
    };
  }
});

ipcMain.handle("rfid-bridge-ensure", async () => {
  await ensureBridgeProcess();
  return { ok: true };
});

ipcMain.handle("rfid-bridge-command", async (_, command) => {
  if (!command || typeof command !== "string") {
    return { ok: false, error: "Invalid command." };
  }
  await sendBridgeCommand(command.trim());
  return { ok: true };
});

ipcMain.handle("rfid-bridge-stop-service", async () => {
  if (bridgeProcess && !bridgeProcess.killed) {
    try {
      bridgeProcess.stdin.write("exit\n");
    } catch {
      // ignore
    }
    bridgeProcess.kill();
    bridgeProcess = null;
  }
  return { ok: true };
});

ipcMain.handle("app-check-for-updates", async () => checkForAppUpdates());

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();
  checkForAppUpdates().catch(() => {});

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (bridgeProcess && !bridgeProcess.killed) {
    try {
      bridgeProcess.stdin.write("exit\n");
    } catch {
      // ignore
    }
    bridgeProcess.kill();
    bridgeProcess = null;
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});
