const SAFE_TOOL_CALL_ID = /^[A-Za-z0-9_-]+$/;
const ENCODED_TOOL_CALL_ID_PREFIX = "encoded_";

function encodeToolCallId(value: string): string {
  let encoded = "";
  for (const char of value) {
    if (/^[A-Za-z0-9-]$/.test(char)) {
      encoded += char;
      continue;
    }

    encoded += `_${char.codePointAt(0)!.toString(16).padStart(2, "0")}_`;
  }
  return `${ENCODED_TOOL_CALL_ID_PREFIX}${encoded}`;
}

export function normalizeToolCallId(value: unknown, fallback = "call_unknown"): string {
  const raw = typeof value === "string" ? value : "";
  if (!raw) {
    return fallback;
  }

  if (SAFE_TOOL_CALL_ID.test(raw) && !raw.startsWith(ENCODED_TOOL_CALL_ID_PREFIX)) {
    return raw;
  }

  return encodeToolCallId(raw);
}
