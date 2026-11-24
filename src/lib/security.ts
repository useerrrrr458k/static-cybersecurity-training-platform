/**
 * ============================================================================
 *  security.ts — Validation stricte de TOUTE donnée externe
 * ============================================================================
 *  Sources de données non fiables dans ce projet :
 *   1. un fichier JSON importé par l'utilisateur (éditeur) ;
 *   2. le contenu du localStorage (modifiable depuis les DevTools) ;
 *   3. les champs de formulaire de l'éditeur.
 *
 *  Principes appliqués (OWASP "Input Validation" + "DOM-based XSS Prevention") :
 *   - LISTE BLANCHE : on reconstruit un objet neuf champ par champ ; toute clé
 *     inconnue est ignorée (donc pas de pollution de prototype possible).
 *   - LIMITES DE TAILLE sur chaque chaîne (anti-déni de service / anti-abus).
 *   - SUPPRESSION des caractères de contrôle et des caractères bidirectionnels
 *     (attaque "Trojan Source" : U+202E inverse l'ordre d'affichage du texte).
 *   - URL : seuls les schémas http: et https: sont acceptés (jamais javascript:,
 *     data:, vbscript:...). De plus, l'application n'ouvre JAMAIS ces liens.
 *   - L'affichage final se fait via React (équivalent de textContent) :
 *     aucune donnée n'est jamais interprétée comme du HTML.
 * ============================================================================
 */
import type { AuthResult, BodyBlock, Clue, Scenario } from "../types";

export const LIMITS = {
  importChars: 300_000, // taille max d'un fichier JSON importé
  scenarios: 60,
  bodyBlocks: 14,
  clues: 14,
  short: 120,
  medium: 300,
  long: 2000,
  url: 300,
} as const;

// Caractères de contrôle (sauf \n et \t) + marques bidirectionnelles + zero-width.
// eslint-disable-next-line no-control-regex
const FORBIDDEN_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

/** Nettoie une chaîne : retire les caractères dangereux, normalise, coupe les espaces. */
export function cleanText(value: string): string {
  return value.normalize("NFC").replace(FORBIDDEN_CHARS, "").trim();
}

