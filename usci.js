// usci-check — parse and verify China's 18-character Unified Social Credit Code (USCI),
// offline, zero dependencies.
//
// Every registered mainland-China entity — companies, sole traders, law firms, NGOs —
// carries one of these codes on its business licence. The code has internal structure
// (registration authority, entity category, region, check character per GB 32100-2015),
// which means a code copied from a licence photo or a PDF can be checked for
// transcription errors with no network access at all.
//
// Design rule this library enforces: results ALWAYS carry both `proves` and
// `doesNotProve`. A checker that only says "valid" manufactures misjudgement —
// a buyer holding a well-formed code will read "valid" as "this company is fine",
// and a well-formed code proves nothing of the sort.
//
// Algorithm source: GB 32100-2015. The weight table and character set were
// transcribed from the standard's text and then verified end-to-end against
// 2,149 real codes published in Chinese government PDF disclosures — 100% passed.
// A single wrong weight would collapse that pass rate to roughly 1/31.
// Method and evidence: https://currawongweb.com/verify/check-digit-protection-study/

const CHARSET = '0123456789ABCDEFGHJKLMNPQRTUWXY';

// Wi = 3^(i-1) mod 31 for i = 1..17. Written as literals rather than computed at
// runtime so the table itself can be tested item-by-item against the standard.
const WEIGHTS = [1, 3, 9, 27, 19, 26, 16, 17, 20, 29, 25, 13, 8, 24, 10, 30, 28];

// Character 1 = registration authority, character 2 = entity category; both tables
// come from GB 32100-2015. Why decode them: the single most common misread by
// overseas buyers is taking a sole trader for a company. A code starting 9-2 is a
// sole trader (个体工商户) — run by a natural person, with different liability and
// scale than a company. A licence photo won't tell you; the second character will.
// The Chinese originals are included so a buyer can compare them against the licence.
//
// Deliberately NOT inferred here: export eligibility. Entity type does not decide
// whether a business may export (China's Foreign Trade Law was amended in 2004 to
// include individuals, and the exporter-registration requirement was abolished
// end of 2022). Binding the two together is an outdated claim.
const AUTHORITIES = {
  1: { en: 'Central staffing authority', zh: '机构编制',
       categories: { 1: ['Government agency', '机关'], 2: ['Public institution', '事业单位'],
                     3: ['Directly administered mass organisation', '编办直接管理机构编制的群众团体'],
                     9: ['Other', '其他'] } },
  2: { en: 'Foreign affairs', zh: '外交',
       categories: { 1: ['Resident foreign news bureau', '外国常驻新闻机构'], 9: ['Other', '其他'] } },
  3: { en: 'Judicial administration', zh: '司法行政',
       categories: { 1: ['Law firm', '律师执业机构'], 2: ['Notary office', '公证处'],
                     3: ['Basic-level legal service office', '基层法律服务所'],
                     4: ['Forensic appraisal institution', '司法鉴定机构'],
                     5: ['Arbitration commission', '仲裁委员会'], 9: ['Other', '其他'] } },
  4: { en: 'Culture', zh: '文化',
       categories: { 1: ['Foreign cultural centre in China', '外国在华文化中心'], 9: ['Other', '其他'] } },
  5: { en: 'Civil affairs', zh: '民政',
       categories: { 1: ['Social organisation', '社会团体'], 2: ['Private non-enterprise unit', '民办非企业单位'],
                     3: ['Foundation', '基金会'], 9: ['Other', '其他'] } },
  6: { en: 'Tourism', zh: '旅游',
       categories: { 1: ['Resident office of a foreign tourism authority', '外国旅游部门常驻代表机构'],
                     2: ['Resident mainland office of an HK/Macau/Taiwan tourism authority', '港澳台地区旅游部门常驻内地代表机构'],
                     9: ['Other', '其他'] } },
  7: { en: 'Religious affairs', zh: '宗教',
       categories: { 1: ['Religious venue', '宗教活动场所'], 2: ['Religious school', '宗教院校'], 9: ['Other', '其他'] } },
  8: { en: 'Trade union', zh: '工会',
       categories: { 1: ['Grassroots trade union', '基层工会'], 9: ['Other', '其他'] } },
  // 标准原文写「工商」；该职能现由市场监管部门（SAMR）承担，机构名称已变，代码未变。
  9: { en: 'Market regulation', zh: '工商',
       categories: { 1: ['Enterprise', '企业'],
                     2: ['Individually-owned business', '个体工商户'],
                     3: ['Farmers specialised cooperative', '农民专业合作社'] } },
  A: { en: 'CMC reform and staffing office', zh: '中央军委改革和编制办公室',
       categories: { 1: ['Military public institution', '军队事业单位'], 9: ['Other', '其他'] } },
  N: { en: 'Agriculture', zh: '农业',
       categories: { 1: ['Group-level collective economic organisation', '组级集体经济组织'],
                     2: ['Village-level collective economic organisation', '村级集体经济组织'],
                     3: ['Township-level collective economic organisation', '乡镇级集体经济组织'],
                     9: ['Other', '其他'] } },
  Y: { en: 'Other', zh: '其他', categories: { 1: ['Other', '其他'] } }
};

