"use strict";

const fs = require("fs");
const vm = require("vm");
const { DATA_JS } = require("./paths");

function loadCafes() {
  const code = fs.readFileSync(DATA_JS, "utf8");
  const sandbox = { globalThis: {} };
  const context = vm.createContext(sandbox);
  const patched = code.replace(/\}\)\(window\);?\s*$/, "})(globalThis);");

  vm.runInContext(patched, context);

  const data = sandbox.globalThis.NIYYAH;
  if (!data || !Array.isArray(data.cafes)) {
    throw new Error(`Could not read cafes from ${DATA_JS}`);
  }

  return data.cafes.map(function (cafe) {
    return {
      id: cafe.id,
      name: cafe.name,
      region: cafe.region,
      market: cafe.market,
      address: cafe.address,
      image: cafe.image
    };
  });
}

module.exports = { loadCafes };