/** Accepte uniquement une URL absolue http(s) de longueur raisonnable. */
export function isSafeHttpUrl(value: string): boolean {
  if (value.length === 0 || value.length > LIMITS.url) return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const ID_RE = /^[a-z0-9][a-z0-9_-]{0,47}$/;
const EMAIL_RE = /^[^\s@<>"'()\\]{1,64}@[a-z0-9.-]{1,190}\.[a-z]{2,24}$/i;

export type Result<T> = { ok: true; value: T } | { ok: false; errors: string[] };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Lit une chaîne dans un objet inconnu, avec contrôle de type et de longueur. */
function readString(
  obj: Record<string, unknown>,
  key: string,
  max: number,
  errors: string[],
  opts: { required?: boolean; label?: string } = {}
): string {
  const label = opts.label ?? key;
  const raw = obj[key];
  if (raw === undefined || raw === null) {
    if (opts.required) errors.push(`« ${label} » est obligatoire.`);
    return "";
  }
  if (typeof raw !== "string") {
    errors.push(`« ${label} » doit être du texte.`);
    return "";
  }
  const cleaned = cleanText(raw);
  if (cleaned.length > max) {
    errors.push(`« ${label} » dépasse ${max} caractères.`);
    return "";
  }
  if (opts.required && cleaned.length === 0) errors.push(`« ${label} » est obligatoire.`);
  return cleaned;
}

function readAuth(v: unknown, label: string, errors: string[]): AuthResult {
  if (v === "pass" || v === "fail" || v === "none") return v;
  errors.push(`« ${label} » doit valoir pass, fail ou none.`);
  return "none";
}

function readBlock(raw: unknown, index: number, errors: string[]): BodyBlock | null {
  const n = index + 1;
  if (!isRecord(raw)) {
    errors.push(`Bloc ${n} : format invalide.`);
    return null;
  }
  const local: string[] = [];
  switch (raw.type) {
    case "p": {
      const text = readString(raw, "text", LIMITS.long, local, { required: true, label: `Bloc ${n} – texte` });
      if (local.length) break;
      return { type: "p", text };
    }
    case "link":
    case "button": {
      const text = readString(raw, "text", LIMITS.medium, local, { required: true, label: `Bloc ${n} – texte` });
      const href = readString(raw, "href", LIMITS.url, local, { required: true, label: `Bloc ${n} – URL` });
      if (!local.length && !isSafeHttpUrl(href)) local.push(`Bloc ${n} : l'URL doit commencer par http:// ou https://.`);
      if (local.length) break;
      return { type: raw.type, text, href };
    }
    case "attachment": {
      const name = readString(raw, "name", LIMITS.short, local, { required: true, label: `Bloc ${n} – nom de fichier` });
      const size = readString(raw, "size", 20, local, { label: `Bloc ${n} – taille` });
      if (local.length) break;
      return { type: "attachment", name, size };
    }
    default:
      local.push(`Bloc ${n} : type inconnu.`);
  }
  errors.push(...local);
  return null;
}

/** Valide et reconstruit un scénario à partir d'une donnée inconnue. */
export function validateScenario(input: unknown): Result<Scenario> {
  const errors: string[] = [];
  if (!isRecord(input)) return { ok: false, errors: ["Le scénario n'est pas un objet JSON."] };

  const id = readString(input, "id", 48, errors, { required: true, label: "id" });
  if (id && !ID_RE.test(id)) errors.push("« id » : minuscules, chiffres, - et _ uniquement (48 max).");

  const title = readString(input, "title", LIMITS.short, errors, { required: true, label: "Titre" });
  const senderName = readString(input, "senderName", LIMITS.short, errors, { required: true, label: "Nom de l'expéditeur" });
  const senderEmail = readString(input, "senderEmail", 254, errors, { required: true, label: "Adresse de l'expéditeur" });
  if (senderEmail && !EMAIL_RE.test(senderEmail)) errors.push("« Adresse de l'expéditeur » n'est pas une adresse valide.");

  const replyTo = readString(input, "replyTo", 254, errors, { label: "Répondre à" });
  if (replyTo && !EMAIL_RE.test(replyTo)) errors.push("« Répondre à » n'est pas une adresse valide.");

  const to = readString(input, "to", LIMITS.short, errors, { required: true, label: "Destinataire" });
  const subject = readString(input, "subject", LIMITS.medium, errors, { required: true, label: "Objet" });
  const date = readString(input, "date", 60, errors, { required: true, label: "Date" });
  const explanation = readString(input, "explanation", LIMITS.long, errors, { required: true, label: "Explication" });

  const difficulty = input.difficulty;
  if (difficulty !== 1 && difficulty !== 2 && difficulty !== 3) errors.push("« Difficulté » doit valoir 1, 2 ou 3.");
  if (typeof input.isPhishing !== "boolean") errors.push("« isPhishing » doit être vrai ou faux.");

  const spf = readAuth(input.spf, "SPF", errors);
  const dkim = readAuth(input.dkim, "DKIM", errors);

  const body: BodyBlock[] = [];
  if (!Array.isArray(input.body) || input.body.length === 0) errors.push("Le corps du mail doit contenir au moins un bloc.");
  else if (input.body.length > LIMITS.bodyBlocks) errors.push(`Le corps du mail est limité à ${LIMITS.bodyBlocks} blocs.`);
  else
    input.body.forEach((b, i) => {
      const blk = readBlock(b, i, errors);
      if (blk) body.push(blk);
    });

  const clues: Clue[] = [];
  if (!Array.isArray(input.clues) || input.clues.length === 0) errors.push("Ajoutez au moins un indice.");
  else if (input.clues.length > LIMITS.clues) errors.push(`Maximum ${LIMITS.clues} indices.`);
  else
    input.clues.forEach((c, i) => {
      if (!isRecord(c) || (c.kind !== "red" && c.kind !== "green")) {
        errors.push(`Indice ${i + 1} : type invalide.`);
        return;
      }
      const local: string[] = [];
      const text = readString(c, "text", LIMITS.medium, local, { required: true, label: `Indice ${i + 1}` });
      if (local.length) errors.push(...local);
      else clues.push({ kind: c.kind, text });
    });

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      id,
      title,
      difficulty: difficulty as 1 | 2 | 3,
      isPhishing: input.isPhishing as boolean,
      senderName,
      senderEmail,
      replyTo,
      to,
      subject,
      date,
      spf,
      dkim,
      body,
      clues,
      explanation,
    },
  };
}

/** Valide un tableau de scénarios (id uniques, taille bornée). */
export function validateScenarioList(input: unknown): Result<Scenario[]> {
  if (!Array.isArray(input)) return { ok: false, errors: ["Le fichier doit contenir une liste « scenarios »."] };
  if (input.length === 0) return { ok: false, errors: ["La liste de scénarios est vide."] };
  if (input.length > LIMITS.scenarios) return { ok: false, errors: [`Maximum ${LIMITS.scenarios} scénarios.`] };

  const out: Scenario[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  input.forEach((raw, i) => {
    const r = validateScenario(raw);
    if (!r.ok) {
      errors.push(...r.errors.map((e) => `Scénario ${i + 1} : ${e}`));
      return;
    }
    if (seen.has(r.value.id)) {
      errors.push(`Scénario ${i + 1} : l'id « ${r.value.id} » est en doublon.`);
      return;
    }
    seen.add(r.value.id);
    out.push(r.value);
  });
  return errors.length ? { ok: false, errors: errors.slice(0, 12) } : { ok: true, value: out };
}

/** Analyse le texte d'un fichier importé : taille → JSON.parse protégé → validation. */
export function parseScenarioFile(text: string): Result<Scenario[]> {
  if (text.length > LIMITS.importChars) return { ok: false, errors: ["Fichier trop volumineux."] };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["Ce fichier n'est pas un JSON valide."] };
  }
  const list = isRecord(data) ? data.scenarios : data; // accepte {scenarios:[…]} ou […]
  return validateScenarioList(list);
}

/** Transforme un titre en identifiant sûr (a-z, 0-9, tiret). */
export function slugify(title: string): string {
  const s = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return s || "scenario";
}
