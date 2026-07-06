"use strict";

const fs = require("fs");
const { CAFES_JSON } = require("./paths");

function loadCafes() {
  if (!fs.existsSync(CAFES_JSON)) {
    throw new Error(
      `Missing ${CAFES_JSON}. Copy cafes.example.json to cafes.json and add your locations.`
    );
  }

  const raw = JSON.parse(fs.readFileSync(CAFES_JSON, "utf8"));
  const cafes = Array.isArray(raw) ? raw : raw.cafes;

  if (!Array.isArray(cafes) || cafes.length === 0) {
    throw new Error(`No locations found in ${CAFES_JSON}`);
  }

  return cafes.map(function (cafe) {
    if (!cafe.id || !cafe.name || !cafe.address) {
      throw new Error(`Each entry in ${CAFES_JSON} needs id, name, and address`);
    }

    return {
      id: cafe.id,
      name: cafe.name,
      region: cafe.region || "us",
      address: cafe.address
    };
  });
}

module.exports = { loadCafes };
