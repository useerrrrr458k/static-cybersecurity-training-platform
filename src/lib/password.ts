/**
 * ============================================================================
 *  password.ts — Analyse de robustesse d'un mot de passe, 100 % LOCALE
 * ============================================================================
 *  Aucune requête réseau : le mot de passe reste dans la mémoire de l'onglet
 *  (et la CSP `connect-src 'self'` l'interdirait de toute façon).
 *
 *  Modèle mathématique (entropie de Shannon, cas du mot de passe aléatoire) :
 *      H = L × log2(N)
 *    L = longueur, N = taille de l'alphabet utilisé (a-z = 26, +A-Z = 52, ...)
 *  L'entropie est un nombre de BITS : chaque bit double le nombre d'essais.
 *
 *  Temps de craquage MOYEN par force brute = 2^(H-1) / vitesse (essais/seconde)
 *  (en moyenne, on trouve le mot de passe après avoir testé la moitié de l'espace).
 *
 *  Pénalités : un humain ne choisit pas au hasard. On réduit donc l'entropie si
 *  le mot de passe est dans une liste de mots courants, contient des suites
 *  (abc, 123), des séquences clavier (azerty) ou des répétitions (aaaa).
 *  Ce n'est qu'une ESTIMATION pédagogique (voir zxcvbn pour un modèle plus fin).
 * ============================================================================
 */

export const MAX_ANALYZED_LENGTH = 128;

export interface CrackProfile {
  id: string;
  label: string;
  rate: number; // essais par seconde pour UN GPU grand public récent (≈ RTX 4090)
  note: string;
}

/** Ordres de grandeur issus des benchmarks Hashcat publics pour une RTX 4090. */
export const CRACK_PROFILES: CrackProfile[] = [
  { id: "md5", label: "MD5 / NTLM (hash rapide, non salé)", rate: 1.6e11, note: "≈ 160 milliards d'essais/s — typique de vieilles bases de données" },
  { id: "sha256", label: "SHA-256 (non salé)", rate: 2.2e10, note: "≈ 22 milliards d'essais/s" },
  { id: "bcrypt", label: "bcrypt (coût 12, recommandé)", rate: 1.4e3, note: "≈ 1 400 essais/s — le hash est volontairement LENT" },
];

export interface Analysis {
  length: number;
  hasLower: boolean;
  hasUpper: boolean;
  hasDigit: boolean;
  hasSymbol: boolean;
  hasOther: boolean;
  diversity: number; // nombre de classes de caractères (0 à 5)
  poolSize: number;
  rawEntropy: number; // L × log2(N)
  entropy: number; // après pénalités
  warnings: string[];
  level: 0 | 1 | 2 | 3 | 4; // 0 très faible … 4 excellent
}

const COMMON = [
  "123456", "123456789", "12345678", "1234567890", "000000", "111111", "password", "motdepasse", "azerty", "azerty123", "azertyuiop",
  "qwerty", "qwerty123", "abc123", "admin", "administrator", "root", "toor", "letmein", "welcome", "bienvenue", "iloveyou", "jetaime",
  "monkey", "dragon", "master", "superman", "batman", "pokemon", "minecraft", "fortnite", "roblox", "naruto", "football", "marseille",
  "psg", "soleil", "doudou", "loulou", "chocolat", "bonjour", "salut", "coucou", "princesse", "azerty1", "motdepasse1", "lycee",
  "pronote", "ent", "eleve", "professeur", "ciel", "cybersecurite", "changeme", "passw0rd", "p@ssw0rd", "trustno1", "freedom",
  "whatever", "azertyui", "123123", "654321", "666666", "696969", "sunshine", "shadow", "michael", "jordan", "hello", "login",
  "starwars", "liverpool", "barcelona", "playstation", "nintendo", "France2024", "france", "paris", "azerty2024", "motdepasse123",
];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s", "!": "i" };

function normalizeLeet(s: string): string {
  return [...s.toLowerCase()].map((c) => LEET[c] ?? c).join("");
}

const COMMON_SET = new Set(COMMON.flatMap((w) => [w.toLowerCase(), normalizeLeet(w)]));

function isCommon(pw: string): boolean {
  const low = pw.toLowerCase();
  const leet = normalizeLeet(pw);
  const candidates = [low, leet, low.replace(/[\d\W]{1,4}$/u, ""), leet.replace(/[\d\W]{1,4}$/u, "")];
  return candidates.some((c) => c.length > 0 && COMMON_SET.has(c));
}

