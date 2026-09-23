// ─────────────────────────────────────────────────────────────────────────────
// Parcel label parser
// Takes raw OCR text and extracts structured fields using regex + heuristics.
// Returns empty string for any field that cannot be confidently identified.
// ─────────────────────────────────────────────────────────────────────────────

export interface ParsedParcel {
  trackingId:   string;
  customerName: string;
  mobileNumber: string;
  address:      string;
}

// ── Tracking / AWB patterns ──────────────────────────────────────────────────
const TRACKING_PATTERNS = [
  /\b(1Z[A-Z0-9]{16})\b/,                          // UPS
  /\b(\d{12,14})\b/,                                // FedEx / DHL numeric
  /\b([A-Z]{2}\d{9}[A-Z]{2})\b/,                   // Universal postal
  /\b([A-Z]{1,3}[-\s]?\d{6,12}[-\s]?[A-Z0-9]*)\b/,// Generic AWB
  /(?:tracking|awb|shipment|parcel|order|id|no\.?)\s*[:#]?\s*([A-Z0-9\-]{6,30})/i,
  /#([A-Z0-9\-]{6,25})\b/,
];

// ── Phone patterns ───────────────────────────────────────────────────────────
const PHONE_PATTERNS = [
  /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
  /(?:\+\d{1,3}\s?)?\d{10}/,
  /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/,
];

// ── Address indicator keywords ───────────────────────────────────────────────
const ADDRESS_KEYWORDS = [
  'street','st','avenue','ave','road','rd','blvd','boulevard',
  'lane','ln','drive','dr','court','ct','place','pl','way',
  'floor','fl','suite','ste','apt','apartment','unit',
  'building','bldg','sector','block','nagar','colony','district',
  'city','state','zip','postal','pin','po box',
];

// ── Name label keywords (lines before the actual name) ──────────────────────
const NAME_LABELS = [
  'to:','recipient:','deliver to:','customer:','consignee:',
  'name:','attn:','attention:','addressee:',
];

// ─────────────────────────────────────────────────────────────────────────────

function cleanLine(line: string) {
  return line.replace(/\s+/g, ' ').trim();
}

function extractTrackingId(text: string): string {
  for (const pattern of TRACKING_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const candidate = (match[1] ?? match[0]).trim().replace(/\s+/g, '');
      if (candidate.length >= 6) return candidate;
    }
  }
  return '';
}

function extractMobileNumber(text: string): string {
  for (const pattern of PHONE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  return '';
}

function extractCustomerName(lines: string[]): string {
  // Strategy 1: look for a label keyword then take the next non-empty line
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (NAME_LABELS.some(label => lower.startsWith(label) || lower.includes(label))) {
      // Name may be on same line after the colon
      const afterColon = lines[i].split(':').slice(1).join(':').trim();
      if (afterColon && afterColon.length > 1 && !/\d{4,}/.test(afterColon)) {
        return afterColon;
      }
      // Or on the next line
      for (let j = i + 1; j < lines.length && j <= i + 2; j++) {
        const candidate = cleanLine(lines[j]);
        if (candidate && candidate.length > 1 && !/\d{4,}/.test(candidate)) {
          return candidate;
        }
      }
    }
  }

  // Strategy 2: find a line that looks like a proper name (2–4 capitalised words,
  // no digits, not a known label)
  const nameRegex = /^[A-Z][a-z]+(?:\s[A-Z][a-z]+){1,3}$/;
  for (const line of lines) {
    const cleaned = cleanLine(line);
    if (
      nameRegex.test(cleaned) &&
      !ADDRESS_KEYWORDS.some(kw => cleaned.toLowerCase().includes(kw)) &&
      cleaned.split(' ').length <= 4
    ) {
      return cleaned;
    }
  }
  return '';
}

function extractAddress(lines: string[]): string {
  const addressLines: string[] = [];
  let capturing = false;

  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    const cleaned = cleanLine(lines[i]);
    if (!cleaned) continue;

    const hasAddressKw = ADDRESS_KEYWORDS.some(kw => lower.includes(kw));
    const hasNumber    = /\d/.test(cleaned);
    const looksLikeAddress = hasAddressKw || (hasNumber && cleaned.length > 6 && capturing);

    if (looksLikeAddress && !capturing) {
      capturing = true;
    }

    if (capturing) {
      addressLines.push(cleaned);
      // Stop after collecting 4 lines or hitting a clearly non-address line
      if (addressLines.length >= 4) break;
      const nextLine = lines[i + 1] ? cleanLine(lines[i + 1]) : '';
      if (nextLine && !ADDRESS_KEYWORDS.some(kw => nextLine.toLowerCase().includes(kw)) && !/\d/.test(nextLine) && addressLines.length >= 2) {
        break;
      }
    }
  }

  if (addressLines.length === 0) {
    // Fallback: return any line with both a number and an address keyword
    for (const line of lines) {
      const cleaned = cleanLine(line);
      if (/\d/.test(cleaned) && ADDRESS_KEYWORDS.some(kw => cleaned.toLowerCase().includes(kw))) {
        return cleaned;
      }
    }
  }

  return addressLines.join(', ');
}

// ─────────────────────────────────────────────────────────────────────────────

export function parseParcelText(rawText: string): ParsedParcel {
  const lines = rawText
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const trackingId   = extractTrackingId(rawText);
  const mobileNumber = extractMobileNumber(rawText);
  const customerName = extractCustomerName(lines);
  const address      = extractAddress(lines);

  return { trackingId, customerName, mobileNumber, address };
}
