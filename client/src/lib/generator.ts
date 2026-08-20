const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const NUMBERS = "23456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>?";
const FULL_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const FULL_LOWER = "abcdefghijklmnopqrstuvwxyz";
const FULL_NUMBERS = "0123456789";
const WORDS = [
  "ember", "cinder", "harbor", "quartz", "velvet", "orchid", "nimbus", "cedar",
  "falcon", "willow", "onyx", "maple", "cobalt", "jasper", "aurora", "thicket",
  "glacier", "pebble", "saffron", "bramble", "lumen", "zephyr", "canyon", "meadow",
];

export type GeneratorOptions = {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
};

export type StrengthLabel = "Very Weak" | "Weak" | "Medium" | "Strong" | "Very Strong";

function randomIndex(max: number) {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

function charset(options: GeneratorOptions) {
  let set = "";
  const upper = options.excludeAmbiguous ? UPPER : FULL_UPPER;
  const lower = options.excludeAmbiguous ? LOWER : FULL_LOWER;
  const numbers = options.excludeAmbiguous ? NUMBERS : FULL_NUMBERS;
  if (options.uppercase) set += upper;
  if (options.lowercase) set += lower;
  if (options.numbers) set += numbers;
  if (options.symbols) set += SYMBOLS;
  return set;
}

export function generatePassword(options: GeneratorOptions) {
  const set = charset(options);
  if (!set) return "";
  const required: string[] = [];
  if (options.uppercase) required.push((options.excludeAmbiguous ? UPPER : FULL_UPPER)[randomIndex(options.excludeAmbiguous ? UPPER.length : 26)]);
  if (options.lowercase) required.push((options.excludeAmbiguous ? LOWER : FULL_LOWER)[randomIndex(options.excludeAmbiguous ? LOWER.length : 26)]);
  if (options.numbers) required.push((options.excludeAmbiguous ? NUMBERS : FULL_NUMBERS)[randomIndex(options.excludeAmbiguous ? NUMBERS.length : 10)]);
  if (options.symbols) required.push(SYMBOLS[randomIndex(SYMBOLS.length)]);
  const chars = [...required];
  while (chars.length < options.length) {
    chars.push(set[randomIndex(set.length)]);
  }
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.slice(0, options.length).join("");
}

export function generatePassphrase(wordCount = 5) {
  const words = Array.from({ length: wordCount }, () => WORDS[randomIndex(WORDS.length)]);
  const number = String(randomIndex(90) + 10);
  return `${words.join("-")}-${number}`;
}

export function estimateEntropy(password: string, options?: GeneratorOptions) {
  if (!password) return 0;
  const size = options ? Math.max(charset(options).length, 1) : new Set(password).size + 20;
  return Math.round(password.length * Math.log2(size) * 10) / 10;
}

export function strengthFromEntropy(entropy: number): StrengthLabel {
  if (entropy < 28) return "Very Weak";
  if (entropy < 36) return "Weak";
  if (entropy < 60) return "Medium";
  if (entropy < 80) return "Strong";
  return "Very Strong";
}

export function analyzePassword(password: string): StrengthLabel {
  let entropy = estimateEntropy(password);
  if (password.length < 8) entropy -= 15;
  if (/^[a-z]+$/i.test(password)) entropy -= 10;
  if (/password|qwerty|12345|letmein/i.test(password)) entropy -= 25;
  return strengthFromEntropy(Math.max(entropy, 0));
}
