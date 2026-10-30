/** @type {import("lint-staged").Configuration} */
const config = {
  "*": "prettier --write --ignore-unknown",
  // Each package has its own eslint.config.js; look it up from the file instead of the cwd.
  "{apps,packages}/*/src/**/*.{ts,tsx}": "eslint --flag v10_config_lookup_from_file --fix",
};

export default config;
