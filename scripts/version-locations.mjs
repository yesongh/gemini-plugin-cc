export const LOCATIONS = [
  { file: "package.json", path: ["version"] },
  { file: "plugins/gemini/.claude-plugin/plugin.json", path: ["version"] },
  { file: ".claude-plugin/marketplace.json", path: ["metadata", "version"] },
  { file: ".claude-plugin/marketplace.json", path: ["plugins", 0, "version"] },
];
