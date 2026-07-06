"use strict";

function extractShortcode(permalink) {
  const match = permalink.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

function extFromContentType(contentType) {
  if (!contentType) {
    return "jpg";
  }
  if (contentType.includes("png")) {
    return "png";
  }
  if (contentType.includes("webp")) {
    return "webp";
  }
  return "jpg";
}

async function fetchInstagramPhoto(permalink, verbose) {
  const shortcode = extractShortcode(permalink);
  if (!shortcode) {
    throw new Error(`Invalid Instagram permalink: ${permalink}`);
  }

  const mediaUrl = `https://www.instagram.com/p/${shortcode}/media/?size=l`;

  if (verbose) {
    console.log(`    Instagram: GET ${mediaUrl}`);
  }

  const response = await fetch(mediaUrl, {
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ImageScraper/1.0)"
    }
  });

  if (!response.ok) {
    throw new Error(`Instagram media request failed (${response.status})`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Instagram did not return an image (${contentType || "unknown type"})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 1024) {
    throw new Error("Instagram returned an unexpectedly small image");
  }

  return {
    buffer,
    ext: extFromContentType(contentType),
    source: "instagram",
    detail: permalink
  };
}

module.exports = { fetchInstagramPhoto, extractShortcode };
