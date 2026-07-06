"use strict";

const fs = require("fs");
const path = require("path");

const TOOL_DIR = path.resolve(__dirname, "..");
const OUTPUT_DIR = process.env.OUTPUT_DIR
  ? path.resolve(process.env.OUTPUT_DIR)
  : path.join(TOOL_DIR, "output");
const CAFES_JSON = path.join(TOOL_DIR, "cafes.json");
const OVERRIDES_DIR = path.join(TOOL_DIR, "overrides");
const SOURCES_JSON = path.join(TOOL_DIR, "sources.json");

function cafeImagePath(cafeId, ext) {
  return path.join(OUTPUT_DIR, `${cafeId}.${ext}`);
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
  OUTPUT_DIR,
  CAFES_JSON,
  OVERRIDES_DIR,
  SOURCES_JSON,
  cafeImagePath,
  findOverride,
  imageExists,
  existingImagePath
};
