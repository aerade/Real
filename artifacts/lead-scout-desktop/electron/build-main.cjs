const fs = require("node:fs");
const path = require("node:path");
const { build } = require("esbuild");

const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"),
);

build({
  entryPoints: [path.join(__dirname, "main.cjs")],
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["electron"],
  outfile: path.join(__dirname, "..", "dist", "electron", "main.cjs"),
  define: {
    __REAL_APP_VERSION__: JSON.stringify(packageJson.version),
  },
}).catch(() => process.exit(1));