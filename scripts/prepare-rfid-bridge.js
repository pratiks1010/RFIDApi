const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const projectRoot = path.resolve(__dirname, "..");
const bridgeProject = path.join(projectRoot, "rfid-bridge", "rfid-bridge.csproj");
const bridgeDir = path.dirname(bridgeProject);

if (!fs.existsSync(bridgeProject)) {
  console.error(`RFID bridge project not found: ${bridgeProject}`);
  process.exit(1);
}

const publishCmd = [
  "dotnet publish",
  `"${bridgeProject}"`,
  "-c Release",
  "-r win-x64",
  "--self-contained true",
  "/p:PublishSingleFile=false",
  "/p:IncludeNativeLibrariesForSelfExtract=true"
].join(" ");

try {
  console.log("Publishing RFID bridge...");
  execSync(publishCmd, {
    cwd: bridgeDir,
    stdio: "inherit"
  });
  console.log("RFID bridge publish completed.");
} catch (error) {
  console.error("Failed to publish RFID bridge.");
  process.exit(1);
}
