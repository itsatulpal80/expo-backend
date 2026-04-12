function extractJsonFromText(text) {
  if (!text) return null;

  const cleaned = text.trim();
  try {
    return JSON.parse(cleaned);
  } catch (_) {}

  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch (_) {}
  }

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const maybeJson = cleaned.slice(start, end + 1);
    try {
      return JSON.parse(maybeJson);
    } catch (_) {}
  }

  return null;
}

module.exports = { extractJsonFromText };
