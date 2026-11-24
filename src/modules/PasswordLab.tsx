/**
 * MODULE 2 — Analyseur de robustesse de mot de passe (100 % local)
 * Privacy by Design : le mot de passe n'est stocké que dans l'état React de cet
 * écran (mémoire vive). Il n'est NI envoyé, NI écrit dans le localStorage, NI loggé.
 */
import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icons";
import { PageHeader, ProgressBar } from "../components/ui";
import {
  CRACK_PROFILES,
  MAX_ANALYZED_LENGTH,
  analyzePassword,
  exceedsUniverseAge,
  formatCrackTime,
  generatePassword,
  log10CrackSeconds,
} from "../lib/password";
import { useApp } from "../state";

const LEVELS = [
  { label: "Très faible", color: "text-danger", bar: "bg-danger" },
  { label: "Faible", color: "text-warn", bar: "bg-warn" },
  { label: "Moyen", color: "text-warn", bar: "bg-yellow-400" },
  { label: "Fort", color: "text-ok", bar: "bg-ok" },
  { label: "Excellent", color: "text-accent", bar: "bg-accent" },
] as const;

export function PasswordLab() {
  const { markPw, progress } = useApp();
  const [pw, setPw] = useState("");
  const [visible, setVisible] = useState(false);
  const [genLen, setGenLen] = useState(18);
  const [copied, setCopied] = useState(false);
  const [profileId, setProfileId] = useState(CRACK_PROFILES[0].id);

  const a = useMemo(() => analyzePassword(pw), [pw]);
  const profile = CRACK_PROFILES.find((p) => p.id === profileId) ?? CRACK_PROFILES[0];
  const lvl = LEVELS[a.level];

  // Objectifs de progression (stockés comme simples booléens, jamais le mot de passe)
  useEffect(() => {
    if (a.length >= 6) markPw("analyzed");
    if (a.entropy >= 80) markPw("strong");
  }, [a.length, a.entropy, markPw]);

  const generate = () => {
    setPw(generatePassword(genLen));
    setVisible(true);
    setCopied(false);
    markPw("generated");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* presse-papier indisponible : on ignore */
    }
  };

  // Conseils dynamiques, adaptés au mot de passe saisi
  const tips: string[] = [];
  if (a.length > 0) {
    if (a.length < 12) tips.push(`Allongez-le : ${a.length} caractères, visez 12 minimum (16 ou plus pour un compte important). La longueur pèse plus que la complexité.`);
    if (a.diversity < 3) tips.push("Mélangez minuscules, majuscules, chiffres et symboles pour agrandir l'alphabet.");
    if (a.warnings.length) tips.push("Évitez les mots du dictionnaire, les prénoms, les dates et les suites de clavier (azerty, 123456).");
    if (a.entropy >= 60 && a.entropy < 80) tips.push("Bon début ! Ajoutez quelques caractères pour dépasser 80 bits d'entropie.");
    if (a.entropy >= 80) tips.push("Excellent. Utilisez un mot de passe UNIQUE par service et stockez-le dans un gestionnaire (KeePassXC, Bitwarden…).");
    tips.push("Activez la double authentification (2FA) partout où c'est possible : elle protège même si le mot de passe fuit.");
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        icon="key"
        title="Analyseur de mot de passe"
        subtitle="Calculez l'entropie en bits, la diversité de caractères et le temps de craquage par force brute avec un GPU moderne."
      />

      {/* Bandeau Privacy by Design */}
      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-ok/30 bg-ok/10 p-4">
        <Icon name="wifiOff" className="mt-0.5 h-6 w-6 shrink-0 text-ok" />
        <div className="text-sm">
          <p className="font-bold text-ok">Privacy by Design : 100 % local</p>
          <p className="mt-0.5 text-muted">
            Le calcul s'exécute dans <strong className="text-fg">votre navigateur</strong>. Aucune donnée ne quitte cet onglet : pas de serveur, pas de base de données, pas de cookie, pas de stockage du mot de passe.
            Une politique de sécurité (CSP <code className="rounded bg-bg px-1">connect-src 'self'</code>) interdit même techniquement toute requête vers un site tiers. Vérifiez-le : ouvrez l'onglet « Réseau » des outils de développement (F12) en tapant.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          {/* Saisie */}
          <div className="card p-5">
            <label htmlFor="pw" className="label">
              Mot de passe à tester (ne saisissez pas un mot de passe réellement utilisé)
            </label>
            <div className="flex gap-2">
              <input
                id="pw"
                type={visible ? "text" : "password"}
                value={pw}
                onChange={(e) => setPw(e.target.value.slice(0, MAX_ANALYZED_LENGTH))}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                maxLength={MAX_ANALYZED_LENGTH}
                placeholder="Tapez un mot de passe…"
                className="input font-mono text-base"
              />
              <button type="button" className="btn !px-3" onClick={() => setVisible((v) => !v)} aria-label={visible ? "Masquer" : "Afficher"} title={visible ? "Masquer" : "Afficher"}>
                <Icon name={visible ? "eyeOff" : "eye"} />
              </button>
              <button type="button" className="btn !px-3" onClick={copy} disabled={!pw} aria-label="Copier" title="Copier">
                <Icon name={copied ? "check" : "copy"} />
              </button>
            </div>

            {/* Jauge */}
            <div className="mt-5">
              <div className="mb-2 flex items-baseline justify-between">
                <span className={`text-lg font-extrabold ${a.length ? lvl.color : "text-muted"}`}>{a.length ? lvl.label : "En attente…"}</span>
                <span className="font-mono text-sm text-muted">{a.length} car.</span>
              </div>
              <div className="flex gap-1.5">
                {LEVELS.map((l, i) => (
                  <div key={l.label} className={`h-2.5 flex-1 rounded-full transition-colors duration-500 ${a.length && i <= a.level ? l.bar : "bg-line"}`} />
                ))}
              </div>
            </div>

            {/* Chiffres clés */}
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <Stat label="Entropie estimée" value={a.length ? a.entropy.toFixed(1) : "–"} unit="bits" />
              <Stat label="Entropie théorique" value={a.length ? a.rawEntropy.toFixed(1) : "–"} unit="bits" />
              <Stat label="Alphabet" value={a.length ? String(a.poolSize) : "–"} unit="symboles" />
            </div>
            {a.length > 0 && a.rawEntropy !== a.entropy && (
              <p className="mt-3 text-xs text-muted">
                L'entropie <em>estimée</em> est inférieure à la <em>théorique</em> car le mot de passe contient des motifs prévisibles : un attaquant les teste en premier.
              </p>
            )}
          </div>

          {/* Temps de craquage */}
          <div className="card p-5">
            <h2 className="mb-1 font-bold">Temps de craquage moyen (1 GPU récent)</h2>
            <p className="mb-3 text-xs text-muted">Attaque hors-ligne par force brute sur une base de hashs volée. {profile.note}.</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {CRACK_PROFILES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProfileId(p.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${p.id === profileId ? "border-accent bg-accent/15 text-accent" : "border-line text-muted hover:border-accent"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {(() => {
              const l10 = log10CrackSeconds(a.entropy, profile.rate);
              return (
                <div className="rounded-xl bg-bg p-4 text-center">
                  <div className="text-3xl font-extrabold tracking-tight sm:text-4xl">{a.length ? formatCrackTime(l10) : "–"}</div>
                  {a.length > 0 && exceedsUniverseAge(l10) && <p className="mt-1 text-xs font-semibold text-ok">… soit plus que l'âge de l'univers (≈ 13,8 milliards d'années) 🌌</p>}
                </div>
              );
            })()}
            <p className="mt-3 text-xs text-muted">
              Formule : t = 2<sup>(H−1)</sup> ÷ vitesse. Chaque bit supplémentaire <strong className="text-fg">double</strong> le temps. Le choix de l'algorithme de hachage côté serveur (bcrypt, Argon2) compte énormément : comparez les trois profils !
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Diversité */}
          <div className="card p-5">
            <h2 className="mb-3 font-bold">Diversité des caractères</h2>
            <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Check ok={a.hasLower} label="Minuscules (a-z)" />
              <Check ok={a.hasUpper} label="Majuscules (A-Z)" />
              <Check ok={a.hasDigit} label="Chiffres (0-9)" />
              <Check ok={a.hasSymbol} label="Symboles (!@#…)" />
              <Check ok={a.hasOther} label="Accents / Unicode" />
              <Check ok={a.length >= 12} label="12 caractères ou plus" />
            </ul>
            <div className="mt-4">
              <ProgressBar value={(a.diversity / 5) * 100} />
              <p className="mt-1.5 text-xs text-muted">{a.diversity}/5 types de caractères</p>
            </div>
          </div>

          {/* Alertes + conseils */}
          {a.length > 0 && (
            <div className="card animate-pop p-5">
              <h2 className="mb-3 font-bold">Analyse & conseils</h2>
              {a.warnings.map((w) => (
                <p key={w} className="mb-2 flex gap-2 rounded-lg border border-danger/30 bg-danger/10 p-2.5 text-sm text-danger">
                  <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" /> {w}
                </p>
              ))}
              <ul className="space-y-2 text-sm">
                {tips.map((t) => (
                  <li key={t} className="flex gap-2">
                    <Icon name="chevron" className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Générateur */}
          <div className="card p-5">
            <h2 className="mb-1 flex items-center gap-2 font-bold">
              <Icon name="dice" className="h-5 w-5 text-accent" /> Générateur sécurisé
            </h2>
            <p className="mb-3 text-xs text-muted">
              Utilise <code className="rounded bg-bg px-1">crypto.getRandomValues()</code> (générateur cryptographique du navigateur) et non <code className="rounded bg-bg px-1">Math.random()</code>, qui est prévisible.
            </p>
            <label htmlFor="len" className="label">
              Longueur : {genLen}
            </label>
            <input id="len" type="range" min={8} max={48} value={genLen} onChange={(e) => setGenLen(Number(e.target.value))} className="w-full accent-[var(--c-accent)]" />
            <button type="button" className="btn btn-primary mt-3 w-full" onClick={generate}>
              <Icon name="refresh" className="h-4 w-4" /> Générer un mot de passe
            </button>
          </div>

          <div className="card p-4 text-xs text-muted">
            <p className="mb-1 font-bold text-fg">Objectifs du module</p>
            <p>
              {progress.pw.analyzed ? "✅" : "⬜"} Analyser un mot de passe · {progress.pw.strong ? "✅" : "⬜"} Atteindre 80 bits · {progress.pw.generated ? "✅" : "⬜"} Utiliser le générateur
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl bg-bg p-3">
      <div className="font-mono text-xl font-extrabold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted">{unit}</div>
      <div className="mt-1 text-[11px] leading-tight text-muted">{label}</div>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition ${ok ? "border-ok/40 bg-ok/10 text-ok" : "border-line text-muted"}`}>
      <Icon name={ok ? "check" : "x"} className="h-4 w-4" /> {label}
    </li>
  );
}