export function authorityFor(code) {
  const a = AUTHORITIES[String(code ?? '').slice(0, 1)];
  return a ? { en: a.en, zh: a.zh } : null;
}

export function categoryFor(authorityCode, categoryCode) {
  const a = AUTHORITIES[String(authorityCode ?? '')];
  const c = a?.categories?.[String(categoryCode ?? '')];
  if (!c) return null;
  return {
    en: c[0],
    zh: c[1],
    // 这一条是给买家的实际判断，不是分类学 —— 个体工商户与企业的差别决定了
    // 你在跟什么样的对手方做生意。
    isIndividualBusiness: String(authorityCode) === '9' && String(categoryCode) === '2'
  };
}

// Characters 3-8 are a GB/T 2260 administrative division code; the first two digits
// give the province. Why decode only to province level: city/county codes change with
// re-districting (mergers, renames), so an embedded copy rots into wrong answers;
// province codes have been stable for decades and can be verified line by line.
// A stale city name is worse than none — buyers would check it against an address.
const PROVINCE_CODES = {
  11: 'Beijing', 12: 'Tianjin', 13: 'Hebei', 14: 'Shanxi', 15: 'Inner Mongolia',
  21: 'Liaoning', 22: 'Jilin', 23: 'Heilongjiang',
  31: 'Shanghai', 32: 'Jiangsu', 33: 'Zhejiang', 34: 'Anhui', 35: 'Fujian',
  36: 'Jiangxi', 37: 'Shandong',
  41: 'Henan', 42: 'Hubei', 43: 'Hunan', 44: 'Guangdong', 45: 'Guangxi', 46: 'Hainan',
  50: 'Chongqing', 51: 'Sichuan', 52: 'Guizhou', 53: 'Yunnan', 54: 'Tibet',
  61: 'Shaanxi', 62: 'Gansu', 63: 'Qinghai', 64: 'Ningxia', 65: 'Xinjiang'
};

// Taiwan (71), Hong Kong (81) and Macau (82) have GB/T 2260 codes but are not
// registered by SAMR, so they never appear in a mainland business licence USCI.
// Seeing one means the code is wrong.
const NON_MAINLAND_PREFIXES = { 71: 'Taiwan', 81: 'Hong Kong SAR', 82: 'Macau SAR' };

export function provinceFor(divisionCode) {
  const prefix = String(divisionCode ?? '').slice(0, 2);
  if (PROVINCE_CODES[prefix]) {
    return { province: PROVINCE_CODES[prefix], mainland: true };
  }
  if (NON_MAINLAND_PREFIXES[prefix]) {
    return { province: NON_MAINLAND_PREFIXES[prefix], mainland: false };
  }
  return null;
}

const SEGMENTS = [
  { key: 'registrationAuthority', start: 0, end: 1, label: 'Registration authority code' },
  { key: 'entityCategory', start: 1, end: 2, label: 'Entity category code' },
  { key: 'administrativeDivision', start: 2, end: 8, label: 'Administrative division code' },
  { key: 'subjectIdentifier', start: 8, end: 17, label: 'Subject identifier (organization code)' },
  { key: 'checkCharacter', start: 17, end: 18, label: 'Check character' }
];

