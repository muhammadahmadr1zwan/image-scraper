"use strict";

const fs = require("fs");
const { findOverride } = require("./paths");
const { getInstagramPermalink } = require("./load-sources");
const { fetchInstagramPhoto } = require("./fetch-instagram");
const { fetchPlacesPhoto } = require("./fetch-places");

async function resolveImage(cafe, options) {
  const { sources, apiKey, verbose } = options;

  const override = findOverride(cafe.id);
  if (override) {
    const buffer = fs.readFileSync(override.filePath);
    return {
      buffer,
      ext: override.ext,
      source: "override",
      detail: override.filePath
    };
  }

  const permalink = getInstagramPermalink(sources, cafe.id);
  if (permalink) {
    try {
      return await fetchInstagramPhoto(permalink, verbose);
    } catch (err) {
      if (verbose) {
        console.log(`    Instagram failed: ${err.message}`);
      }
      if (!apiKey) {
        throw new Error(`Instagram failed (${err.message}) and no GOOGLE_PLACES_API_KEY set`);
      }
    }
  }

  if (!apiKey) {
    throw new Error("No override or Instagram source, and GOOGLE_PLACES_API_KEY is not set");
  }

  return fetchPlacesPhoto(apiKey, cafe, verbose);
}

module.exports = { resolveImage };
