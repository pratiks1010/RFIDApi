const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");
const pngToIcoModule = require("png-to-ico");
const pngToIco = pngToIcoModule.default || pngToIcoModule;

async function main() {
  const root = path.resolve(__dirname, "..");
  const srcSvg = path.join(root, "public", "Logo", "Sparkle RFID svg.svg");
  const outDir = path.join(root, "build-resources");
  const iconPng = path.join(outDir, "icon.png");
  const iconIco = path.join(outDir, "icon.ico");

  await fs.mkdir(outDir, { recursive: true });

  await sharp(srcSvg)
    .resize(512, 512, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(iconPng);

  const icoBuffer = await pngToIco(iconPng);
  await fs.writeFile(iconIco, icoBuffer);

  console.log(`Generated ${iconPng}`);
  console.log(`Generated ${iconIco}`);
}

main().catch((error) => {
  console.error("Failed to generate electron icon:", error);
  process.exit(1);
});
