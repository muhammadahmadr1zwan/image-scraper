"use strict";

const fs = require("fs");
const path = require("path");

const TOOL_DIR = path.resolve(__dirname, "..");
const nestedWebsiteRoot = path.resolve(TOOL_DIR, "../..");

function resolveRepoRoot() {
  const candidates = [
    process.env.NIYYAH_REPO ? path.resolve(process.env.NIYYAH_REPO) : null,
    nestedWebsiteRoot,
    path.resolve(TOOL_DIR, "../niyyah-website")
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "assets", "js", "data.js"))) {
      return candidate;
    }
  }

  return TOOL_DIR;
}

const REPO_ROOT = resolveRepoRoot();
const DATA_JS = path.join(REPO_ROOT, "assets", "js", "data.js");
const IMG_DIR = path.join(REPO_ROOT, "assets", "img");
const OVERRIDES_DIR = path.join(TOOL_DIR, "overrides");
const SOURCES_JSON = path.join(TOOL_DIR, "sources.json");

function cafeImagePath(cafeId, ext) {
  return path.join(IMG_DIR, `cafe-${cafeId}.${ext}`);
}

function relativeImagePath(cafeId, ext) {
  return `assets/img/cafe-${cafeId}.${ext}`;
}

function findOverride(cafeId) {
  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    const filePath = path.join(OVERRIDES_DIR, `${cafeId}.${ext}`);
    if (fs.existsSync(filePath)) {
      return { filePath, ext: ext === "jpeg" ? "jpg" : ext };
    }
  }
  return null;
}

function imageExists(cafeId) {
  for (const ext of ["png", "jpg", "jpeg", "webp"]) {
    if (fs.existsSync(cafeImagePath(cafeId, ext === "jpeg" ? "jpg" : ext))) {
      return true;
    }
  }
  return false;
}

function existingImagePath(cafeId) {
  for (const ext of ["png", "jpg", "jpeg", "webp"]) {
    const filePath = cafeImagePath(cafeId, ext === "jpeg" ? "jpg" : ext);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  return null;
}

module.exports = {
  TOOL_DIR,
  REPO_ROOT,
  DATA_JS,
  IMG_DIR,
  OVERRIDES_DIR,
  SOURCES_JSON,
  cafeImagePath,
  relativeImagePath,
  findOverride,
  imageExists,
  existingImagePath
};
