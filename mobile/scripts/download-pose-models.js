/**
 * Downloads MediaPipe .task models into assets/models/ for native prebuild bundling.
 * Run: npm run setup:pose-models
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "assets", "models");

const MODELS = [
  {
    name: "pose_landmarker_full.task",
    url: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task",
  },
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlinkSync(dest);
          download(res.headers.location, dest).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", reject);
  });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const model of MODELS) {
    const dest = path.join(OUT, model.name);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1_000_000) {
      console.log(`skip ${model.name} (already present)`);
      continue;
    }
    console.log(`downloading ${model.name}…`);
    await download(model.url, dest);
    console.log(`saved ${dest}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
