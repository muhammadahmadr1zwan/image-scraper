"use strict";

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

async function searchPlace(apiKey, cafe, verbose) {
  const textQuery = `${cafe.name} ${cafe.address}`;

  if (verbose) {
    console.log(`    Places: searchText "${textQuery}"`);
  }

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.photos"
    },
    body: JSON.stringify({ textQuery, maxResultCount: 1 })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Places search failed (${response.status}): ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const place = data.places && data.places[0];
  if (!place) {
    throw new Error("Places search returned no results");
  }

  const photo = place.photos && place.photos[0];
  if (!photo || !photo.name) {
    throw new Error("Places result has no photos");
  }

  return {
    placeName: place.displayName && place.displayName.text,
    photoName: photo.name
  };
}

async function downloadPlacePhoto(apiKey, photoName, verbose) {
  const url = new URL(`https://places.googleapis.com/v1/${photoName}/media`);
  url.searchParams.set("maxHeightPx", "1600");
  url.searchParams.set("maxWidthPx", "1600");
  url.searchParams.set("key", apiKey);

  if (verbose) {
    console.log(`    Places: GET photo media (${photoName})`);
  }

  const response = await fetch(url, { redirect: "follow" });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Places photo download failed (${response.status}): ${body.slice(0, 200)}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Places did not return an image (${contentType || "unknown type"})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 1024) {
    throw new Error("Places returned an unexpectedly small image");
  }

  return {
    buffer,
    ext: extFromContentType(contentType),
    source: "google-places",
    detail: photoName
  };
}

async function fetchPlacesPhoto(apiKey, cafe, verbose) {
  const { placeName, photoName } = await searchPlace(apiKey, cafe, verbose);
  const result = await downloadPlacePhoto(apiKey, photoName, verbose);
  result.detail = placeName ? `${placeName} (${photoName})` : photoName;
  return result;
}

module.exports = { fetchPlacesPhoto };
