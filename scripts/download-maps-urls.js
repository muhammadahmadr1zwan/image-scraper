#!/usr/bin/env node
"use strict";

/**
 * One-off helper: extract lh3.googleusercontent.com photo URLs from Google Maps
 * share links and download at max resolution declared in the URL (7i/8i params).
 * Saves to overrides/{cafe-id}.jpg
 */

const fs = require("fs");
const path = require("path");

const OVERRIDES_DIR = path.join(__dirname, "..", "overrides");

const ENTRIES = [
  {
    cafeId: "mass-ave",
    url:
      "https://www.google.com/maps/place/Niyyah+Coffee/@39.7773506,-86.1452244,3a,75y,90t/data=!3m8!1e2!3m6!1sCIABIhBoyO4hTyhAO70K4N3DsAb8!2e10!3e12!6shttps:%2F%2Flh3.googleusercontent.com%2Fgps-cs-s%2FAPNQkAGtr5kZX7X7SUpvUTNxH837lW2djPW2eub8pf0AaZGvYTv9jZgJ6CWEJTefTSD3MNHr8uCURJW8D_6AHD7kQSmJp47lkbW81NGer57kSGgKi_c71d1oTrwC1zZSu4V5LH5Wz3N_9iF_5bCx%3Dw203-h152-k-no!7i4032!8i3024!4m7!3m6!1s0x886b513e8c785bf7:0xd59e53d659ee17c5!8m2!3d39.7773467!4d-86.1449422!10e5!16s%2Fg%2F11zfsjzdph?entry=ttu"
  },
  {
    cafeId: "mccordsville",
    url:
      "https://www.google.com/maps/place/Niyyah+Coffee/@39.89016,-85.9183834,3a,75y,90t/data=!3m8!1e2!3m6!1sCIABIhD3BQPBOTkM5uhM24h-xq7A!2e10!3e12!6shttps:%2F%2Flh3.googleusercontent.com%2Fgps-cs-s%2FAPNQkAEMdQHAwXHRr-tr8iZ0nVDxBzdMW2eCMaz4A2G--9xOf7WSRHc0qgDG6b3Qg-vzlNTbSjgDQxZv5mfLEB15kQsznOFII-5QEP0U_TJhOmH2HFN4-zJq30eoTXlbcXqsXFvkMxFs_aRbugmU%3Dw203-h304-k-no!7i6336!8i9504!4m11!1m2!2m1!1sNiyyah+Coffee!3m7!1s0x886b355ccbffdb6f:0xaaba02c02bb4a8fa!8m2!3d39.8907311!4d-85.9184082!10e5!15sCg1OaXl5YWggQ29mZmVlWg8iDW5peXl5YWggY29mZmVlEgQjb2ZmZWVfc2hvcOABAA!16s%2Fg%2F11xv38b0fy?entry=ttu"
  },
  {
    cafeId: "hub-and-spoke",
    url:
      "https://www.google.com/maps/place/Niyyah+Coffee/@39.9412978,-86.0259463,3a,75y,90t/data=!3m8!1e2!3m6!1sCIHM0ogKEKHJpMu6hviZjAE!2e10!3e12!6shttps:%2F%2Flh3.googleusercontent.com%2Fgps-cs-s%2FAPNQkAFgNE-lJlHxVAx3VUiyNV4ypbS6pM4yUqz51wogQs2nwRKfYtAgWS_PHCoOwqv95gJ_6Lzu42AU9OwSmYu7NGHWfe0LA_LlcTOzwM1Oqf0DwNY_ZtVUrztyViawsrEafZMsKmhKQA%3Dw203-h270-k-no!7i3024!8i4032!4m7!3m6!1s0x8814b32ba78cd749:0x4956a64d7329618c!8m2!3d39.9412978!4d-86.0259463!10e5!16s%2Fg%2F11v0jmtqgb?entry=ttu"
  },
  {
    cafeId: "broad-ripple",
    url:
      "https://www.google.com/maps/place/Niyyah+Coffee/@39.8672983,-86.1185036,3a,75y,90t/data=!3m8!1e2!3m6!1sCIABIhCIwak27ZDSUfKYvAySXqQF!2e10!3e12!6shttps:%2F%2Flh3.googleusercontent.com%2Fgps-cs-s%2FAPNQkAEeWr4g3a1w6Wgx7DHa6g35-5lmeQZgm4pZ-0C1lWtZrKlC6NvWPeK1m7ZxTOKfeDTgq_e9kJVsbKbpJAVajmcitLGfzhEqylZ1tZ11aE6HHWKVj25ZARkZrzWX8RUq_WhquNLHWh_KJAXi%3Dw203-h152-k-no!7i1572!8i1180!4m7!3m6!1s0x886b5324746d3635:0x90f3418bc9800eb1!8m2!3d39.867323!4d-86.1185051!10e5!16s%2Fg%2F11y86xt232?entry=ttu"
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
      "User-Agent": "Mozilla/5.0 (compatible; NiyyahCafePhotoFetcher/1.0)"
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

async function downloadViaPlacesApi(apiKey, parsed) {
  const { fetchPlacesPhoto } = require("../lib/fetch-places");
  const cafe = {
    name: "Niyyah Coffee",
    address: parsed.placeId || "McCordsville, IN"
  };
  return fetchPlacesPhoto(apiKey, cafe, true);
}

async function main() {
  fs.mkdirSync(OVERRIDES_DIR, { recursive: true });
  loadEnv();
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || "";

  const results = [];

  for (const entry of ENTRIES) {
    process.stdout.write(`${entry.cafeId}: `);
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
        const result = await downloadViaPlacesApi(apiKey, parsed);
        buffer = result.buffer;
        ext = result.ext;
      } else {
        throw new Error("No lh3 URL in link and GOOGLE_PLACES_API_KEY not set");
      }

      const dest = path.join(OVERRIDES_DIR, `${entry.cafeId}.${ext}`);
      fs.writeFileSync(dest, buffer);
      console.log(`ok (${(buffer.length / 1024).toFixed(0)} KB) -> ${dest}`);
      results.push({ id: entry.cafeId, status: "ok", bytes: buffer.length });
    } catch (err) {
      console.log(`failed: ${err.message}`);
      results.push({ id: entry.cafeId, status: "failed", reason: err.message });
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
