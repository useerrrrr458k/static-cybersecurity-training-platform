/**
 * ============================================================================
 *  urlAnalyzer.ts — Analyse heuristique d'une URL (100 % locale)
 * ============================================================================
 *  On s'appuie sur l'API native `URL` du navigateur (parseur robuste) et on
 *  AFFICHE les résultats via React (jamais d'innerHTML). L'URL saisie n'est
 *  JAMAIS ouverte ni chargée : on l'analyse uniquement comme du texte.
 * ============================================================================
 */

export type Level = "danger" | "warn" | "ok" | "info";
export interface Finding {
  level: Level;
  text: string;
}

export interface UrlReport {
  ok: true;
  protocol: string;
  username: string;
  hostname: string;
  subdomain: string;
  domain: string; // domaine "enregistrable" (le vrai propriétaire)
  path: string;
  findings: Finding[];
}

export type UrlResult = UrlReport | { ok: false; error: string };

// Quelques suffixes à deux niveaux (liste volontairement réduite — pédagogique)
const TWO_LEVEL_SUFFIXES = new Set(["co.uk", "org.uk", "com.au", "com.br", "gouv.fr", "asso.fr", "co.jp", "com.tr", "co.in"]);
const SUSPICIOUS_TLDS = new Set(["top", "xyz", "click", "icu", "buzz", "cfd", "sbs", "rest", "gq", "tk", "ml", "ga", "cf", "ru", "zip", "mov"]);
const SHORTENERS = new Set(["bit.ly", "tinyurl.com", "t.co", "cutt.ly", "is.gd", "rebrand.ly", "ow.ly", "shorturl.at"]);

/** Marques courantes (domaines légitimes) servant de base de comparaison. */
const BRANDS: { name: string; domain: string }[] = [
  { name: "google", domain: "google.com" },
  { name: "paypal", domain: "paypal.com" },
  { name: "amazon", domain: "amazon.fr" },
  { name: "amazon", domain: "amazon.com" },
  { name: "apple", domain: "apple.com" },
  { name: "microsoft", domain: "microsoft.com" },
  { name: "github", domain: "github.com" },
  { name: "pronote", domain: "index-education.net" },
  { name: "ameli", domain: "ameli.fr" },
  { name: "laposte", domain: "laposte.fr" },
  { name: "colissimo", domain: "colissimo.fr" },
  { name: "service-public", domain: "service-public.fr" },
  { name: "impots", domain: "impots.gouv.fr" },
  { name: "free", domain: "free.fr" },
  { name: "netflix", domain: "netflix.com" },
  { name: "instagram", domain: "instagram.com" },
  { name: "facebook", domain: "facebook.com" },
];

export function registrableDomain(host: string): string {
  const labels = host.split(".");
  if (labels.length <= 2) return host;
  const last2 = labels.slice(-2).join(".");
  return TWO_LEVEL_SUFFIXES.has(last2) ? labels.slice(-3).join(".") : last2;
}

/** Distance de Levenshtein (nombre minimal de modifications entre deux mots). */
function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

/** Remplace les confusions visuelles classiques pour comparer à une marque. */
function foldLookalikes(s: string): string {
  return s.replace(/rn/g, "m").replace(/vv/g, "w").replace(/0/g, "o").replace(/1/g, "l").replace(/5/g, "s");
}

