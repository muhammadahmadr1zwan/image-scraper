"use strict";

const fs = require("fs");
const { SOURCES_JSON } = require("./paths");

function loadSources() {
  if (!fs.existsSync(SOURCES_JSON)) {
    return {};
  }

  const raw = fs.readFileSync(SOURCES_JSON, "utf8");
  return JSON.parse(raw);
}

function getInstagramPermalink(sources, cafeId) {
  const entry = sources[cafeId];
  if (!entry) {
    return null;
  }

  const permalink =
    typeof entry === "string" ? entry : entry.instagram || entry.permalink || null;

  if (!permalink || typeof permalink !== "string") {
    return null;
  }

  return permalink.trim() || null;
}

module.exports = { loadSources, getInstagramPermalink };
