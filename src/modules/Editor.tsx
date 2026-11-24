/**
 * MODE ÉDITEUR / PROFESSEUR
 * Créer, modifier, supprimer des scénarios, puis exporter/importer scenarios.json.
 *
 * Flux de travail pour mettre à jour le dépôt GitHub :
 *   1. Créer / modifier les scénarios ici (stockés dans le localStorage de CE navigateur).
 *   2. « Exporter scenarios.json ».
 *   3. Remplacer le fichier  src/data/scenarios.json  du dépôt, commit + push.
 *   4. GitHub Actions reconstruit et redéploie le site pour tous les élèves.
 *
 * ⚠ Un site statique ne peut PAS authentifier un professeur : ce mode n'est pas un
 *   mécanisme de sécurité. La vraie protection est celle du dépôt GitHub (seuls les
 *   collaborateurs peuvent pousser du code ; on peut exiger une Pull Request relue).
 *
 * SÉCURITÉ : tout fichier importé passe par parseScenarioFile() (taille, JSON, liste
 * blanche de champs, URL http/https uniquement) avant d'être accepté.
 */
import { useRef, useState } from "react";
import { Icon } from "../components/Icons";
import { MailReader } from "../components/MailReader";
import { PageHeader, Tag } from "../components/ui";
import { LIMITS, parseScenarioFile, slugify, validateScenario } from "../lib/security";
import { useApp } from "../state";
import type { AuthResult, Scenario } from "../types";

interface DraftBlock {
  type: "p" | "link" | "button" | "attachment";
  text: string;
  href: string;
  name: string;
  size: string;
}
interface DraftClue {
  kind: "red" | "green";
  text: string;
}
interface Draft {
  title: string;
  difficulty: 1 | 2 | 3;
  isPhishing: boolean;
  senderName: string;
  senderEmail: string;
  replyTo: string;
  to: string;
  subject: string;
  date: string;
  spf: AuthResult;
  dkim: AuthResult;
  body: DraftBlock[];
  clues: DraftClue[];
  explanation: string;
}

const newBlock = (type: DraftBlock["type"] = "p"): DraftBlock => ({ type, text: "", href: "", name: "", size: "" });

const emptyDraft = (): Draft => ({
  title: "",
  difficulty: 1,
  isPhishing: true,
  senderName: "",
  senderEmail: "",
  replyTo: "",
  to: "vous",
  subject: "",
  date: "Lun. 1 sept. 2025, 08:00",
  spf: "none",
  dkim: "none",
  body: [newBlock("p")],
  clues: [{ kind: "red", text: "" }],
  explanation: "",
});

function scenarioToDraft(s: Scenario): Draft {
  return {
    ...s,
    body: s.body.map((b) => ({ ...newBlock(b.type), ...b })),
    clues: s.clues.map((c) => ({ ...c })),
  };
}

/** Convertit le brouillon en objet "brut" que validateScenario() va contrôler. */
function draftToRaw(d: Draft, id: string): unknown {
  return {
    id,
    title: d.title,
    difficulty: d.difficulty,
    isPhishing: d.isPhishing,
    senderName: d.senderName,
    senderEmail: d.senderEmail,
    replyTo: d.replyTo,
    to: d.to,
    subject: d.subject,
    date: d.date,
    spf: d.spf,
    dkim: d.dkim,
    explanation: d.explanation,
    clues: d.clues,
    body: d.body.map((b) =>
      b.type === "p" ? { type: "p", text: b.text } : b.type === "attachment" ? { type: "attachment", name: b.name, size: b.size } : { type: b.type, text: b.text, href: b.href }
    ),
  };
}

