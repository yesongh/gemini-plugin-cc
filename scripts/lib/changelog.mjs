export function extractLatest(changelogText) {
  const match = changelogText.match(/(## \[[^\n]*\n[\s\S]*?)(?=\n## \[|\s*$)/);
  return match ? match[1].trim() : null;
}

export function prependEntry(existingText, entry) {
  const header = "# Changelog\n\n";
  const body = existingText
    ? existingText.replace(/^# Changelog\s*\n+/, "")
    : "";
  return `${header}${entry}\n\n${body}`.replace(/\n{3,}/g, "\n\n");
}