/**
 * Mini-dictionnaire pédagogique (FR/EN). Un mot du dictionnaire ne "coûte" à un
 * attaquant que log2(taille du dictionnaire) ≈ 13 bits, quelle que soit sa longueur.
 * Un vrai dictionnaire contient 100 000+ entrées : cette liste réduite sous-estime donc
 * la détection (elle ne risque pas de surestimer la sécurité d'un mot qu'elle connaît).
 */
const WORDS = [
  "correct", "horse", "battery", "staple", "password", "motdepasse", "bonjour", "soleil", "lune", "etoile", "chat", "chien", "maison", "voiture",
  "ordinateur", "internet", "securite", "lycee", "college", "prof", "eleve", "classe", "ecole", "football", "basket", "musique", "pomme", "orange",
  "banane", "fraise", "chocolat", "fromage", "pizza", "tigre", "lion", "dragon", "loup", "renard", "ocean", "montagne", "foret", "riviere", "hiver",
  "ete", "printemps", "automne", "janvier", "fevrier", "mars", "avril", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre",
  "summer", "winter", "spring", "monkey", "master", "admin", "login", "welcome", "secret", "super", "love", "amour", "mon", "ton", "mes", "pour",
  "tout", "dans", "avec", "nous", "vous", "ils", "elle", "paris", "france", "marseille", "lyon", "toulouse", "game", "gamer", "minecraft",
  "azerty", "qwerty", "hello", "world", "house", "water", "light", "night", "dark", "fire", "star", "blue", "red", "green", "black", "white",
  "troubador", "troubadour", "letmein", "iloveyou", "dragon", "shadow", "sunshine", "princess", "football",
].filter((w, i, arr) => w.length >= 3 && arr.indexOf(w) === i).sort((a, b) => b.length - a.length);

const WORD_COST_BITS = 13;

/** Repère les mots du dictionnaire (après normalisation leet) ; renvoie positions couvertes et nb de mots. */
function findWords(pw: string[]): { covered: Set<number>; count: number } {
  const norm = normalizeLeet(pw.join(""));
  const covered = new Set<number>();
  let count = 0;
  let i = 0;
  while (i < norm.length) {
    const w = WORDS.find((x) => norm.startsWith(x, i));
    if (w && w.length >= 4) {
      for (let k = i; k < i + w.length; k++) covered.add(k);
      count++;
      i += w.length;
    } else {
      i++;
    }
  }
  return { covered, count };
}

const KEYBOARD_ROWS = ["azertyuiop", "qsdfghjklm", "wxcvbn", "qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890"];

/** Marque les positions "prévisibles" (suites, séquences clavier, répétitions). */
function predictablePositions(chars: string[]): Set<number> {
  const marks = new Set<number>();
  const low = chars.map((c) => c.toLowerCase());

  // 1) Répétitions : aaaa -> on ne compte que le premier caractère du bloc
  for (let i = 1; i < chars.length; i++) {
    if (low[i] === low[i - 1]) marks.add(i);
  }

  // 2) Suites arithmétiques de pas ±1 d'au moins 3 caractères (abc, 321...)
  const code = (k: number) => low[k].codePointAt(0)!;
  let i = 1;
  while (i < chars.length) {
    const d = code(i) - code(i - 1);
    if (Math.abs(d) === 1) {
      let j = i;
      while (j + 1 < chars.length && code(j + 1) - code(j) === d) j++;
      // La suite couvre les positions i-1 … j : longueur = j - i + 2
      if (j - i + 2 >= 3) for (let k = i; k <= j; k++) marks.add(k);
      i = j + 1;
    } else {
      i++;
    }
  }

  // 3) Séquences clavier (azerty, qwerty, 1234...) d'au moins 3 touches, dans les deux sens
  const joined = low.join("");
  for (const row of KEYBOARD_ROWS) {
    for (const r of [row, [...row].reverse().join("")]) {
      for (let len = 3; len <= r.length; len++) {
        for (let s = 0; s + len <= r.length; s++) {
          const frag = r.slice(s, s + len);
          let idx = joined.indexOf(frag);
          while (idx !== -1) {
            for (let k = idx + 1; k < idx + len; k++) marks.add(k);
            idx = joined.indexOf(frag, idx + 1);
          }
        }
      }
    }
  }
  return marks;
}

