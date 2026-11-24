/**
 * MODULE 1 — Simulateur "Vrai ou Phishing ?"
 * Boîte mail simulée : on lit, on inspecte (liens, en-tête), on vote, puis débriefing.
 * L'état des votes est DÉRIVÉ de la progression sauvegardée : pas de double stockage.
 */
import { useMemo, useState } from "react";
import { Icon } from "../components/Icons";
import { MailReader } from "../components/MailReader";
import { Difficulty, PageHeader, ProgressBar, Tag } from "../components/ui";
import { useApp } from "../state";
import type { Scenario } from "../types";

export function PhishingSim() {
  const { scenarios, progress, recordMail, resetModule } = useApp();
  const answered = progress.mail;

  const firstTodo = scenarios.find((s) => !(s.id in answered))?.id ?? scenarios[0]?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(firstTodo);
  const [mobileReading, setMobileReading] = useState(false);

  const selected = useMemo(() => scenarios.find((s) => s.id === selectedId) ?? null, [scenarios, selectedId]);
  const doneCount = scenarios.filter((s) => s.id in answered).length;
  const goodCount = scenarios.filter((s) => answered[s.id] === true).length;

  const open = (id: string) => {
    setSelectedId(id);
    setMobileReading(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const next = () => {
    const idx = scenarios.findIndex((s) => s.id === selectedId);
    const ordered = [...scenarios.slice(idx + 1), ...scenarios.slice(0, idx)];
    const target = ordered.find((s) => !(s.id in answered));
    if (target) open(target.id);
    else setMobileReading(false);
  };

  if (scenarios.length === 0) return <p>Aucun scénario disponible.</p>;

  return (
    <div className="animate-fade-up">
      <PageHeader
        icon="mail"
        title="Vrai ou Phishing ?"
        subtitle="Lisez chaque e-mail comme dans votre vraie boîte de réception. Inspectez l'expéditeur, survolez les liens, puis décidez."
        actions={
          <div className="card flex min-w-[220px] items-center gap-4 px-4 py-3">
            <div className="flex-1">
              <div className="mb-1.5 flex justify-between text-xs font-semibold">
                <span className="text-muted">Analysés</span>
                <span>
                  {doneCount}/{scenarios.length}
                </span>
              </div>
              <ProgressBar value={(doneCount / scenarios.length) * 100} />
            </div>
            <div className="text-right">
              <div className="text-xl font-extrabold text-ok">{goodCount}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted">justes</div>
            </div>
            <button type="button" className="btn !px-2.5" onClick={() => resetModule("mail")} title="Recommencer le module" aria-label="Recommencer le module">
              <Icon name="refresh" className="h-4 w-4" />
            </button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* ---------- Liste (boîte de réception) ---------- */}
        <aside className={`card overflow-hidden ${mobileReading ? "hidden lg:block" : ""}`} aria-label="Boîte de réception">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm font-bold">
            <Icon name="inbox" className="h-4 w-4 text-accent" /> Boîte de réception
            <span className="ml-auto rounded-full bg-accent/15 px-2 text-xs text-accent">{scenarios.length - doneCount}</span>
          </div>
          <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">
            {scenarios.map((s) => (
              <MailListItem key={s.id} s={s} active={s.id === selectedId} result={answered[s.id]} onOpen={() => open(s.id)} />
            ))}
          </ul>
        </aside>

        {/* ---------- Lecture + vote + débriefing ---------- */}
        <section className={`card min-w-0 overflow-hidden ${mobileReading ? "" : "hidden lg:block"}`}>
          {selected ? (
            <div key={selected.id} className="animate-fade-up">
              <button type="button" onClick={() => setMobileReading(false)} className="flex items-center gap-1 border-b border-line px-4 py-2.5 text-sm font-semibold text-accent lg:hidden w-full">
                <Icon name="back" className="h-4 w-4" /> Retour à la boîte de réception
              </button>
              <MailReader scenario={selected} />
              <VotePanel scenario={selected} result={answered[selected.id]} onVote={(v) => recordMail(selected.id, v === selected.isPhishing)} onNext={next} />
            </div>
          ) : (
            <p className="p-8 text-center text-muted">Sélectionnez un e-mail.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function MailListItem({ s, active, result, onOpen }: { s: Scenario; active: boolean; result: boolean | undefined; onOpen: () => void }) {
  const isDone = result !== undefined;
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-current={active}
        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-surface2 ${active ? "bg-surface2 shadow-[inset_3px_0_0_var(--c-accent)]" : ""}`}
      >
        <span className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full ${!isDone ? "bg-accent/20" : result ? "bg-ok/20 text-ok" : "bg-danger/20 text-danger"}`}>
          {isDone ? <Icon name={result ? "check" : "x"} className="h-3 w-3" /> : <span className="h-2 w-2 rounded-full bg-accent" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-sm ${isDone ? "text-muted" : "font-bold"}`}>{s.senderName}</span>
          <span className={`block truncate text-sm ${isDone ? "text-muted" : ""}`}>{s.subject}</span>
          <span className="mt-1 block">
            <Difficulty level={s.difficulty} />
          </span>
        </span>
      </button>
    </li>
  );
}

function VotePanel({ scenario, result, onVote, onNext }: { scenario: Scenario; result: boolean | undefined; onVote: (isPhishing: boolean) => void; onNext: () => void }) {
  // Vote dérivé : bonne réponse => vote == vérité ; mauvaise => l'inverse.
  const done = result !== undefined;

  if (!done) {
    return (
      <div className="border-t border-line bg-surface2 p-4 sm:p-5">
        <p className="mb-3 text-sm font-semibold">Votre verdict :</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" className="btn btn-ok !py-3 text-base" onClick={() => onVote(false)}>
            <Icon name="shieldCheck" /> Mail légitime
          </button>
          <button type="button" className="btn btn-danger !py-3 text-base" onClick={() => onVote(true)}>
            <Icon name="alert" /> C'est du phishing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-pop border-t border-line bg-surface2 p-4 sm:p-5" role="region" aria-label="Débriefing">
      <div className={`flex items-center gap-3 rounded-xl border p-3 ${result ? "border-ok/40 bg-ok/10" : "border-danger/40 bg-danger/10"}`}>
        <Icon name={result ? "shieldCheck" : "alert"} className={`h-7 w-7 shrink-0 ${result ? "text-ok" : "text-danger"}`} />
        <div>
          <p className={`font-bold ${result ? "text-ok" : "text-danger"}`}>{result ? "Bonne réponse !" : "Raté… mais c'est en se trompant qu'on apprend."}</p>
          <p className="text-sm">
            Ce mail était <strong>{scenario.isPhishing ? "une tentative de PHISHING" : "LÉGITIME"}</strong>.
          </p>
        </div>
      </div>

      <h4 className="mt-5 text-sm font-bold uppercase tracking-wide text-muted">Les indices</h4>
      <ul className="mt-2 space-y-2">
        {scenario.clues.map((c, i) => (
          <li key={i} className="flex gap-3 rounded-lg border border-line bg-bg p-3 text-sm">
            <Icon name={c.kind === "red" ? "alert" : "check"} className={`mt-0.5 h-4 w-4 shrink-0 ${c.kind === "red" ? "text-danger" : "text-ok"}`} />
            <span>{c.text}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm">
        <p className="mb-1 flex items-center gap-2 font-bold text-accent">
          <Icon name="info" className="h-4 w-4" /> À retenir
        </p>
        {scenario.explanation}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Tag tone={scenario.isPhishing ? "danger" : "ok"}>{scenario.isPhishing ? "PHISHING" : "LÉGITIME"}</Tag>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          Mail suivant <Icon name="chevron" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
