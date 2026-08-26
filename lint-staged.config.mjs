const lintStagedConfig = {
  "*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}": [
    "oxlint --fix --report-unused-disable-directives",
    "prettier --write",
  ],
  "*.{css,scss,json,jsonc,md,mdx,yaml,yml}": "prettier --write",
};

export default lintStagedConfig;