export function analyzePassword(input: string): Analysis {
  const pw = input.slice(0, MAX_ANALYZED_LENGTH);
  const chars = [...pw]; // gère correctement les emojis / accents (points de code)
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasDigit = /[0-9]/.test(pw);
  const hasSymbol = /[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/.test(pw);
  const hasOther = chars.some((c) => c.codePointAt(0)! > 126);

  let poolSize = 0;
  if (hasLower) poolSize += 26;
  if (hasUpper) poolSize += 26;
  if (hasDigit) poolSize += 10;
  if (hasSymbol) poolSize += 33;
  if (hasOther) poolSize += 64; // lettres accentuées, emojis, etc. (estimation prudente)

  const diversity = [hasLower, hasUpper, hasDigit, hasSymbol, hasOther].filter(Boolean).length;
  const bitsPerChar = poolSize > 1 ? Math.log2(poolSize) : 0;
  const rawEntropy = chars.length * bitsPerChar;

  const warnings: string[] = [];
  let entropy = rawEntropy;

  if (chars.length > 0) {
    const marks = predictablePositions(chars);
    const { covered, count: wordCount } = findWords(chars);
    // Les positions couvertes par un mot courant sont facturées à part (13 bits / mot).
    const free = [...covered].filter((p) => !marks.has(p)).length;
    const randomChars = chars.length - marks.size - free;
    entropy = Math.max(0, randomChars) * bitsPerChar + (wordCount > 0 && free > 0 ? wordCount * WORD_COST_BITS : 0);
    if (marks.size > 0) warnings.push(`${marks.size} caractère(s) prévisible(s) (répétition, suite logique ou séquence de clavier).`);
    if (wordCount > 0) warnings.push(`${wordCount} mot(s) courant(s) du dictionnaire détecté(s) : un attaquant teste des mots entiers, pas lettre par lettre.`);
    if (isCommon(pw)) {
      entropy = Math.min(entropy, 14); // ≈ log2(10 000) : présent dans les listes d'attaque
      warnings.push("Ce mot de passe (ou une variante simple) figure dans les listes de mots de passe courants : il sera testé en premier.");
    }
  }

  const level: Analysis["level"] = entropy < 28 ? 0 : entropy < 45 ? 1 : entropy < 65 ? 2 : entropy < 80 ? 3 : 4;

  return {
    length: chars.length,
    hasLower, hasUpper, hasDigit, hasSymbol, hasOther,
    diversity, poolSize, rawEntropy, entropy, warnings, level,
  };
}

/** log10 du temps moyen de craquage, en secondes (évite tout dépassement de Number). */
export function log10CrackSeconds(entropyBits: number, rate: number): number {
  if (entropyBits <= 0) return -Infinity;
  return (entropyBits - 1) * Math.log10(2) - Math.log10(rate);
}

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** Convertit un log10(secondes) en phrase lisible en français. */
export function formatCrackTime(log10s: number): string {
  if (!Number.isFinite(log10s) || log10s < -3) return "instantané";
  const s = Math.pow(10, log10s);
  if (s < 1) return "moins d'une seconde";
  if (s < 60) return `${nf0.format(s)} seconde${s >= 2 ? "s" : ""}`;
  if (s < 3600) return `${nf0.format(s / 60)} minutes`;
  if (s < 86400) return `${nf0.format(s / 3600)} heures`;
  if (s < 86400 * 31) return `${nf0.format(s / 86400)} jours`;
  if (s < 86400 * 365) return `${nf0.format(s / (86400 * 30.4))} mois`;
  const log10y = log10s - Math.log10(31_557_600);
  if (log10y < 3) return `${nf0.format(Math.pow(10, log10y))} ans`;
  if (log10y < 6) return `${nf0.format(Math.pow(10, log10y - 3))} millénaires`;
  if (log10y < 9) return `${nf.format(Math.pow(10, log10y - 6))} millions d'années`;
  if (log10y < 12) return `${nf.format(Math.pow(10, log10y - 9))} milliards d'années`;
  return `≈ 10^${Math.floor(log10y)} ans`;
}

/** Vrai si la durée dépasse l'âge de l'univers (≈ 1,38 × 10^10 ans). */
export const exceedsUniverseAge = (log10s: number) => log10s - Math.log10(31_557_600) > 10.14;

// ---------------------------------------------------------------------------
//  Générateur : crypto.getRandomValues (CSPRNG), JAMAIS Math.random()
// ---------------------------------------------------------------------------
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?";

/** Entier aléatoire uniforme dans [0, max[ — par REJET pour éviter le "modulo bias". */
function randomInt(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return buf[0] % max;
}

export function generatePassword(length: number): string {
  const len = Math.min(64, Math.max(8, Math.floor(length)));
  const all = LOWER + UPPER + DIGITS + SYMBOLS;
  for (;;) {
    let out = "";
    for (let i = 0; i < len; i++) out += all[randomInt(all.length)];
    // On exige au moins un caractère de chaque classe (politique d'entreprise courante)
    if (/[a-z]/.test(out) && /[A-Z]/.test(out) && /[0-9]/.test(out) && /[^a-zA-Z0-9]/.test(out)) return out;
  }
}
