/**
 * Formats a raw status enum string into a human-readable format.
 * e.g., 'IN_PROGRESS' -> 'In Progress'
 */
export function formatStatus(status: string): string {
  if (!status) return "";
  
  if (status === "IN_PROGRESS") {
    return "In Progress";
  }
  
  // Title case mapping: 'OPEN' -> 'Open', 'DONE' -> 'Done'
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

/**
 * Truncates a description string if it exceeds the max character threshold.
 */
export function truncateDescription(text: string, maxChars: number = 120): string {
  if (!text) return "";
  if (text.length <= maxChars) return text;
  
  return text.slice(0, maxChars).trim() + "...";
}
