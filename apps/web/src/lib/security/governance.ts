/**
 * ═══════════════════════════════════════════════════════════════
 *  SUPREME IDENTITY GOVERNANCE ENGINE v5.0 — HOSTILE MODE
 *  12-Layer Username Security Pipeline
 *  Designed for adversarial environments with active bot threats
 * ═══════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────
// LAYER 0 — HARD NORMALIZATION
// ─────────────────────────────────────────────

/** Full homoglyph + Unicode → ASCII map */
const HOMOGLYPH_MAP: Record<string, string> = {
  // Cyrillic lookalikes
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'u', 'х': 'x',
  'В': 'b', 'Е': 'e', 'К': 'k', 'М': 'm', 'Н': 'h', 'О': 'o', 'Р': 'p', 'С': 'c', 'Т': 't', 'У': 'u', 'Х': 'x',
  // Greek lookalikes
  'α': 'a', 'β': 'b', 'γ': 'y', 'δ': 'd', 'ε': 'e', 'ζ': 'z', 'η': 'n', 'θ': 'o', 'ι': 'i', 'κ': 'k',
  'λ': 'l', 'μ': 'u', 'ν': 'v', 'ξ': 'e', 'ο': 'o', 'π': 'p', 'ρ': 'p', 'σ': 's', 'τ': 't', 'υ': 'u', 'φ': 'o', 'χ': 'x', 'ψ': 'w', 'ω': 'w',
  // Latin extended
  'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a', 'æ': 'ae', 'ç': 'c', 'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
  'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i', 'ð': 'd', 'ñ': 'n', 'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'ø': 'o',
  'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u', 'ý': 'y', 'þ': 'th', 'ÿ': 'y',
  // Leet speak
  '0': 'o', '1': 'l', '3': 'e', '4': 'a', '5': 's', '6': 'g', '7': 't', '8': 'b', '9': 'g',
  '@': 'a', '$': 's', '!': 'i', '|': 'l', '+': 't', '(': 'c', ')': 'o',
  // Invisible/zero-width (map to empty to detect later)
  '\u200b': '', '\u200c': '', '\u200d': '', '\u2060': '', '\ufeff': ''
};

const LEET_MAP: Record<string, string> = {
  '0': 'o', '1': 'l', '3': 'e', '4': 'a', '5': 's', '6': 'g', '7': 't', '8': 'b', '9': 'g',
  '@': 'a', '$': 's', '!': 'i', '+': 't', '|': 'l'
};

function collapseRepeatedLetters(str: string): string {
  return str.replace(/(.)\1{2,}/g, '$1$1');
}

function applyHomoglyphs(str: string): string {
  return str.split('').map(c => HOMOGLYPH_MAP[c] ?? c).join('');
}

function applyLeet(str: string): string {
  return str.split('').map(c => LEET_MAP[c] ?? c).join('');
}

