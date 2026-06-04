const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const https = require("https");

const projectRoot = path.resolve(__dirname, "..");
const bridgeProject = path.join(projectRoot, "rfid-bridge", "rfid-bridge.csproj");
const bridgeDir = path.join(projectRoot, "rfid-bridge");
const framework = String(process.env.RFID_BRIDGE_FRAMEWORK || "net8.0").trim();
const publishDir = path.join(bridgeDir, "bin", "Release", framework, "win-x64", "publish");
const sdkDir = path.join(bridgeDir, "sdk");
const prereqDir = path.join(projectRoot, "build-resources", "prerequisites");

const REQUIRED_SDK_DLLS = ["UHFAPI.dll", "UHFControl.dll", "libusb-1.0.dll"];
const VC_REDIST_URL = "https://aka.ms/vs/17/release/vc_redist.x64.exe";
const VC_REDIST_FILE = "vc_redist.x64.exe";
const MIN_VC_REDIST_BYTES = 20_000_000;

const copyMatchingDlls = (fromDir, toDir, label) => {
  if (!fs.existsSync(fromDir)) return 0;
  let count = 0;
  for (const name of fs.readdirSync(fromDir)) {
    if (!name.toLowerCase().endsWith(".dll")) continue;
    const src = path.join(fromDir, name);
    const dest = path.join(toDir, name);
    fs.copyFileSync(src, dest);
    count += 1;
    console.log(`  [sdk] ${label}: ${name}`);
  }
  return count;
};

const syncSdkDllsToPublish = () => {
  if (!fs.existsSync(publishDir)) {
    throw new Error(`Publish folder not found: ${publishDir}`);
  }

  console.log("Syncing RFID reader SDK DLLs into publish output...");
  copyMatchingDlls(bridgeDir, publishDir, "bridge root");
  copyMatchingDlls(sdkDir, publishDir, "bridge/sdk");

  const missing = REQUIRED_SDK_DLLS.filter((name) => !fs.existsSync(path.join(publishDir, name)));
  if (missing.length) {
    console.error("\nRFID bridge build FAILED — missing required SDK files in publish folder:");
    missing.forEach((name) => console.error(`  - ${name}`));
    console.error(`\nCopy these from your reader vendor SDK into:\n  ${bridgeDir}\n`);
    console.error("Then run: npm run build:bridge\n");
    process.exit(1);
  }

  console.log("RFID SDK DLLs verified in publish folder:");
  REQUIRED_SDK_DLLS.forEach((name) => {
    const size = fs.statSync(path.join(publishDir, name)).size;
    console.log(`  OK ${name} (${size} bytes)`);
  });
};

const downloadFile = (url, dest) =>
  new Promise((resolve, reject) => {
    const follow = (nextUrl) => {
      https
        .get(nextUrl, (response) => {
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            follow(response.headers.location);
            return;
          }
          if (response.statusCode !== 200) {
            reject(new Error(`Download failed (${response.statusCode}): ${nextUrl}`));
            return;
          }
          const file = fs.createWriteStream(dest);
          response.pipe(file);
          file.on("finish", () => file.close(resolve));
          file.on("error", reject);
        })
        .on("error", reject);
    };
    follow(url);
  });

const ensureVcRedistributable = async () => {
  fs.mkdirSync(prereqDir, { recursive: true });
  const dest = path.join(prereqDir, VC_REDIST_FILE);

  if (fs.existsSync(dest) && fs.statSync(dest).size >= MIN_VC_REDIST_BYTES) {
    console.log(`VC++ redistributable already present: ${dest}`);
    return;
  }

  console.log("Downloading Microsoft VC++ 2015-2022 x64 redistributable for installer bundle...");
  try {
    await downloadFile(VC_REDIST_URL, dest);
    if (!fs.existsSync(dest) || fs.statSync(dest).size < MIN_VC_REDIST_BYTES) {
      throw new Error("Downloaded file is too small or missing.");
    }
    console.log(`VC++ redistributable saved: ${dest}`);
  } catch (error) {
    console.error("\nCould not download VC++ redistributable.");
    console.error("The desktop installer needs this so UHFAPI.dll works on a new PC.");
    console.error(`Manual fix: download ${VC_REDIST_URL}`);
    console.error(`Save as: ${dest}\n`);
    throw error;
  }
};

if (!fs.existsSync(bridgeProject)) {
  console.error(`RFID bridge project not found: ${bridgeProject}`);
  process.exit(1);
}

const missingBeforeBuild = REQUIRED_SDK_DLLS.filter((name) => !fs.existsSync(path.join(bridgeDir, name)));
if (missingBeforeBuild.length) {
  console.error("\nCannot build RFID bridge — copy reader SDK DLLs into rfid-bridge/ first:");
  missingBeforeBuild.forEach((name) => console.error(`  - ${name}`));
  process.exit(1);
}

const publishCmd = [
  "dotnet publish",
  `"${bridgeProject}"`,
  "-c Release",
  `-f ${framework}`,
  "-r win-x64",
  "--self-contained true",
  "/p:PublishSingleFile=false",
  "/p:IncludeNativeLibrariesForSelfExtract=true"
].join(" ");

(async () => {
  try {
    console.log(`Publishing RFID bridge (${framework})...`);
    execSync(publishCmd, {
      cwd: bridgeDir,
      stdio: "inherit"
    });

    syncSdkDllsToPublish();
    await ensureVcRedistributable();

    console.log("\nRFID bridge publish completed.");
    console.log(`  Bridge: ${publishDir}`);
    console.log(`  Installer prerequisite: ${path.join(prereqDir, VC_REDIST_FILE)}`);
  } catch (error) {
    console.error("Failed to prepare RFID bridge for installer.");
    process.exit(1);
  }
})();
