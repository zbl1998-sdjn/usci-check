# usci-check

Parse and verify China's 18-character **Unified Social Credit Code** (统一社会信用代码, GB 32100-2015) — offline, zero dependencies, and honest about what a passing check does **not** prove.

Every registered mainland-China entity — companies, sole traders, law firms, NGOs — carries one of these codes on its business licence. The code has internal structure: registration authority, entity category, administrative region, a 9-character subject identifier, and a weighted check character. That means a code copied from a licence photo, a PDF, or a chat message can be checked for transcription errors **with no network access at all**.

```
$ npx usci-check 91330702573980878H

✓ 91330702573980878H — check character passes

Structure:
  Registration authority code                9       — Market regulation (工商)
  Entity category code                       1       — Enterprise (企业)
  Administrative division code               330702  — Registered in Zhejiang.
  Subject identifier (organization code)     573980878
  Check character                            H

This PROVES:
  • The 18 characters are internally consistent, so the code was transcribed correctly.
  • The code is formatted as GB 32100-2015 requires.

This does NOT prove:
  • That the company exists. A correctly formed code can be invented.
  • That the company is still active rather than revoked or deregistered.
  • That its registered business scope covers what you are buying.
  • That it may legally export to you.
  • That the company on this code is the same one issuing your invoice or receiving your payment.
```

## Why the "does NOT prove" block is not optional

Most checkers print "✓ valid" and stop. For this particular code, that manufactures misjudgement: an overseas buyer holding a well-formed code reads "valid" as *"this company is fine"* — and a well-formed code proves nothing of the sort. Anyone can invent a code that passes. So every result from this library carries both `proves` and `doesNotProve`, and the CLI always prints both. If you build on the library, keep them together.

What the structure decode **is** useful for:

- **Catching transcription errors offline.** The check character detects every single-character corruption (property-tested across all 18 positions × 30 substitutions).
- **Spotting sole traders.** A code starting `9-2` is a sole trader (个体工商户) — run by a natural person, different liability and scale than a company. A licence photo won't tell you; the second character will.
- **Sanity-checking the region** against the address you were given (province level only — deliberately, since city/county codes rot with re-districting).

## How we know the transcription is right

The weight table and character set were transcribed from the standard's text, then verified end-to-end against **2,149 real codes** taken from Chinese government PDF disclosures (Ministry of Finance and Shanghai tax authority publications): **100% parse as `ok`**. The check arithmetic works over a 31-character alphabet, so a single wrong weight or a single wrong character in the alphabet would collapse the pass rate to roughly 1/31. Method and data description: [check-digit protection study](https://currawongweb.com/verify/check-digit-protection-study/).

Additionally, the weight table is pinned in tests item-by-item against the standard's formula `Wi = 3^(i-1) mod 31`.

## Library use

```js
import { parseUsci } from "usci-check";

const result = parseUsci(" 9133 0702 5739 8087 8h ");  // whitespace/case tolerated
result.status;         // 'ok' | 'check-failed' | 'bad-length' | 'bad-characters' | 'empty'
result.segments;       // decoded structure with per-segment notes
result.proves;         // always present on parseable codes
result.doesNotProve;   // always present — keep it in your UI
```

Also exported: `checkCharacterFor(first17)`, `normalise(input)`, `provinceFor(divisionCode)`, `authorityFor`, `categoryFor`, and the raw `USCI_CHARSET` / `USCI_WEIGHTS` tables for auditability.

Zero dependencies. Node ≥ 18 (uses `node:test` for tests). Single file — you can also just copy `usci.js` into your project.

```
npm test          # 11 tests, including the full corruption sweep
node cli.mjs 91440300192317458F
```

## What this library deliberately does not do

- **No registry lookups.** Verifying that a company actually exists and is active means checking China's official registry (国家企业信用信息公示系统, gsxt.gov.cn) — a different problem, with its own access hurdles from outside China. There's a free [browser-based checker](https://currawongweb.com/verify/china-usci-checker/) built on this same code, and a study of [official-source reachability from abroad](https://currawongweb.com/verify/china-official-source-availability/).
- **No city/county decoding.** Would rot; see comment in source.
- **No "risk scores".** Registered facts only.

## License

MIT © [Currawong Web](https://currawongweb.com)
