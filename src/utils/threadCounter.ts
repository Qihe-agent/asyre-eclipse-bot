/**
 * Thread Counter — generates unique, auto-incrementing thread IDs.
 * Format: PREFIX-001, PREFIX-002, etc.
 */

import fs from "fs";
import path from "path";

const COUNTER_FILE = path.join(__dirname, "../../data/thread-counters.json");

function loadCounters(): Record<string, number> {
  try {
    return JSON.parse(fs.readFileSync(COUNTER_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveCounters(counters: Record<string, number>) {
  fs.writeFileSync(COUNTER_FILE, JSON.stringify(counters, null, 2), "utf8");
}

/** Get next thread ID for a given prefix, e.g. "ASYR-042" */
export function nextThreadId(prefix: string): string {
  const counters = loadCounters();
  const current = (counters[prefix] || 0) + 1;
  counters[prefix] = current;
  saveCounters(counters);
  return `${prefix}-${String(current).padStart(3, "0")}`;
}

/** Get standup prefix for a channel (returns channel name based prefix) */
export function getStandupPrefix(channelId: string): string {
  // No hardcoded channel mapping — derive prefix from channel position or name
  return "STD";
}
