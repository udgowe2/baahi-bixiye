// Mengen wie "200 g", "1,5 kg", "2 EL" parsen und addieren.
// Bei nicht zusammenrechenbaren Angaben gibt addAmounts null zurück
// (der Aufrufer hängt sie dann wie bisher mit Komma aneinander).

interface ParsedAmount {
  value: number;
  unit: string;
}

const UNIT_FACTORS: Record<string, { base: string; factor: number }> = {
  g: { base: "g", factor: 1 },
  gr: { base: "g", factor: 1 },
  gramm: { base: "g", factor: 1 },
  kg: { base: "g", factor: 1000 },
  ml: { base: "ml", factor: 1 },
  l: { base: "ml", factor: 1000 },
  liter: { base: "ml", factor: 1000 },
};

export function parseAmount(raw: string): ParsedAmount | null {
  const m = raw.trim().replace(",", ".").match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (!m) return null;
  // Original-Schreibweise der Einheit behalten ("EL" bleibt "EL")
  return { value: parseFloat(m[1]), unit: m[2].trim() };
}

function formatNum(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return String(rounded).replace(".", ",");
}

function formatInBase(total: number, base: string): string {
  if (base === "g" && total >= 1000) return `${formatNum(total / 1000)} kg`;
  if (base === "ml" && total >= 1000) return `${formatNum(total / 1000)} l`;
  return `${formatNum(total)} ${base}`;
}

export function addAmounts(a: string, b: string): string | null {
  if (!a?.trim()) return b || "";
  if (!b?.trim()) return a;

  const pa = parseAmount(a);
  const pb = parseAmount(b);
  if (!pa || !pb) return null;

  const ua = UNIT_FACTORS[pa.unit.toLowerCase()];
  const ub = UNIT_FACTORS[pb.unit.toLowerCase()];

  // Bekannte Einheiten derselben Basis (g/kg bzw. ml/l) umrechnen und addieren
  if (ua && ub && ua.base === ub.base) {
    return formatInBase(pa.value * ua.factor + pb.value * ub.factor, ua.base);
  }

  // Gleiche (auch unbekannte) Einheit: einfach addieren, z.B. "2 EL" + "1 EL"
  if (pa.unit.toLowerCase() === pb.unit.toLowerCase()) {
    const sum = formatNum(pa.value + pb.value);
    return pa.unit ? `${sum} ${pa.unit}` : sum;
  }

  return null;
}