export function analyzeUrl(rawInput: string): UrlResult {
  const input = rawInput.trim();
  if (input.length === 0) return { ok: false, error: "Saisissez une URL à analyser." };
  if (input.length > 2048) return { ok: false, error: "URL trop longue (2048 caractères maximum)." };
  if (/\s/.test(input)) return { ok: false, error: "Une URL ne contient pas d'espace." };

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(input);
  let url: URL;
  try {
    url = new URL(hasScheme ? input : `https://${input}`);
  } catch {
    return { ok: false, error: "URL invalide." };
  }
  // Liste blanche de protocoles : on refuse javascript:, data:, file:, etc.
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Seuls les protocoles http et https sont analysés." };
  }

  const hostname = url.hostname.toLowerCase();
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.startsWith("[");
  const domain = isIp ? hostname : registrableDomain(hostname);
  const subdomain = isIp || hostname === domain ? "" : hostname.slice(0, hostname.length - domain.length - 1);
  const findings: Finding[] = [];

  if (!hasScheme) findings.push({ level: "info", text: "Aucun protocole saisi : « https:// » a été supposé pour l'analyse." });
  if (url.protocol === "http:") findings.push({ level: "warn", text: "Connexion HTTP non chiffrée : ne saisissez jamais de mot de passe sur une page http://." });
  else findings.push({ level: "info", text: "HTTPS : la connexion est chiffrée, mais cela ne garantit PAS que le site est honnête (les sites de phishing ont aussi des certificats)." });

  if (url.username || url.password) {
    findings.push({ level: "danger", text: `Présence d'un identifiant avant « @ » (« ${url.username} ») : le vrai serveur est ce qui suit le @, soit « ${hostname} ».` });
  }
  if (isIp) findings.push({ level: "danger", text: "Adresse IP à la place d'un nom de domaine : les sites officiels n'utilisent pas ce format dans leurs liens." });
  if (/[^\x00-\x7F]/.test(input) || hostname.split(".").some((l) => l.startsWith("xn--"))) {
    findings.push({ level: "danger", text: "Domaine international (punycode / caractères non latins) : risque d'homoglyphes (ex. « а » cyrillique au lieu de « a »)." });
  }
  if (SHORTENERS.has(domain)) findings.push({ level: "warn", text: "Raccourcisseur de lien : la destination finale est cachée. Utilisez un « déraccourcisseur » avant de cliquer." });

  const tld = hostname.split(".").pop() ?? "";
  if (!isIp && SUSPICIOUS_TLDS.has(tld)) findings.push({ level: "warn", text: `Extension « .${tld} » fréquemment utilisée dans les campagnes de phishing (peu chère, peu contrôlée).` });
  if ((hostname.match(/-/g) ?? []).length >= 3) findings.push({ level: "warn", text: "Beaucoup de tirets dans le nom d'hôte : typique des domaines fabriqués (ex. « secure-login-verif »)." });
  if (hostname.split(".").length >= 5) findings.push({ level: "warn", text: "Nombre élevé de sous-domaines : l'attaquant empile des mots rassurants devant son vrai domaine." });

  // Comparaison avec les marques connues
  if (!isIp) {
    const label = domain.split(".")[0];
    for (const b of BRANDS) {
      if (domain === b.domain) {
        findings.push({ level: "ok", text: `Le domaine « ${domain} » correspond au site officiel de ${b.name}.` });
        break;
      }
      const bLabel = b.domain.split(".")[0];
      if (foldLookalikes(label) === bLabel || (label !== bLabel && levenshtein(label, bLabel) === 1 && bLabel.length >= 5)) {
        findings.push({ level: "danger", text: `Typosquatting probable : « ${domain} » ressemble à « ${b.domain} » (${b.name}) mais n'est pas identique.` });
        break;
      }
      if ((subdomain + url.pathname).toLowerCase().includes(b.name) || (label.includes(b.name) && label !== bLabel)) {
        findings.push({ level: "danger", text: `Le nom « ${b.name} » apparaît dans l'URL mais le vrai domaine est « ${domain} » (≠ ${b.domain}).` });
        break;
      }
    }
  }

  if (!findings.some((f) => f.level === "danger" || f.level === "warn")) {
    findings.push({ level: "info", text: "Aucun signal d'alerte évident détecté. Cela ne prouve pas que l'URL est sûre : vérifiez toujours le contexte." });
  }

  return {
    ok: true,
    protocol: url.protocol,
    username: url.username,
    hostname,
    subdomain,
    domain,
    path: `${url.pathname}${url.search}${url.hash}`,
    findings,
  };
}
