/**
 * MODULE 3 — Inspecteur d'URL et de liens pièges
 *  A) Défis : cliquer sur le vrai domaine puis juger l'URL.
 *  B) Analyseur libre : coller une URL et obtenir un rapport (jamais ouverte).
 */
import { useState } from "react";
import { Icon } from "../components/Icons";
import { PageHeader, ProgressBar, Tag } from "../components/ui";
import { URL_CHALLENGES, type Segment, type SegmentRole } from "../data/urlChallenges";
import { analyzeUrl, type Level } from "../lib/urlAnalyzer";
import { useApp } from "../state";

const roleLabel: Record<SegmentRole, string> = {
  scheme: "Protocole",
  userinfo: "Identifiant (userinfo)",
  sub: "Sous-domaine",
  domain: "VRAI DOMAINE",
  path: "Chemin",
};
const roleColor: Record<SegmentRole, string> = {
  scheme: "text-muted",
  userinfo: "text-warn",
  sub: "text-warn",
  domain: "text-ok",
  path: "text-muted",
};

export function UrlInspector() {
  const { progress, recordUrl, resetModule, percent } = useApp();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<"legit" | "trap" | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const ch = URL_CHALLENGES[index];
  const domainIdx = ch.segments.findIndex((s) => s.role === "domain");
  const domainOk = picked === domainIdx;
  const verdictOk = verdict !== null && (verdict === "legit") === ch.legit;
  const success = domainOk && verdictOk;

  const go = (i: number) => {
    setIndex(i);
    setPicked(null);
    setVerdict(null);
    setSubmitted(false);
  };

  const submit = () => {
    setSubmitted(true);
    recordUrl(ch.id, success);
  };

  const doneCount = URL_CHALLENGES.filter((c) => c.id in progress.urls).length;

  return (
    <div className="animate-fade-up">
      <PageHeader
        icon="link"
        title="Inspecteur d'URL"
        subtitle="Typosquatting, sous-domaines trompeurs, homoglyphes… Apprenez à repérer le vrai nom de domaine d'un lien."
        actions={
          <div className="card flex min-w-[220px] items-center gap-3 px-4 py-3">
            <div className="flex-1">
              <div className="mb-1.5 flex justify-between text-xs font-semibold">
                <span className="text-muted">Réussis</span>
                <span>{percent.urls}%</span>
              </div>
              <ProgressBar value={percent.urls} />
            </div>
            <button type="button" className="btn !px-2.5" onClick={() => { resetModule("urls"); go(0); }} aria-label="Recommencer le module" title="Recommencer le module">
              <Icon name="refresh" className="h-4 w-4" />
            </button>
          </div>
        }
      />

      {/* Règle d'or */}
      <div className="card mb-5 p-4 text-sm">
        <p className="mb-2 font-bold text-accent">🧠 Règle d'or : lire l'URL de droite à gauche</p>
        <div className="overflow-x-auto rounded-lg bg-bg p-3 font-mono text-[13px] sm:text-sm">
          <span className="text-muted">https://</span>
          <span className="text-warn">mail.</span>
          <span className="font-bold text-ok">google.com</span>
          <span className="text-muted">/inbox</span>
        </div>
        <p className="mt-2 text-muted">
          Le propriétaire du site est le nom juste avant l'extension (<code>.com</code>, <code>.fr</code>…), <strong className="text-fg">avant le premier « / »</strong> et <strong className="text-fg">après un éventuel « @ »</strong>. Tout ce qui est à gauche appartient à celui qui possède ce domaine.
        </p>
      </div>

      {/* Navigation entre défis */}
      <div className="mb-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Défis">
        {URL_CHALLENGES.map((c, i) => {
          const r = progress.urls[c.id];
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              onClick={() => go(i)}
              className={`grid h-9 w-9 place-items-center rounded-lg border text-sm font-bold transition ${
                i === index ? "border-accent bg-accent/15 text-accent" : r === true ? "border-ok/40 bg-ok/10 text-ok" : r === false ? "border-danger/40 bg-danger/10 text-danger" : "border-line text-muted hover:border-accent"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
        <span className="ml-1 text-xs text-muted">
          {doneCount}/{URL_CHALLENGES.length} tentés
        </span>
      </div>

      {/* Carte du défi */}
      <div key={ch.id} className="card animate-fade-up p-5 sm:p-6">
        <p className="text-sm text-muted">
          Défi {index + 1} — Vous recevez ce lien dans un message prétendant venir de <strong className="text-fg">{ch.brand}</strong>.
        </p>

        <p className="mt-5 text-sm font-semibold">① Cliquez sur la partie qui désigne le VRAI nom de domaine :</p>
        <div className="mt-2 overflow-x-auto rounded-xl border border-line bg-bg p-3 sm:p-4">
          <div className="flex flex-wrap items-center font-mono text-sm sm:text-lg" role="group" aria-label="URL à inspecter">
            {ch.segments.map((seg, i) => (
              <SegmentButton key={i} seg={seg} state={segState(i, seg, picked, domainIdx, submitted)} disabled={submitted} onClick={() => setPicked(i)} />
            ))}
          </div>
        </div>

        <p className="mt-5 text-sm font-semibold">② Cette URL est-elle légitime pour {ch.brand} ?</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <button type="button" disabled={submitted} aria-pressed={verdict === "legit"} onClick={() => setVerdict("legit")} className={`btn btn-ok !py-3 ${verdict === "legit" ? "ring-2 ring-ok" : ""}`}>
            <Icon name="shieldCheck" /> Légitime
          </button>
          <button type="button" disabled={submitted} aria-pressed={verdict === "trap"} onClick={() => setVerdict("trap")} className={`btn btn-danger !py-3 ${verdict === "trap" ? "ring-2 ring-danger" : ""}`}>
            <Icon name="alert" /> Lien piégé
          </button>
        </div>

        {!submitted ? (
          <button type="button" className="btn btn-primary mt-5 w-full sm:w-auto" disabled={picked === null || verdict === null} onClick={submit}>
            Valider ma réponse
          </button>
        ) : (
          <div className="animate-pop mt-5 space-y-3">
            <div className={`flex items-center gap-3 rounded-xl border p-3 ${success ? "border-ok/40 bg-ok/10" : "border-danger/40 bg-danger/10"}`}>
              <Icon name={success ? "shieldCheck" : "alert"} className={`h-6 w-6 shrink-0 ${success ? "text-ok" : "text-danger"}`} />
              <div className="text-sm">
                <p className={`font-bold ${success ? "text-ok" : "text-danger"}`}>{success ? "Parfait !" : "Pas tout à fait."}</p>
                <p>
                  Domaine : {domainOk ? "✅ trouvé" : "❌ manqué"} · Verdict : {verdictOk ? "✅ correct" : "❌ incorrect"}
                </p>
              </div>
              <span className="ml-auto">
                <Tag tone={ch.legit ? "ok" : "danger"}>{ch.technique}</Tag>
              </span>
            </div>
            <p className="rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm">{ch.explanation}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {(["scheme", "userinfo", "sub", "domain", "path"] as SegmentRole[])
                .filter((r) => ch.segments.some((s) => s.role === r))
                .map((r) => (
                  <span key={r} className={roleColor[r]}>
                    ● {roleLabel[r]}
                  </span>
                ))}
            </div>
            <button type="button" className="btn btn-primary" onClick={() => go((index + 1) % URL_CHALLENGES.length)}>
              Défi suivant <Icon name="chevron" className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <FreeAnalyzer />
    </div>
  );
}

type SegState = "idle" | "picked" | "right" | "wrong" | "missed" | "neutral";

function segState(i: number, seg: Segment, picked: number | null, domainIdx: number, submitted: boolean): SegState {
  if (!submitted) return picked === i ? "picked" : "idle";
  if (i === domainIdx) return picked === i ? "right" : "missed";
  if (picked === i) return "wrong";
  return seg.role === "domain" ? "right" : "neutral";
}

function SegmentButton({ seg, state, disabled, onClick }: { seg: Segment; state: SegState; disabled: boolean; onClick: () => void }) {
  const styles: Record<SegState, string> = {
    idle: "border-transparent hover:border-accent hover:bg-accent/10",
    picked: "border-accent bg-accent/20 text-accent",
    right: "border-ok bg-ok/20 text-ok font-bold",
    missed: "border-ok border-dashed bg-ok/10 text-ok font-bold",
    wrong: "border-danger bg-danger/20 text-danger",
    neutral: `border-transparent ${roleColor[seg.role]}`,
  };
  return (
    <button type="button" disabled={disabled} onClick={onClick} title={disabled ? roleLabel[seg.role] : undefined} className={`rounded-md border px-1 py-0.5 transition ${styles[state]} disabled:cursor-default`}>
      {/* Texte inséré par React => échappé automatiquement (pas d'injection HTML possible) */}
      {seg.text}
    </button>
  );
}

// ---------------------------------------------------------------------------
//  Analyseur libre
// ---------------------------------------------------------------------------
const levelStyle: Record<Level, { icon: "alert" | "check" | "info"; cls: string }> = {
  danger: { icon: "alert", cls: "border-danger/40 bg-danger/10 text-danger" },
  warn: { icon: "alert", cls: "border-warn/40 bg-warn/10 text-warn" },
  ok: { icon: "check", cls: "border-ok/40 bg-ok/10 text-ok" },
  info: { icon: "info", cls: "border-line bg-bg text-muted" },
};

function FreeAnalyzer() {
  const [value, setValue] = useState("https://www.paypal.com.secure-login.info/signin");
  const [submitted, setSubmitted] = useState("");
  const report = submitted ? analyzeUrl(submitted) : null;

  return (
    <section className="card mt-8 p-5 sm:p-6" aria-labelledby="free-title">
      <h2 id="free-title" className="text-lg font-bold">
        🔬 Analyseur libre
      </h2>
      <p className="mt-1 text-sm text-muted">Collez une URL suspecte : elle est analysée localement comme du texte, elle n'est jamais ouverte ni chargée.</p>
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(value);
        }}
      >
        <input
          type="text"
          className="input font-mono"
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, 2048))}
          spellCheck={false}
          autoComplete="off"
          aria-label="URL à analyser"
          placeholder="https://…"
        />
        <button type="submit" className="btn btn-primary shrink-0">
          Analyser
        </button>
      </form>

      {report && !report.ok && <p className="mt-3 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{report.error}</p>}

      {report && report.ok && (
        <div className="animate-pop mt-4 space-y-4">
          <div className="overflow-x-auto rounded-xl border border-line bg-bg p-3 font-mono text-sm">
            <span className="text-muted">{report.protocol}//</span>
            {report.username && <span className="text-warn">{report.username}@</span>}
            {report.subdomain && <span className="text-warn">{report.subdomain}.</span>}
            <span className="font-bold text-ok">{report.domain}</span>
            <span className="text-muted">{report.path === "/" ? "" : report.path}</span>
          </div>
          <p className="text-sm">
            Vrai domaine : <code className="rounded bg-bg px-1.5 py-0.5 font-bold text-ok">{report.domain}</code>
          </p>
          <ul className="space-y-2">
            {report.findings.map((f, i) => {
              const st = levelStyle[f.level];
              return (
                <li key={i} className={`flex gap-2 rounded-lg border p-2.5 text-sm ${st.cls}`}>
                  <Icon name={st.icon} className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className={f.level === "info" ? "" : "text-fg"}>{f.text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