// Tolerate case and whitespace: codes copied from PDFs or licence photos routinely
// carry spaces and lowercase; those are not format errors.
export function normalise(input) {
  return String(input ?? '').replace(/[\s　-]/g, '').toUpperCase();
}

export function checkCharacterFor(first17) {
  if (first17.length !== 17) return null;
  let sum = 0;
  for (let i = 0; i < 17; i += 1) {
    const value = CHARSET.indexOf(first17[i]);
    if (value < 0) return null;
    sum += value * WEIGHTS[i];
  }
  // C18 = 31 - (sum mod 31); a result of 31 maps to 0. The outer mod covers both.
  return CHARSET[(31 - (sum % 31)) % 31];
}

export function parseUsci(input) {
  const code = normalise(input);

  if (code.length === 0) {
    return { status: 'empty', code, message: 'Enter an 18-character code.' };
  }
  if (code.length !== 18) {
    return {
      status: 'bad-length',
      code,
      message: `A unified social credit code is 18 characters. This one has ${code.length}.`
    };
  }

  const illegal = [...code].filter((c) => CHARSET.indexOf(c) < 0);
  if (illegal.length > 0) {
    // I/O/Z/S/V are explicitly excluded by the standard and are the most common
    // transcription slips — a targeted hint beats a generic error.
    const excluded = illegal.filter((c) => 'IOZSV'.includes(c));
    return {
      status: 'bad-characters',
      code,
      illegal: [...new Set(illegal)],
      message: excluded.length
        ? `Contains ${[...new Set(excluded)].join(', ')}. GB 32100-2015 excludes I, O, Z, S and V, so these are usually transcription errors.`
        : `Contains characters outside the permitted set: ${[...new Set(illegal)].join(', ')}.`
    };
  }

  const expected = checkCharacterFor(code.slice(0, 17));
  const actual = code[17];
  const authority = authorityFor(code[0]);
  const category = categoryFor(code[0], code[1]);

  const segments = SEGMENTS.map((s) => {
    const value = code.slice(s.start, s.end);

    if (s.key === 'registrationAuthority') {
      return { ...s, value, note: authority ? `${authority.en} (${authority.zh})` : null };
    }
    if (s.key === 'entityCategory') {
      return { ...s, value, note: category ? `${category.en} (${category.zh})` : null };
    }
    if (s.key !== 'administrativeDivision') return { ...s, value };

    const region = provinceFor(value);
    return {
      ...s,
      value,
      // A note appears only when the province resolves. Failing to resolve is not an
      // error — the prefix may be one we don't carry, or the code may be wrong, and
      // this layer cannot tell those apart, so it passes no judgement.
      note: region
        ? region.mainland
          ? `Registered in ${region.province}.`
          : `Prefix maps to ${region.province}, which is not registered by SAMR — a mainland business licence would not carry it.`
        : null
    };
  });

  if (expected !== actual) {
    return {
      status: 'check-failed',
      code,
      segments,
      expectedCheckCharacter: expected,
      actualCheckCharacter: actual,
      message: `Check character should be ${expected}, not ${actual}. The code was mistyped or altered.`,
      proves: [],
      doesNotProve: DOES_NOT_PROVE
    };
  }

  return {
    status: 'ok',
    code,
    segments,
    checkCharacter: actual,
    // Deliberately "transcribed correctly", never "valid" — "valid" gets read as
    // "this company is fine", which the check cannot establish.
    proves: [
      'The 18 characters are internally consistent, so the code was transcribed correctly.',
      'The code is formatted as GB 32100-2015 requires.'
    ],
    doesNotProve: DOES_NOT_PROVE
  };
}

// These five lines are the reason this library exists. No caller may omit them.
const DOES_NOT_PROVE = [
  'That the company exists. A correctly formed code can be invented.',
  'That the company is still active rather than revoked or deregistered.',
  'That its registered business scope covers what you are buying.',
  // Only what is certain is stated: this information simply is not encoded here.
  'That it may legally export to you. Export eligibility turns on the registered scope and customs registration, neither of which is encoded here.',
  'That the company on this code is the same one issuing your invoice or receiving your payment.'
];

export const USCI_CHARSET = CHARSET;
export const USCI_WEIGHTS = WEIGHTS;