export function Editor() {
  const { scenarios, setScenarios, restoreDefaultScenarios, hasCustomScenarios } = useApp();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState<Scenario | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setBlock = (i: number, patch: Partial<DraftBlock>) => setDraft((d) => ({ ...d, body: d.body.map((b, j) => (j === i ? { ...b, ...patch } : b)) }));
  const setClue = (i: number, patch: Partial<DraftClue>) => setDraft((d) => ({ ...d, clues: d.clues.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));

  /** Calcule un identifiant unique à partir du titre. */
  const makeId = (): string => {
    if (editingId) return editingId;
    const base = slugify(draft.title);
    let id = base;
    let n = 2;
    while (scenarios.some((s) => s.id === id)) id = `${base}-${n++}`;
    return id;
  };

  const build = (): Scenario | null => {
    const r = validateScenario(draftToRaw(draft, makeId()));
    if (!r.ok) {
      setErrors(r.errors);
      return null;
    }
    setErrors([]);
    return r.value;
  };

  const save = () => {
    const s = build();
    if (!s) return;
    const exists = scenarios.some((x) => x.id === s.id);
    setScenarios(exists ? scenarios.map((x) => (x.id === s.id ? s : x)) : [...scenarios, s]);
    setNotice({ ok: true, text: exists ? "Scénario mis à jour." : "Scénario ajouté à la boîte de réception." });
    reset();
  };

  const reset = () => {
    setDraft(emptyDraft());
    setEditingId(null);
    setErrors([]);
  };

  const edit = (s: Scenario) => {
    setDraft(scenarioToDraft(s));
    setEditingId(s.id);
    setErrors([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = (s: Scenario) => {
    if (scenarios.length <= 1) return setNotice({ ok: false, text: "Impossible de supprimer le dernier scénario." });
    if (!window.confirm(`Supprimer « ${s.title} » ?`)) return;
    setScenarios(scenarios.filter((x) => x.id !== s.id));
    if (editingId === s.id) reset();
  };

  const duplicate = (s: Scenario) => {
    let id = `${s.id}-copie`;
    let n = 2;
    while (scenarios.some((x) => x.id === id)) id = `${s.id}-copie-${n++}`;
    setScenarios([...scenarios, { ...s, id, title: `${s.title} (copie)` }]);
  };

  // ---- Export ----
  const exportJson = () => {
    const json = JSON.stringify({ version: 1, scenarios }, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scenarios.json";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setNotice({ ok: true, text: "scenarios.json exporté. Remplacez src/data/scenarios.json dans le dépôt puis faites un commit." });
  };

  // ---- Import (fichier lu comme TEXTE, jamais exécuté) ----
  const importJson = (file: File | undefined) => {
    if (!file) return;
    if (file.size > LIMITS.importChars) return setNotice({ ok: false, text: "Fichier trop volumineux (300 Ko maximum)." });
    if (!/\.json$/i.test(file.name)) return setNotice({ ok: false, text: "Choisissez un fichier .json." });
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const r = parseScenarioFile(text);
      if (!r.ok) return setNotice({ ok: false, text: `Import refusé — ${r.errors.join(" ")}` });
      setScenarios(r.value);
      setNotice({ ok: true, text: `${r.value.length} scénarios importés et validés.` });
    };
    reader.onerror = () => setNotice({ ok: false, text: "Lecture du fichier impossible." });
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ version: 1, scenarios }, null, 2));
      setNotice({ ok: true, text: "JSON copié dans le presse-papier." });
    } catch {
      setNotice({ ok: false, text: "Copie impossible : utilisez l'export fichier." });
    }
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        icon="edit"
        title="Mode Éditeur / Professeur"
        subtitle="Créez vos propres scénarios de phishing, puis exportez scenarios.json pour mettre à jour le dépôt GitHub."
      />

      <div className="mb-5 flex gap-3 rounded-2xl border border-warn/30 bg-warn/10 p-4 text-sm">
        <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
        <p className="text-muted">
          <strong className="text-fg">Information :</strong> sur un site statique, ce mode n'est pas protégé par mot de passe (rien ne serait réellement secret côté navigateur). Vos modifications restent <strong className="text-fg">locales à votre navigateur</strong> tant que vous n'avez pas exporté le fichier et poussé le changement sur GitHub — dépôt que vous seul(e) (et vos collaborateurs) pouvez modifier.
        </p>
      </div>

      {notice && (
        <div role="status" className={`animate-pop mb-5 flex items-start gap-3 rounded-xl border p-3 text-sm ${notice.ok ? "border-ok/40 bg-ok/10 text-ok" : "border-danger/40 bg-danger/10 text-danger"}`}>
          <Icon name={notice.ok ? "check" : "alert"} className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Fermer">
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Barre d'import / export */}
      <div className="card mb-5 flex flex-wrap items-center gap-3 p-4">
        <button type="button" className="btn btn-primary" onClick={exportJson}>
          <Icon name="download" className="h-4 w-4" /> Exporter scenarios.json
        </button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" className="h-4 w-4" /> Importer un JSON
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => importJson(e.target.files?.[0])} aria-label="Importer un fichier scenarios.json" />
        <button type="button" className="btn" onClick={copyJson}>
          <Icon name="copy" className="h-4 w-4" /> Copier le JSON
        </button>
        {hasCustomScenarios && (
          <button
            type="button"
            className="btn btn-danger ml-auto"
            onClick={() => {
              if (window.confirm("Revenir aux scénarios du dépôt ? Vos modifications locales seront perdues.")) {
                restoreDefaultScenarios();
                reset();
              }
            }}
          >
            <Icon name="refresh" className="h-4 w-4" /> Restaurer ceux du dépôt
          </button>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        {/* ---------- Formulaire ---------- */}
        <form
          className="card space-y-5 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <h2 className="text-lg font-bold">{editingId ? "Modifier le scénario" : "Nouveau scénario"}</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Titre interne" value={draft.title} onChange={(v) => set("title", v)} max={LIMITS.short} />
            <div>
              <span className="label">Nature du mail</span>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" aria-pressed={draft.isPhishing} onClick={() => set("isPhishing", true)} className={`btn ${draft.isPhishing ? "btn-danger ring-2 ring-danger" : ""}`}>
                  Phishing
                </button>
                <button type="button" aria-pressed={!draft.isPhishing} onClick={() => set("isPhishing", false)} className={`btn ${!draft.isPhishing ? "btn-ok ring-2 ring-ok" : ""}`}>
                  Légitime
                </button>
              </div>
            </div>
            <Field label="Nom de l'expéditeur affiché" value={draft.senderName} onChange={(v) => set("senderName", v)} max={LIMITS.short} />
            <Field label="Adresse réelle de l'expéditeur" value={draft.senderEmail} onChange={(v) => set("senderEmail", v)} max={254} mono placeholder="nom@domaine.fr" />
            <Field label="Répondre à (optionnel)" value={draft.replyTo} onChange={(v) => set("replyTo", v)} max={254} mono />
            <Field label="Destinataire" value={draft.to} onChange={(v) => set("to", v)} max={LIMITS.short} />
            <Field label="Objet" value={draft.subject} onChange={(v) => set("subject", v)} max={LIMITS.medium} />
            <Field label="Date affichée" value={draft.date} onChange={(v) => set("date", v)} max={60} />
            <Select label="SPF" value={draft.spf} onChange={(v) => set("spf", v as AuthResult)} />
            <Select label="DKIM" value={draft.dkim} onChange={(v) => set("dkim", v as AuthResult)} />
            <div>
              <label className="label" htmlFor="diff">
                Difficulté
              </label>
              <select id="diff" className="input" value={draft.difficulty} onChange={(e) => set("difficulty", Number(e.target.value) as 1 | 2 | 3)}>
                <option value={1}>1 – Facile</option>
                <option value={2}>2 – Moyen</option>
                <option value={3}>3 – Difficile</option>
              </select>
            </div>
          </div>

          {/* Corps du mail */}
          <fieldset className="space-y-3">
            <legend className="label">Corps du mail (blocs)</legend>
            {draft.body.map((b, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-line bg-bg p-3">
                <div className="flex items-center gap-2">
                  <select aria-label={`Type du bloc ${i + 1}`} className="input !w-auto" value={b.type} onChange={(e) => setBlock(i, { type: e.target.value as DraftBlock["type"] })}>
                    <option value="p">Paragraphe</option>
                    <option value="link">Lien texte</option>
                    <option value="button">Bouton</option>
                    <option value="attachment">Pièce jointe</option>
                  </select>
                  <button type="button" className="btn ml-auto !px-2.5" onClick={() => set("body", draft.body.filter((_, j) => j !== i))} disabled={draft.body.length <= 1} aria-label={`Supprimer le bloc ${i + 1}`}>
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </div>
                {b.type === "p" && <textarea aria-label="Texte" className="input min-h-20" maxLength={LIMITS.long} value={b.text} onChange={(e) => setBlock(i, { text: e.target.value })} />}
                {(b.type === "link" || b.type === "button") && (
                  <>
                    <input aria-label="Texte affiché" className="input" placeholder="Texte affiché" maxLength={LIMITS.medium} value={b.text} onChange={(e) => setBlock(i, { text: e.target.value })} />
                    <input aria-label="URL réelle" className="input font-mono" placeholder="URL réelle (https://…)" maxLength={LIMITS.url} value={b.href} onChange={(e) => setBlock(i, { href: e.target.value })} />
                  </>
                )}
                {b.type === "attachment" && (
                  <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
                    <input aria-label="Nom du fichier" className="input font-mono" placeholder="Facture.pdf.exe" maxLength={LIMITS.short} value={b.name} onChange={(e) => setBlock(i, { name: e.target.value })} />
                    <input aria-label="Taille" className="input" placeholder="1,2 Mo" maxLength={20} value={b.size} onChange={(e) => setBlock(i, { size: e.target.value })} />
                  </div>
                )}
              </div>
            ))}
            <button type="button" className="btn" onClick={() => set("body", [...draft.body, newBlock()])} disabled={draft.body.length >= LIMITS.bodyBlocks}>
              <Icon name="plus" className="h-4 w-4" /> Ajouter un bloc
            </button>
          </fieldset>

          {/* Indices */}
          <fieldset className="space-y-3">
            <legend className="label">Indices du débriefing</legend>
            {draft.clues.map((c, i) => (
              <div key={i} className="flex gap-2">
                <select aria-label={`Type de l'indice ${i + 1}`} className="input !w-auto" value={c.kind} onChange={(e) => setClue(i, { kind: e.target.value as "red" | "green" })}>
                  <option value="red">🚩 Alerte</option>
                  <option value="green">✅ Rassurant</option>
                </select>
                <input aria-label={`Texte de l'indice ${i + 1}`} className="input" maxLength={LIMITS.medium} value={c.text} onChange={(e) => setClue(i, { text: e.target.value })} />
                <button type="button" className="btn !px-2.5" onClick={() => set("clues", draft.clues.filter((_, j) => j !== i))} disabled={draft.clues.length <= 1} aria-label={`Supprimer l'indice ${i + 1}`}>
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button type="button" className="btn" onClick={() => set("clues", [...draft.clues, { kind: "red", text: "" }])} disabled={draft.clues.length >= LIMITS.clues}>
              <Icon name="plus" className="h-4 w-4" /> Ajouter un indice
            </button>
          </fieldset>

          <div>
            <label className="label" htmlFor="expl">
              À retenir (explication finale)
            </label>
            <textarea id="expl" className="input min-h-24" maxLength={LIMITS.long} value={draft.explanation} onChange={(e) => set("explanation", e.target.value)} />
          </div>

          {errors.length > 0 && (
            <ul role="alert" className="space-y-1 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
              {errors.map((er) => (
                <li key={er}>• {er}</li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-3">
            <button type="submit" className="btn btn-primary">
              <Icon name="check" className="h-4 w-4" /> {editingId ? "Enregistrer les modifications" : "Ajouter le scénario"}
            </button>
            <button type="button" className="btn" onClick={() => { const s = build(); if (s) setPreview(s); }}>
              <Icon name="eye" className="h-4 w-4" /> Aperçu
            </button>
            {(editingId || draft.title) && (
              <button type="button" className="btn" onClick={reset}>
                Annuler
              </button>
            )}
          </div>
        </form>

        {/* ---------- Liste + aperçu ---------- */}
        <div className="space-y-5">
          <div className="card overflow-hidden">
            <div className="border-b border-line px-4 py-3 text-sm font-bold">Scénarios actuels ({scenarios.length})</div>
            <ul className="divide-y divide-line">
              {scenarios.map((s) => (
                <li key={s.id} className="flex items-center gap-2 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{s.title}</p>
                    <p className="mt-0.5 flex items-center gap-2">
                      <Tag tone={s.isPhishing ? "danger" : "ok"}>{s.isPhishing ? "Phishing" : "Légitime"}</Tag>
                      <span className="truncate font-mono text-[11px] text-muted">{s.id}</span>
                    </p>
                  </div>
                  <button type="button" className="btn !px-2" onClick={() => setPreview(s)} aria-label={`Aperçu de ${s.title}`} title="Aperçu"><Icon name="eye" className="h-4 w-4" /></button>
                  <button type="button" className="btn !px-2" onClick={() => edit(s)} aria-label={`Modifier ${s.title}`} title="Modifier"><Icon name="edit" className="h-4 w-4" /></button>
                  <button type="button" className="btn !px-2" onClick={() => duplicate(s)} aria-label={`Dupliquer ${s.title}`} title="Dupliquer"><Icon name="copy" className="h-4 w-4" /></button>
                  <button type="button" className="btn btn-danger !px-2" onClick={() => remove(s)} aria-label={`Supprimer ${s.title}`} title="Supprimer"><Icon name="trash" className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          </div>

          {preview && (
            <div className="card animate-pop overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-sm font-bold">
                Aperçu : {preview.title}
                <button type="button" onClick={() => setPreview(null)} aria-label="Fermer l'aperçu">
                  <Icon name="x" className="h-4 w-4" />
                </button>
              </div>
              <MailReader key={preview.id + preview.subject} scenario={preview} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, max, mono, placeholder }: { label: string; value: string; onChange: (v: string) => void; max: number; mono?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className={`input ${mono ? "font-mono" : ""}`} value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Select({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="pass">pass (valide)</option>
        <option value="fail">fail (échec)</option>
        <option value="none">none (absent)</option>
      </select>
    </label>
  );
}
