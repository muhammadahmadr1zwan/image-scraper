#!/usr/bin/env node
"use strict";

/**
 * Extract lh3.googleusercontent.com photo URLs from Google Maps share links
 * and download at max resolution declared in the URL (7i/8i params).
 * Saves to overrides/{id}.jpg
 */

const fs = require("fs");
const path = require("path");

const OVERRIDES_DIR = path.join(__dirname, "..", "overrides");

// Add your Google Maps share links here.
const ENTRIES = [
  {
    id: "example-location",
    url: "https://www.google.com/maps/place/..."
  }
];

function parseMapsUrl(mapsUrl) {
  const widthMatch = mapsUrl.match(/!7i(\d+)!8i(\d+)/);
  const width = widthMatch ? Number(widthMatch[1]) : null;
  const height = widthMatch ? Number(widthMatch[2]) : null;

  const encodedMatch = mapsUrl.match(/!6s(https[^!]+)/);
  if (encodedMatch) {
    const thumbUrl = decodeURIComponent(encodedMatch[1]);
    const base = thumbUrl.replace(/=w\d+-h\d+-k-no$/, "").replace(/=w\d+-h\d+-k-no/, "");
    const hiResUrl = width && height ? `${base}=w${width}-h${height}-k-no` : `${base}=s0`;
    return { hiResUrl, width, height, method: "lh3" };
  }

  const placeMatch = mapsUrl.match(/!1s(0x[a-f0-9]+:0x[a-f0-9]+)/i);
  const photoMatch = mapsUrl.match(/!1s(CI[A-Za-z0-9_-]+)/);
  return {
    placeId: placeMatch ? placeMatch[1] : null,
    photoRef: photoMatch ? photoMatch[1] : null,
    width,
    height,
    method: "places-api"
  };
}

async function downloadImage(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ImageScraper/1.0)"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Not an image (${contentType})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 2048) {
    throw new Error(`Image too small (${buffer.length} bytes)`);
  }

  return buffer;
}

async function downloadViaPlacesApi(apiKey, parsed, entry) {
  const { fetchPlacesPhoto } = require("../lib/fetch-places");
  const location = {
    name: entry.name || "Business",
    address: entry.address || parsed.placeId || "Unknown"
  };
  return fetchPlacesPhoto(apiKey, location, true);
}

async function main() {
  fs.mkdirSync(OVERRIDES_DIR, { recursive: true });
  loadEnv();
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || "";

  const results = [];

  for (const entry of ENTRIES) {
    process.stdout.write(`${entry.id}: `);
    try {
      const parsed = parseMapsUrl(entry.url);
      let buffer;
      let ext = "jpg";

      if (parsed.method === "lh3" && parsed.hiResUrl) {
        try {
          buffer = await downloadImage(parsed.hiResUrl);
        } catch (err) {
          const fallback = parsed.hiResUrl.replace(/=w\d+-h\d+-k-no$/, "=s0");
          buffer = await downloadImage(fallback);
        }
      } else if (apiKey) {
        const result = await downloadViaPlacesApi(apiKey, parsed, entry);
        buffer = result.buffer;
        ext = result.ext;
      } else {
        throw new Error("No lh3 URL in link and GOOGLE_PLACES_API_KEY not set");
      }

      const dest = path.join(OVERRIDES_DIR, `${entry.id}.${ext}`);
      fs.writeFileSync(dest, buffer);
      console.log(`ok (${(buffer.length / 1024).toFixed(0)} KB) -> ${dest}`);
      results.push({ id: entry.id, status: "ok", bytes: buffer.length });
    } catch (err) {
      console.log(`failed: ${err.message}`);
      results.push({ id: entry.id, status: "failed", reason: err.message });
    }
  }

  const ok = results.filter((r) => r.status === "ok").length;
  console.log(`\nDownloaded ${ok}/${results.length} overrides`);
  if (ok < results.length) {
    process.exitCode = 1;
  }
}

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
