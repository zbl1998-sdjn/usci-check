// Tests pin three different kinds of correctness:
//  1. the weight table matches the standard's formula (catches transcription errors),
//  2. real published codes pass (catches systematic errors the formula check can't),
//  3. the check character actually catches damage (single-character corruption).
import assert from "node:assert/strict";
import test from "node:test";

import { checkCharacterFor, normalise, parseUsci, provinceFor, USCI_CHARSET, USCI_WEIGHTS } from "../usci.js";

test("weight table matches Wi = 3^(i-1) mod 31, item by item", () => {
  for (let i = 0; i < 17; i += 1) {
    assert.equal(USCI_WEIGHTS[i], 3 ** i % 31, `weight ${i + 1} drifted from the standard`);
  }
});

test("character set is the standard's 31 characters — I, O, Z, S, V excluded", () => {
  assert.equal(USCI_CHARSET.length, 31);
  for (const excluded of "IOZSV") assert.ok(!USCI_CHARSET.includes(excluded));
});

// Real codes from public registry disclosures (these are public record, printed on
// licences and quoted in government publications):
//   BYD Company Limited, Jinhua Sigma Industrial & Trading Co.
const REAL_CODES = ["91440300192317458F", "91330702573980878H"];

test("real published codes pass end to end", () => {
  for (const code of REAL_CODES) {
    const result = parseUsci(code);
    assert.equal(result.status, "ok", `${code} should pass`);
    assert.ok(result.proves.length >= 2);
    assert.ok(result.doesNotProve.length === 5, "the five doesNotProve lines are mandatory");
  }
});

test("single-character corruption is always caught", () => {
  const code = REAL_CODES[0];
  // Flip each of the 18 positions to a different charset character; every variant
  // must fail the check. This is the property that makes the check digit useful
  // for codes copied from licence photos.
  for (let position = 0; position < 18; position += 1) {
    for (const replacement of USCI_CHARSET) {
      if (replacement === code[position]) continue;
      const damaged = code.slice(0, position) + replacement + code.slice(position + 1);
      const result = parseUsci(damaged);
      assert.notEqual(result.status, "ok", `corruption at position ${position} (${replacement}) slipped through`);
    }
  }
});

test("check-failed result names the expected character and keeps doesNotProve", () => {
  const result = parseUsci("91440300192317458X");
  assert.equal(result.status, "check-failed");
  assert.equal(result.expectedCheckCharacter, "F");
  assert.equal(result.actualCheckCharacter, "X");
  assert.equal(result.doesNotProve.length, 5);
});

test("normalisation: spaces, full-width blanks and lowercase are not errors", () => {
  assert.equal(normalise(" 9144 0300 1923 1745 8f "), "91440300192317458F");
  assert.equal(parseUsci("9144 0300 1923 1745 8f").status, "ok");
});

test("excluded characters get the targeted transcription hint", () => {
  const result = parseUsci("91440300192317458O".replace("F", "O"));
  assert.equal(result.status, "bad-characters");
  assert.match(result.message, /excludes I, O, Z, S and V/u);
});

test("length errors say how many characters were given", () => {
  const result = parseUsci("914403001923");
  assert.equal(result.status, "bad-length");
  assert.match(result.message, /12/u);
});

test("structure decodes: authority, category, province", () => {
  const result = parseUsci("91440300192317458F");
  const notes = Object.fromEntries(result.segments.map((s) => [s.key, s.note ?? ""]));
  assert.match(notes.registrationAuthority, /Market regulation/u);
  assert.match(notes.entityCategory, /Enterprise/u);
  assert.match(notes.administrativeDivision, /Guangdong/u);
});

test("non-mainland division prefixes are flagged, not decoded as provinces", () => {
  assert.equal(provinceFor("810000").mainland, false);
  assert.equal(provinceFor("440300").mainland, true);
  assert.equal(provinceFor("990000"), null);
});

test("checkCharacterFor rejects malformed input instead of guessing", () => {
  assert.equal(checkCharacterFor("too-short"), null);
  assert.equal(checkCharacterFor("9144030019231745IO"), null);
});
