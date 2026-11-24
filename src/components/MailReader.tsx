/**
 * MailReader — affiche un scénario comme dans un vrai client mail.
 *
 * SÉCURITÉ (DOM XSS) :
 *  - Tout le texte est inséré via JSX : React échappe automatiquement (équivalent
 *    de `textContent`). Il n'y a AUCUN dangerouslySetInnerHTML / innerHTML dans le projet.
 *  - Les liens du mail simulé ont `href="#"` + preventDefault : on n'ouvre JAMAIS
 *    la vraie URL. La destination réelle est seulement AFFICHÉE dans la barre d'état
 *    (comme Chrome/Firefox en bas à gauche lors d'un survol).
 */
import { useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import type { AuthResult, Scenario } from "../types";
import { Icon } from "./Icons";

const authStyle: Record<AuthResult, { label: string; cls: string }> = {
  pass: { label: "PASS", cls: "text-ok bg-ok/10 border-ok/30" },
  fail: { label: "FAIL", cls: "text-danger bg-danger/10 border-danger/30" },
  none: { label: "AUCUN", cls: "text-warn bg-warn/10 border-warn/30" },
};

function AuthBadge({ label, value }: { label: string; value: AuthResult }) {
  const s = authStyle[value];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-bold ${s.cls}`}>
      {label} <span className="font-mono">{s.label}</span>
    </span>
  );
}

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-2 py-1.5 text-sm">
      <dt className="text-muted">{k}</dt>
      <dd className="min-w-0 break-words font-mono text-[13px]">{children}</dd>
    </div>
  );
}

export function MailReader({ scenario }: { scenario: Scenario }) {
  const [showHeaders, setShowHeaders] = useState(false);
  const [hoverUrl, setHoverUrl] = useState<string | null>(null);
  const [clicked, setClicked] = useState<{ kind: "link" | "file"; value: string } | null>(null);

  const s = scenario;
  const initial = (s.senderName.trim()[0] ?? "?").toUpperCase();

  return (
    <article className="flex min-h-0 flex-col" aria-label={`E-mail : ${s.subject}`}>
      <header className="border-b border-line p-4 sm:p-5">
        <h3 className="text-lg font-bold leading-snug sm:text-xl">{s.subject}</h3>
        <div className="mt-4 flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent/15 text-lg font-bold text-accent">{initial}</div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              {/* Seul le NOM est affiché : l'adresse réelle se trouve dans les détails */}
              <span className="font-semibold">{s.senderName}</span>
              <span className="text-xs text-muted">{s.date}</span>
            </div>
            <div className="text-sm text-muted">À : {s.to}</div>
            <button
              type="button"
              onClick={() => setShowHeaders((v) => !v)}
              className="mt-1.5 inline-flex items-center gap-1.5 rounded-md text-xs font-semibold text-accent hover:underline"
              aria-expanded={showHeaders}
            >
              <Icon name="eye" className="h-3.5 w-3.5" />
              {showHeaders ? "Masquer" : "Afficher"} les détails de l'en-tête
            </button>
          </div>
        </div>

        {showHeaders && (
          <dl className="animate-pop mt-3 divide-y divide-line rounded-xl border border-line bg-bg px-3">
            <Row k="De">
              {s.senderName} &lt;<span className="font-bold text-accent">{s.senderEmail}</span>&gt;
            </Row>
            <Row k="Répondre à">{s.replyTo ? <span className="font-bold text-warn">{s.replyTo}</span> : <span className="text-muted">(identique à l'expéditeur)</span>}</Row>
            <Row k="À">{s.to}</Row>
            <Row k="Authent.">
              <span className="flex flex-wrap gap-2">
                <AuthBadge label="SPF" value={s.spf} />
                <AuthBadge label="DKIM" value={s.dkim} />
              </span>
            </Row>
          </dl>
        )}
      </header>

      <div className="space-y-4 p-4 text-[15px] leading-relaxed sm:p-5">
        {s.body.map((b, i) => {
          switch (b.type) {
            case "p":
              return (
                <p key={i} className="whitespace-pre-line">
                  {b.text}
                </p>
              );
            case "link":
            case "button": {
              const common = {
                href: "#", // on n'ouvre JAMAIS la vraie URL
                rel: "noopener noreferrer nofollow",
                onClick: (e: ReactMouseEvent) => {
                  e.preventDefault();
                  setClicked({ kind: "link", value: b.href });
                },
                onMouseEnter: () => setHoverUrl(b.href),
                onMouseLeave: () => setHoverUrl(null),
                onFocus: () => setHoverUrl(b.href),
                onBlur: () => setHoverUrl(null),
              };
              return b.type === "link" ? (
                <p key={i}>
                  <a {...common} className="break-all text-blue-500 underline decoration-dotted underline-offset-2 hover:text-blue-400">
                    {b.text}
                  </a>
                </p>
              ) : (
                <p key={i}>
                  <a {...common} className="inline-block rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white no-underline hover:bg-blue-500">
                    {b.text}
                  </a>
                </p>
              );
            }
            case "attachment":
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setClicked({ kind: "file", value: b.name })}
                  className="flex w-full max-w-sm items-center gap-3 rounded-xl border border-line bg-bg p-3 text-left transition hover:border-accent"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-surface2 text-muted">
                    <Icon name="paperclip" />
                  </span>
                  <span className="min-w-0">
                    <span className="block break-all font-mono text-sm font-semibold">{b.name}</span>
                    <span className="text-xs text-muted">{b.size || "taille inconnue"}</span>
                  </span>
                </button>
              );
          }
        })}

        {clicked && (
          <div role="status" className="animate-pop flex items-start gap-3 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm">
            <Icon name="shield" className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-warn">Simulation : rien n'a été ouvert.</p>
              <p className="mt-0.5 text-muted">
                {clicked.kind === "link" ? "Dans la réalité, ce clic vous aurait envoyé vers :" : "Dans la réalité, vous auriez ouvert le fichier :"}
              </p>
              <code className="mt-1 block break-all rounded bg-bg px-2 py-1 text-[13px] text-fg">{clicked.value}</code>
            </div>
            <button type="button" onClick={() => setClicked(null)} className="text-muted hover:text-fg" aria-label="Fermer">
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Barre d'état : reproduit celle du navigateur lors d'un survol de lien */}
      <div className="mt-auto border-t border-line bg-bg px-4 py-2 font-mono text-xs" aria-live="polite">
        {hoverUrl ? (
          <span className="break-all">
            <span className="text-muted">🔗 Destination réelle : </span>
            <span className="font-semibold text-accent">{hoverUrl}</span>
          </span>
        ) : (
          <span className="text-muted">Survolez un lien ou un bouton pour inspecter son adresse réelle.</span>
        )}
      </div>
    </article>
  );
}
