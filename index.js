#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { loadCafes } = require("./lib/load-cafes");
const { loadSources, getInstagramPermalink } = require("./lib/load-sources");
const { resolveImage } = require("./lib/resolve-image");
const {
  DATA_JS,
  IMG_DIR,
  cafeImagePath,
  relativeImagePath,
  findOverride,
  imageExists,
  existingImagePath
} = require("./lib/paths");

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function parseArgs(argv) {
  const options = {
    list: false,
    dryRun: false,
    force: false,
    allRegions: false,
    verbose: false,
    cafe: null
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--list") {
      options.list = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--all-regions") {
      options.allRegions = true;
    } else if (arg === "--verbose" || arg === "-v") {
      options.verbose = true;
    } else if (arg === "--cafe") {
      options.cafe = argv[++i];
      if (!options.cafe) {
        throw new Error("--cafe requires a cafe id");
      }
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`image-scraper — cafe photo fetcher

Usage:
  node index.js [options]

Options:
  --list           Show cafe id, region, address, and current image path
  --dry-run        Show what would be downloaded without writing files
  --cafe <id>      Process a single cafe (default: all US cafes)
  --force          Overwrite existing images in assets/img/
  --all-regions    Include non-US cafes (default: region "us" only)
  --verbose, -v    Log source resolution details
  --help, -h       Show this help

Sources (priority order):
  1. overrides/{cafe-id}.jpg|png
  2. Instagram permalink in sources.json
  3. Google Places API (New) via GOOGLE_PLACES_API_KEY

Environment:
  GOOGLE_PLACES_API_KEY   Optional; required for Places fallback
  NIYYAH_REPO             Optional path to niyyah-website checkout
  .env in repo root is loaded automatically
`);
}

function filterCafes(cafes, options) {
  let filtered = cafes;

  if (!options.allRegions) {
    filtered = filtered.filter(function (cafe) {
      return cafe.region === "us";
    });
  }

  if (options.cafe) {
    filtered = filtered.filter(function (cafe) {
      return cafe.id === options.cafe;
    });
    if (filtered.length === 0) {
      throw new Error(`Cafe not found in data.js: ${options.cafe}`);
    }
  }

  return filtered;
}

function printList(cafes, sources) {
  console.log("id\tregion\timage\toverride\tinstagram\taddress");
  for (const cafe of cafes) {
    const onDisk = existingImagePath(cafe.id);
    const override = findOverride(cafe.id);
    const instagram = getInstagramPermalink(sources, cafe.id);
    console.log(
      [
        cafe.id,
        cafe.region,
        onDisk ? path.relative(path.dirname(DATA_JS), onDisk).replace(/\\/g, "/") : cafe.image,
        override ? "yes" : "no",
        instagram ? "yes" : "no",
        cafe.address
      ].join("\t")
    );
  }
}

function updateDataJsImagePath(cafeId, newRelativePath) {
  let content = fs.readFileSync(DATA_JS, "utf8");
  const pattern = new RegExp(
    `(id:\\s*"${cafeId}"[\\s\\S]*?image:\\s*IMG\\s*\\+\\s*"/)[^"]+(")`
  );
  const replacement = `$1${newRelativePath.replace(/^assets\/img\//, "")}$2`;
  const updated = content.replace(pattern, replacement);
  if (updated === content) {
    return false;
  }
  fs.writeFileSync(DATA_JS, updated, "utf8");
  return true;
}

async function processCafe(cafe, options, sources, apiKey) {
  const existing = existingImagePath(cafe.id);
  if (existing && !options.force) {
    return {
      id: cafe.id,
      status: "skipped",
      reason: `exists (${path.basename(existing)})`
    };
  }

  if (options.dryRun) {
    const override = findOverride(cafe.id);
    const instagram = getInstagramPermalink(sources, cafe.id);
    let plannedSource = "google-places";
    if (override) {
      plannedSource = "override";
    } else if (instagram) {
      plannedSource = "instagram";
    } else if (!apiKey) {
      plannedSource = "none (no override/instagram/api key)";
    }

    const destExt = override ? override.ext : "png|jpg";
    return {
      id: cafe.id,
      status: "dry-run",
      reason: `${plannedSource} -> assets/img/cafe-${cafe.id}.${destExt}`
    };
  }

  const result = await resolveImage(cafe, {
    sources,
    apiKey,
    verbose: options.verbose
  });

  const destPath = cafeImagePath(cafe.id, result.ext);
  fs.mkdirSync(IMG_DIR, { recursive: true });
  fs.writeFileSync(destPath, result.buffer);

  const relativePath = relativeImagePath(cafe.id, result.ext);
  const dataUpdated = updateDataJsImagePath(cafe.id, relativePath);

  return {
    id: cafe.id,
    status: "ok",
    source: result.source,
    detail: result.detail,
    saved: destPath,
    dataUpdated
  };
}

async function main() {
  loadEnvFile();

  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    printHelp();
    process.exit(1);
  }

  const cafes = loadCafes();
  const sources = loadSources();
  const selected = filterCafes(cafes, options);
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || "";

  if (options.list) {
    printList(selected.length ? selected : cafes, sources);
    return;
  }

  const results = [];
  for (const cafe of selected) {
    if (options.verbose || options.dryRun) {
      console.log(`\n${cafe.id} (${cafe.name})`);
    } else {
      console.log(`${cafe.id}...`);
    }

    try {
      const result = await processCafe(cafe, options, sources, apiKey);
      results.push(result);

      if (result.status === "ok") {
        console.log(
          `  ok (${result.source}) -> ${path.basename(result.saved)}` +
            (result.dataUpdated ? " [data.js updated]" : "")
        );
      } else if (result.status === "skipped") {
        console.log(`  skipped (${result.reason})`);
      } else {
        console.log(`  ${result.status}: ${result.reason}`);
      }
    } catch (err) {
      results.push({ id: cafe.id, status: "failed", reason: err.message });
      console.log(`  failed: ${err.message}`);
    }
  }

  const ok = results.filter(function (r) {
    return r.status === "ok" || r.status === "dry-run";
  }).length;
  const skipped = results.filter(function (r) {
    return r.status === "skipped";
  }).length;
  const failed = results.filter(function (r) {
    return r.status === "failed";
  }).length;

  console.log(`\nDone: ${ok} processed, ${skipped} skipped, ${failed} failed`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