/** Master normalization — runs all transforms in strict order */
export function normalizeUsername(raw: string): string {
  let n = raw;
  n = n.toLowerCase();
  n = applyHomoglyphs(n);   // unicode → ascii FIRST
  n = applyLeet(n);          // leet after homoglyph
  n = n.replace(/[\s._\-!@#$%^&*()+=[\]{};':"\\|,<>?\/`~]/g, ''); // strip symbols
  n = n.replace(/[^a-z0-9]/g, '');  // strip remaining non-alphanumeric
  n = collapseRepeatedLetters(n);   // gooogle → gogle → google check
  return n;
}

// ─────────────────────────────────────────────
// LAYER 1 — UNICODE & SCRIPT CONTAMINATION
// ─────────────────────────────────────────────

function detectScriptMixing(raw: string): boolean {
  const hasLatin = /[a-zA-Z]/.test(raw);
  const hasCyrillic = /[\u0400-\u04FF]/.test(raw);
  const hasGreek = /[\u0370-\u03FF]/.test(raw);
  const hasArabic = /[\u0600-\u06FF]/.test(raw);
  const hasCJK = /[\u4E00-\u9FFF]/.test(raw);
  const hasInvisible = /[\u200b\u200c\u200d\u2060\ufeff]/.test(raw);

  const scriptCount = [hasLatin, hasCyrillic, hasGreek, hasArabic, hasCJK].filter(Boolean).length;
  return scriptCount > 1 || hasInvisible;
}

// ─────────────────────────────────────────────
// LAYER 2 — ABSOLUTE BLOCKLIST CORE
// ─────────────────────────────────────────────

const BLOCKED_CORE = new Set([
  // ── Platform / System ──────────────────────
  'admin', 'administrator', 'root', 'system', 'support', 'team', 'staff', 'official',
  'moderator', 'mod', 'help', 'billing', 'legal', 'privacy', 'dev', 'developer',
  'security', 'compliance', 'core', 'main', 'engine', 'network', 'internal', 'guest',
  'verify', 'verified', 'bot', 'master', 'slave', 'api', 'test', 'demo', 'callback',
  'webhook', 'proxy', 'gateway', 'server', 'client', 'manager', 'ceo', 'cto', 'coo',
  'cfo', 'founder', 'cofounder', 'owner', 'director', 'executive', 'vp', 'president',
  'verlyn', 'shincore',

  // ── Tech / Social Titans ──────────────────
  'google', 'microsoft', 'apple', 'amazon', 'facebook', 'instagram', 'whatsapp', 'meta',
  'tiktok', 'netflix', 'disney', 'sony', 'samsung', 'tesla', 'spacex', 'twitter', 'linkedin',
  'github', 'gitlab', 'oracle', 'adobe', 'intel', 'nvidia', 'amd', 'ibm', 'cisco',
  'salesforce', 'shopify', 'stripe', 'paypal', 'visa', 'mastercard', 'amex', 'youtube',
  'gmail', 'protonmail', 'icloud', 'outlook', 'spotify', 'discord', 'telegram', 'signal',
  'snapchat', 'reddit', 'quora', 'tumblr', 'medium', 'substack', 'roblox', 'epicgames',
  'valve', 'steam', 'twitch', 'zoom', 'slack', 'notion', 'figma', 'canva', 'dropbox',
  'atlassian', 'jira', 'confluence', 'wordpress', 'cloudflare', 'aws', 'azure', 'gcp',
  'heroku', 'vercel', 'netlify', 'openai', 'chatgpt', 'gemini', 'anthropic', 'claude',
  'llama', 'deepseek', 'perplexity', 'copilot', 'midjourney', 'dalle', 'stability',
  'huggingface', 'pytorch', 'tensorflow', 'databricks', 'snowflake', 'palantir',

  // ── Finance / Crypto ──────────────────────
  'bank', 'banking', 'crypto', 'coin', 'exchange', 'wallet', 'token', 'defi', 'nft',
  'bitcoin', 'ethereum', 'solana', 'tether', 'usdc', 'usdt', 'bnb', 'xrp', 'cardano',
  'dogecoin', 'shiba', 'litecoin', 'polkadot', 'avalanche', 'chainlink', 'uniswap',
  'binance', 'coinbase', 'kraken', 'kucoin', 'bybit', 'huobi', 'okx', 'gateio', 'bitmex',
  'metamask', 'ledger', 'trezor', 'blockchain', 'defi', 'dao', 'dex', 'cex', 'yield',
  'jpmorgan', 'goldmansachs', 'morganstanley', 'berkshire', 'blackrock', 'vanguard',
  'fidelity', 'citibank', 'bankofamerica', 'hsbc', 'barclays', 'deutschebank', 'ubs',
  'creditsuisse', 'wellsfargo', 'capitalone', 'charlesschwab', 'robinhood', 'etrade',

  // ── Auto / Luxury ────────────────────────
  'toyota', 'mercedes', 'bmw', 'audi', 'ferrari', 'porsche', 'lamborghini', 'mclaren',
  'bentley', 'rollsroyce', 'bugatti', 'astonmartin', 'jaguar', 'landrover', 'tesla',
  'honda', 'nissan', 'hyundai', 'kia', 'volkswagen', 'volvo', 'ford', 'chevrolet',
  'jeep', 'dodge', 'chrysler', 'gmc', 'cadillac', 'lincoln', 'maserati', 'lexus', 'infiniti',

  // ── Fashion / Consumer ────────────────────
  'nike', 'adidas', 'puma', 'reebok', 'underarmour', 'newbalance', 'gucci', 'louisvuitton',
  'prada', 'chanel', 'hermes', 'burberry', 'versace', 'armani', 'dior', 'balenciaga',
  'ysl', 'fendi', 'givenchy', 'valentino', 'zara', 'hm', 'uniqlo', 'forever21', 'gap',
  'walmart', 'costco', 'target', 'ebay', 'alibaba', 'aliexpress', 'shein', 'temu',

  // ── Media / Entertainment ─────────────────
  'bbc', 'cnn', 'fox', 'foxnews', 'nbc', 'abc', 'cbs', 'msnbc', 'nytimes', 'theguardian',
  'reuters', 'apnews', 'bloomberg', 'forbes', 'fortune', 'wsj', 'washingtonpost',
  'espn', 'hbo', 'paramount', 'universal', 'columbia', 'warner', 'warnerbros', 'lionsgate',
  'dreamworks', 'pixar', 'marvel', 'dc', 'lucasfilm', 'starwars', 'nationalgeographic',

  // ── Adult / Sanctioned ────────────────────
  'pornhub', 'xhamster', 'xvideos', 'xnxx', 'stripchat', 'chaturbate', 'onlyfans',
  'brazzers', 'redtube', 'youporn', 'beeg', 'spankbang', 'livejasmin', 'camsoda',

  // ── Gov / Authority ───────────────────────
  'government', 'gov', 'police', 'fbi', 'cia', 'nsa', 'dhs', 'doj', 'irs', 'sec',
  'mi6', 'mi5', 'gchq', 'mossad', 'interpol', 'nato', 'un', 'unicef', 'who', 'imf',
  'worldbank', 'wto', 'eu', 'europol', 'europeanunion', 'whitehouse', 'pentagon',
  'kremlin', 'bundestag', 'downingstreet', 'elysee', 'army', 'navy', 'airforce',
  'military', 'marines', 'seal', 'delta', 'swat', 'cia', 'fbi', 'dea', 'atf',

  // ── All Countries ────────────────────────
  'afghanistan', 'albania', 'algeria', 'andorra', 'angola', 'argentina', 'armenia',
  'australia', 'austria', 'azerbaijan', 'bahamas', 'bahrain', 'bangladesh', 'barbados',
  'belarus', 'belgium', 'belize', 'benin', 'bhutan', 'bolivia', 'bosnia', 'botswana',
  'brazil', 'brunei', 'bulgaria', 'burkina', 'burundi', 'cambodia', 'cameroon',
  'canada', 'chad', 'chile', 'china', 'colombia', 'comoros', 'congo', 'croatia',
  'cuba', 'cyprus', 'czechia', 'denmark', 'djibouti', 'dominica', 'ecuador', 'egypt',
  'eritrea', 'estonia', 'ethiopia', 'fiji', 'finland', 'france', 'gabon', 'gambia',
  'georgia', 'germany', 'ghana', 'greece', 'grenada', 'guatemala', 'guinea', 'guyana',
  'haiti', 'honduras', 'hungary', 'iceland', 'india', 'indonesia', 'iran', 'iraq',
  'ireland', 'israel', 'italy', 'jamaica', 'japan', 'jordan', 'kazakhstan', 'kenya',
  'kiribati', 'kosovo', 'kuwait', 'kyrgyzstan', 'laos', 'latvia', 'lebanon', 'lesotho',
  'liberia', 'libya', 'liechtenstein', 'lithuania', 'luxembourg', 'madagascar', 'malawi',
  'malaysia', 'maldives', 'mali', 'malta', 'mauritania', 'mauritius', 'mexico',
  'micronesia', 'moldova', 'monaco', 'mongolia', 'montenegro', 'morocco', 'mozambique',
  'myanmar', 'namibia', 'nauru', 'nepal', 'netherlands', 'newzealand', 'nicaragua',
  'niger', 'nigeria', 'northkorea', 'norway', 'oman', 'pakistan', 'palau', 'palestine',
  'panama', 'papuanewguinea', 'paraguay', 'peru', 'philippines', 'poland', 'portugal',
  'qatar', 'romania', 'russia', 'rwanda', 'samoa', 'sanmarino', 'saudiarabia',
  'senegal', 'serbia', 'seychelles', 'sierraleone', 'singapore', 'slovakia', 'slovenia',
  'somalia', 'southafrica', 'southkorea', 'southsudan', 'spain', 'srilanka', 'sudan',
  'suriname', 'sweden', 'switzerland', 'syria', 'taiwan', 'tajikistan', 'tanzania',
  'thailand', 'togo', 'tonga', 'trinidad', 'tunisia', 'turkey', 'turkmenistan',
  'tuvalu', 'uganda', 'ukraine', 'uae', 'uk', 'usa', 'america', 'uruguay',
  'uzbekistan', 'vanuatu', 'vatican', 'venezuela', 'vietnam', 'yemen', 'zambia', 'zimbabwe',

  // ── World Capitals ────────────────────────
  'kabul', 'tirana', 'algiers', 'luanda', 'buenosaires', 'yerevan', 'canberra', 'vienna',
  'baku', 'nassau', 'manama', 'dhaka', 'bridgetown', 'minsk', 'brussels', 'belmopan',
  'sucre', 'brasilia', 'sofia', 'ouagadougou', 'gitega', 'phnompenh', 'yaounde', 'ottawa',
  'santiago', 'beijing', 'bogota', 'moroni', 'brazzaville', 'zagreb', 'havana', 'nicosia',
  'prague', 'copenhagen', 'roseau', 'quito', 'cairo', 'asmara', 'tallinn', 'addisababa',
  'suva', 'helsinki', 'paris', 'libreville', 'banjul', 'tbilisi', 'berlin', 'accra',
  'athens', 'conakry', 'georgetown', 'portauprince', 'budapest', 'reykjavik', 'newdelhi',
  'jakarta', 'tehran', 'baghdad', 'dublin', 'jerusalem', 'rome', 'kingston', 'tokyo',
  'amman', 'astana', 'nairobi', 'bishkek', 'vientiane', 'riga', 'beirut', 'maseru',
  'monrovia', 'tripoli', 'vaduz', 'vilnius', 'antananarivo', 'lilongwe', 'kualalumpur',
  'bamako', 'valletta', 'mexicocity', 'chisinau', 'ulaanbaatar', 'podgorica', 'rabat',
  'maputo', 'naypyidaw', 'windhoek', 'kathmandu', 'amsterdam', 'wellington', 'managua',
  'niamey', 'abuja', 'oslo', 'muscat', 'islamabad', 'asuncion', 'lima', 'manila',
  'warsaw', 'lisbon', 'doha', 'bucharest', 'moscow', 'kigali', 'riyadh', 'dakar',
  'belgrade', 'freetown', 'bratislava', 'ljubljana', 'honiara', 'mogadishu', 'pretoria',
  'seoul', 'juba', 'madrid', 'colombo', 'khartoum', 'stockholm', 'bern', 'damascus',
  'taipei', 'dushanbe', 'dodoma', 'bangkok', 'lome', 'tunis', 'ankara', 'ashgabat',
  'kampala', 'kyiv', 'abudhabi', 'london', 'washington', 'montevideo', 'tashkent',
  'caracas', 'hanoi', 'sana', 'lusaka', 'harare',

  // ── Major Global Cities ────────────────────
  'newyork', 'losangeles', 'chicago', 'houston', 'phoenix', 'philadelphia', 'sanantonio',
  'sandiego', 'dallas', 'sanjose', 'austin', 'jacksonville', 'fortworth', 'columbus',
  'charlotte', 'seattle', 'denver', 'boston', 'nashville', 'portland', 'lasvegas',
  'memphis', 'louisville', 'baltimore', 'milwaukee', 'albuquerque', 'tucson', 'fresno',
  'sacramento', 'miami', 'atlanta', 'toronto', 'montreal', 'vancouver', 'calgary',
  'sydney', 'melbourne', 'brisbane', 'perth', 'auckland', 'christchurch', 'cape',
  'johannesburg', 'lagos', 'kinshasa', 'luanda', 'nairobi', 'accra', 'dakar', 'tunis',
  'casablanca', 'cairo', 'alexandria', 'khartoum', 'addisababa', 'kampala', 'dar',
  'shanghai', 'guangzhou', 'shenzhen', 'tianjin', 'chongqing', 'wuhan', 'chengdu',
  'nanjing', 'xian', 'hangzhou', 'shenyang', 'qingdao', 'dalian', 'zhengzhou', 'jinan',
  'harbin', 'changchun', 'nanchang', 'hefei', 'kunming', 'fuzhou', 'xiamen', 'urumqi',
  'osaka', 'nagoya', 'sapporo', 'fukuoka', 'kobe', 'kyoto', 'yokohama', 'hiroshima',
  'mumbai', 'delhi', 'bangalore', 'hyderabad', 'ahmedabad', 'chennai', 'kolkata',
  'surat', 'pune', 'jaipur', 'lucknow', 'kanpur', 'nagpur', 'indore', 'thane',
  'bhopal', 'patna', 'vadodara', 'ghaziabad', 'ludhiana', 'agra', 'nashik', 'meerut',
  'rajkot', 'varanasi', 'srinagar', 'aurangabad', 'amritsar', 'gwalior', 'jabalpur',
  'coimbatore', 'vijayawada', 'jodhpur', 'madurai', 'raipur', 'guwahati', 'chandigarh',
  'solapur', 'mysore', 'gurgaon', 'noida', 'bareilly', 'moradabad', 'jalandhar',
  'karachi', 'lahore', 'rawalpindi', 'faisalabad', 'peshawar', 'quetta', 'multan',
  'istanbul', 'ankara', 'izmir', 'bursa', 'adana', 'dubai', 'abudhabi', 'sharjah',
  'riyadh', 'jeddah', 'mecca', 'medina', 'kuwait', 'doha', 'manama', 'muscat',
  'tehran', 'isfahan', 'mashhad', 'tabriz', 'baghdad', 'basra', 'mosul', 'amman',
  'damascus', 'aleppo', 'beirut', 'sanaa', 'aden', 'kabul', 'kandahar', 'dhaka',
  'chittagong', 'colombo', 'kathmandu', 'pokhara', 'yangon', 'mandalay', 'phnompenh',
  'vientiane', 'hanoi', 'hochiminh', 'bangkok', 'chiangmai', 'jakarta', 'surabaya',
  'bandung', 'medan', 'kualalumpur', 'penang', 'singapore', 'manila', 'quezon', 'cebu',
  'moscow', 'saintpetersburg', 'novosibirsk', 'yekaterinburg', 'kazan', 'nizhny',
  'berlin', 'hamburg', 'munich', 'cologne', 'frankfurt', 'stuttgart', 'dusseldorf',
  'paris', 'marseille', 'lyon', 'toulouse', 'nice', 'nantes', 'strasbourg', 'bordeaux',
  'madrid', 'barcelona', 'seville', 'valencia', 'bilbao', 'rome', 'milan', 'naples',
  'florence', 'venice', 'amsterdam', 'rotterdam', 'hague', 'brussels', 'antwerp',
  'zurich', 'geneva', 'basel', 'vienna', 'graz', 'salzburg', 'warsaw', 'krakow', 'lodz',
  'prague', 'brno', 'budapest', 'debrecen', 'bucharest', 'cluj', 'sofia', 'plovdiv',
  'athens', 'thessaloniki', 'istanbul', 'ankara', 'kyiv', 'kharkiv', 'odessa', 'dnipro',
  'stockholm', 'gothenburg', 'malmo', 'oslo', 'bergen', 'helsinki', 'tampere', 'copenhagen',
  'aarhus', 'dublin', 'cork', 'galway', 'lisbon', 'porto', 'london', 'manchester',
  'birmingham', 'leeds', 'glasgow', 'liverpool', 'edinburgh', 'bristol', 'cardiff',
  'toronto', 'montreal', 'vancouver', 'calgary', 'ottawa', 'edmonton', 'winnipeg',
  'rio', 'riodejaneiro', 'saopaulo', 'salvador', 'fortaleza', 'curitiba', 'manaus',
  'buenosaires', 'cordoba', 'rosario', 'mendoza', 'lima', 'arequipa', 'bogota',
  'medellin', 'cali', 'caracas', 'maracaibo', 'santiago', 'valparaiso', 'montevideo',
  'asuncion', 'lapaz', 'quito', 'guayaquil', 'mexicocity', 'guadalajara', 'monterrey',
  'puebla', 'havana', 'sanjuan', 'santo', 'portauprince', 'managua', 'sanjose',
  'tegucigalpa', 'guatemala', 'panama', 'miami', 'newyork', 'chicago'
]);

// ─────────────────────────────────────────────
// LAYER 4 — FUZZY SIMILARITY
// ─────────────────────────────────────────────

function jaccardSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (a.length === 0 || b.length === 0) return 0.0;
  const setA = new Set(a.split(''));
  const setB = new Set(b.split(''));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

function levenshteinSimilarity(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0 || n === 0) return 0;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  const maxLen = Math.max(m, n);
  return 1 - dp[m][n] / maxLen;
}

const FUZZY_TARGETS = [
  'google', 'microsoft', 'apple', 'amazon', 'facebook', 'instagram', 'admin', 'support',
  'paypal', 'visa', 'mastercard', 'tiktok', 'netflix', 'discord', 'telegram', 'reddit',
  'youtube', 'twitter', 'openai', 'chatgpt', 'bitcoin', 'ethereum', 'binance', 'coinbase',
  'verlyn', 'shincore'
];

function fuzzyMatch(normalized: string): { blocked: boolean; matchedTerm?: string; score: number } {
  let maxScore = 0;
  let matchedTerm: string | undefined;
  for (const target of FUZZY_TARGETS) {
    if (Math.abs(normalized.length - target.length) > 3) continue;
    const lev = levenshteinSimilarity(normalized, target);
    const jac = jaccardSimilarity(normalized, target);
    const score = Math.max(lev, jac);
    if (score > maxScore) { maxScore = score; matchedTerm = target; }
  }
  return { blocked: maxScore >= 0.75, matchedTerm, score: maxScore };
}

// ─────────────────────────────────────────────
// LAYER 5 — STRUCTURAL ABUSE DETECTION
// ─────────────────────────────────────────────

const ABUSE_PREFIXES = ['official', 'real', 'theofficialreal', 'its', 'iamthe', 'iam', 'im', 'weare', 'we', 'this', 'myname'];
const ABUSE_SUFFIXES = ['team', 'support', 'official', 'hq', 'real', 'thereal', 'care', 'help', 'service'];

function detectStructuralAbuse(normalized: string, raw: string): { blocked: boolean; reason?: string } {
  // Excessive numbers
  const digits = (normalized.match(/[0-9]/g) || []).length;
  if (normalized.length > 0 && digits / normalized.length > 0.4) {
    return { blocked: true, reason: 'Too many numbers — likely bot-generated.' };
  }

  // Repeating patterns
  if (/^(.{2,})\1{2,}$/.test(normalized)) {
    return { blocked: true, reason: 'Repeating structural pattern detected.' };
  }

  // Prefix abuse
  for (const prefix of ABUSE_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      return { blocked: true, reason: `Deceptive authority prefix detected: "${prefix}".` };
    }
  }

  // Suffix abuse
  for (const suffix of ABUSE_SUFFIXES) {
    if (normalized.endsWith(suffix)) {
      return { blocked: true, reason: `Deceptive authority suffix detected: "${suffix}".` };
    }
  }

  return { blocked: false };
}

