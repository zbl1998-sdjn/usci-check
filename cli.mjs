#!/usr/bin/env node
// CLI: node cli.mjs 91330702573980878H   (or: npx usci-check <code>)
// Prints the parse result, and ALWAYS prints both proves and doesNotProve —
// the whole point of this tool is that a bare "valid" manufactures misjudgement.
import { parseUsci } from "./usci.js";

const input = process.argv.slice(2).join(" ").trim();
if (!input) {
  console.error("Usage: usci-check <18-character code>");
  console.error("Example: usci-check 91330702573980878H");
  process.exit(2);
}

const result = parseUsci(input);

if (result.status !== "ok") {
  console.log(`✗ ${result.status}`);
  if (result.message) console.log(`  ${result.message}`);
  if (result.segments) {
    console.log("\nStructure (as far as it parses):");
    for (const s of result.segments) {
      console.log(`  ${s.label.padEnd(42)} ${s.value}${s.note ? `  — ${s.note}` : ""}`);
    }
  }
  process.exit(1);
}

console.log(`✓ ${result.code} — check character passes`);
console.log("\nStructure:");
for (const s of result.segments) {
  console.log(`  ${s.label.padEnd(42)} ${s.value}${s.note ? `  — ${s.note}` : ""}`);
}
console.log("\nThis PROVES:");
for (const line of result.proves) console.log(`  • ${line}`);
console.log("\nThis does NOT prove:");
for (const line of result.doesNotProve) console.log(`  • ${line}`);
