const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = path.join(projectRoot, "release", "win-unpacked");
const destination = path.join(projectRoot, "build", "installer-payload", "win-unpacked");
if (!fs.existsSync(path.join(source, "Real.exe"))) {
  throw new Error(`Built Real application not found at ${source}`);
}
fs.rmSync(destination, { recursive: true, force: true });
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.cpSync(source, destination, { recursive: true });
console.log(`Prepared custom installer payload at ${destination}`);