// ─────────────────────────────────────────────
// LAYER 6 — ENTROPY & HUMANNESS
// ─────────────────────────────────────────────

function shannonEntropy(str: string): number {
  const freq: Record<string, number> = {};
  for (const c of str) freq[c] = (freq[c] || 0) + 1;
  return -Object.values(freq).reduce((sum, f) => {
    const p = f / str.length;
    return sum + p * Math.log2(p);
  }, 0);
}

function detectBotLikeName(normalized: string): boolean {
  if (normalized.length < 5) return false;
  const entropy = shannonEntropy(normalized);
  const isHighEntropy = entropy > 3.8;
  const hasNoVowels = !/[aeiou]/.test(normalized);
  const hasMostlyNumbers = (normalized.match(/[0-9]/g) || []).length > normalized.length * 0.5;
  const isRandom = isHighEntropy && hasNoVowels;
  return isRandom || hasMostlyNumbers;
}

// ─────────────────────────────────────────────
// LAYER 3 — SUBSTRING DOMINATION
// ─────────────────────────────────────────────

const SUBSTRING_BLOCKLIST = [
  ...['google', 'microsoft', 'apple', 'amazon', 'facebook', 'instagram', 'whatsapp', 'meta',
    'tiktok', 'netflix', 'disney', 'youtube', 'gmail', 'paypal', 'visa', 'mastercard',
    'bitcoin', 'ethereum', 'binance', 'coinbase', 'admin', 'support', 'official', 'verified',
    'verlyn', 'shincore', 'openai', 'chatgpt', 'gov', 'police', 'military', 'fbi', 'cia']
];

