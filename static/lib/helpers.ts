export function escapeHtml(value: any): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatPrice(value: any): string {
  const currencyLocale = "en-IN";

  if (value === null || value === undefined) return "N/A";
  if (typeof value === "number" && !Number.isNaN(value)) {
    return `₹${value.toLocaleString(currencyLocale)}`;
  }
  let str = String(value).trim();
  if (!str) return "N/A";
  if (/₹/.test(str)) return str;
  if (/inr|rupee|rs\.?/i.test(str)) {
    str = str.replace(/inr\s*/i, "₹").replace(/rupees?/i, "₹");
    str = str.replace(/rs\.?/i, "₹");
    if (!/₹/.test(str)) str = `₹${str}`;
    return str;
  }
  if (/[a-zA-Z]/.test(str)) return str;
  const numeric = parseFloat(str.replace(/[^0-9.]/g, ""));
  if (!Number.isNaN(numeric)) {
    return `₹${numeric.toLocaleString(currencyLocale)}`;
  }
  return `₹${str}`;
}

export function formatMessage(text: string): string {
  if (!text) return "";
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(
      /`(.*?)`/g,
      '<code style="background: rgba(0,0,0,0.1); padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>'
    )
    .replace(/•\s/g, "• ")
    .replace(/\n/g, "<br>");

  return html;
}

export function parseTime(timeStr: string): { code: string; time: string } {
  if (!timeStr) return { code: "N/A", time: "" };
  const parts = timeStr.split(" ");
  if (parts.length >= 2) {
    return { code: parts[0], time: parts.slice(1).join(" ") };
  }
  return { code: timeStr, time: "" };
}

export function extractInfo(text: string): Record<string, any> {
  const info: Record<string, any> = {};

  // Helper function to clean city names from prepositions
  const cleanCityName = (name: string): string => {
    if (!name) return "";
    // Remove common prepositions from the beginning and end
    return name
      .replace(/^(from|to|in|at|by)\s+/gi, '')
      .replace(/\s+(from|to|in|at|by)$/gi, '')
      .trim();
  };

  // First try to match "City to City" pattern (cleanest match)
  const routePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/gi;
  const routeMatches = [...text.matchAll(routePattern)];
  if (routeMatches.length > 0) {
    const match = routeMatches[0];
    info.origin = cleanCityName(match[1]);
    info.destination = cleanCityName(match[2]);
  }

  // If no route pattern found, try individual patterns
  if (!info.origin) {
    const fromPattern = /(?:from|leaving|departing|fly\s+from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi;
    const fromMatches = [...text.matchAll(fromPattern)];
    if (fromMatches.length > 0) {
      info.origin = cleanCityName(fromMatches[0][1]);
    }
  }

  if (!info.destination) {
    const toPattern = /(?:to|going\s+to|arriving|fly\s+to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi;
    const toMatches = [...text.matchAll(toPattern)];
    if (toMatches.length > 0) {
      info.destination = cleanCityName(toMatches[0][1]);
    }
  }

  const datePatterns = [
    /(?:on|for|departing|leaving)\s+([A-Z][a-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:\s+\d{4})?)/gi,
    /(\d{1,2}\/\d{1,2}\/\d{4})/g,
    /(\d{4}-\d{2}-\d{2})/g,
  ];

  datePatterns.forEach((pattern) => {
    const matches = [...text.matchAll(pattern)];
    if (matches[0] && !info.departDate) info.departDate = matches[0][1];
    if (matches[1] && !info.returnDate) info.returnDate = matches[1][1];
  });

  const passengerMatch = text.match(
    /(\d+)\s*(?:adults?|people|passengers?|friends?)/i
  );
  if (passengerMatch) info.passengers = parseInt(passengerMatch[1]);

  if (/round\s+trip|return/i.test(text)) info.roundTrip = true;
  if (/one\s+way|single/i.test(text)) info.roundTrip = false;

  return info;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
