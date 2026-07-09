// Coerce a wire value to a finite number.
//
// The Flask backend serializes MySQL DECIMAL columns (fees, balances, totals,
// prices) as JSON *strings*, not numbers. Pushing those straight into
// arithmetic silently breaks two ways: `+` concatenates ("0" + "180" -> "0180")
// and can then throw on `.toFixed()`, while `*`/`-` coerce but hide the type
// mismatch. This is the root cause behind the reports `$NaN` and the cashier
// total bugs. Every numeric field crossing the API boundary should pass through
// here so the render layer can trust the shape.
export function toNumber(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