function substringCheck(normalized: string): { blocked: boolean; term?: string } {
  for (const keyword of SUBSTRING_BLOCKLIST) {
    if (normalized.includes(keyword)) {
      return { blocked: true, term: keyword };
    }
  }
  return { blocked: false };
}

// ─────────────────────────────────────────────
// MASTER VALIDATION FUNCTION
// ─────────────────────────────────────────────

export interface GovernanceResult {
  valid: boolean;
  reason?: string;
  layer?: string;
  riskScore?: number;
}

export function validateUsernameGovernance(username: string): GovernanceResult {
  const raw = username.trim();

  // ── LAYER 1: Unicode / Script Contamination ─────────
  if (detectScriptMixing(raw)) {
    return { valid: false, reason: 'Mixed scripts or invisible characters detected.', layer: 'L1_UNICODE' };
  }

  // ── LAYER 0: Normalize ──────────────────────────────
  const normalized = normalizeUsername(raw);

  if (normalized.length < 5) {
    return { valid: false, reason: 'Username too short after normalization.', layer: 'L0_NORM' };
  }

  // ── LAYER 2: Blocklist Core ─────────────────────────
  if (BLOCKED_CORE.has(normalized)) {
    return { valid: false, reason: 'This identifier is globally reserved.', layer: 'L2_BLOCKLIST', riskScore: 100 };
  }

  // ── LAYER 3: Substring Domination ───────────────────
  const sub = substringCheck(normalized);
  if (sub.blocked) {
    return { valid: false, reason: `Identifier contains a protected term: "${sub.term}".`, layer: 'L3_SUBSTRING', riskScore: 95 };
  }

  // ── LAYER 4: Fuzzy Similarity ───────────────────────
  const fuzzy = fuzzyMatch(normalized);
  if (fuzzy.blocked) {
    return { valid: false, reason: `Identifier too similar to "${fuzzy.matchedTerm}" (score: ${Math.round(fuzzy.score * 100)}%).`, layer: 'L4_FUZZY', riskScore: Math.round(fuzzy.score * 100) };
  }

  // ── LAYER 5: Structural Abuse ───────────────────────
  const structural = detectStructuralAbuse(normalized, raw);
  if (structural.blocked) {
    return { valid: false, reason: structural.reason, layer: 'L5_STRUCTURAL', riskScore: 85 };
  }

  // ── LAYER 6: Entropy / Bot Detection ────────────────
  if (detectBotLikeName(normalized)) {
    return { valid: false, reason: 'Username appears machine-generated. Please choose a human name.', layer: 'L6_ENTROPY', riskScore: 80 };
  }

  return { valid: true, riskScore: 0 };
}
