/** Tableau de bord : objectifs (bonnes pratiques ANSSI), progression globale, accès rapide. */
import { Icon, type IconName } from "../components/Icons";
import { ProgressBar } from "../components/ui";
import { useApp } from "../state";
import type { PageId } from "../types";

const PRACTICES: { icon: IconName; title: string; text: string }[] = [
  { icon: "key", title: "Choisir avec soin ses mots de passe", text: "Longs, uniques, non devinables ; un gestionnaire de mots de passe et la double authentification partout où c'est possible." },
  { icon: "refresh", title: "Mettre à jour régulièrement ses logiciels", text: "Les mises à jour corrigent des failles que les attaquants exploitent activement." },
  { icon: "mail", title: "Être prudent avec sa messagerie", text: "Ne pas ouvrir les pièces jointes douteuses, ne pas cliquer sur les liens suspects, ne jamais communiquer ses identifiants par mail." },
  { icon: "download", title: "Télécharger sur les sites officiels", text: "Éviter les sites de téléchargement douteux : ils embarquent souvent des programmes malveillants." },
  { icon: "server", title: "Effectuer des sauvegardes régulières", text: "Règle 3-2-1 : 3 copies, sur 2 supports différents, dont 1 hors ligne. La meilleure parade face aux rançongiciels." },
  { icon: "lock", title: "Séparer usages personnels et professionnels", text: "Ne pas utiliser le même mot de passe ni la même adresse pour le lycée et pour vos loisirs." },
];

const MODULES: { page: PageId; icon: IconName; title: string; text: string; key: "mail" | "urls" | "pw" }[] = [
  { page: "mail", icon: "mail", title: "Vrai ou Phishing ?", text: "Boîte mail simulée : inspectez, votez, débriefez.", key: "mail" },
  { page: "password", icon: "key", title: "Mot de passe", text: "Entropie, diversité, temps de craquage, 100 % local.", key: "pw" },
  { page: "url", icon: "link", title: "Inspecteur d'URL", text: "Typosquatting, sous-domaines, homoglyphes.", key: "urls" },
];

function Ring({ value }: { value: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-36 w-36 place-items-center" role="img" aria-label={`Progression globale : ${value}%`}>
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--c-line)" strokeWidth="9" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke="var(--c-accent)" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * value) / 100}
          style={{ transition: "stroke-dashoffset 1s ease", filter: "drop-shadow(0 0 6px var(--c-accent))" }}
        />
      </svg>
      <div className="text-center">
        <div className="text-4xl font-extrabold">{value}%</div>
        <div className="text-[10px] uppercase tracking-widest text-muted">complété</div>
      </div>
    </div>
  );
}

export function Dashboard({ go }: { go: (p: PageId) => void }) {
  const { percent, totals, progress, resetAll } = useApp();
  const mailDone = Object.values(progress.mail).filter(Boolean).length;
  const subtitle: Record<"mail" | "urls" | "pw", string> = {
    mail: `${Math.min(mailDone, totals.mail)}/${totals.mail} e-mails réussis`,
    urls: `${Object.values(progress.urls).filter(Boolean).length}/${totals.urls} défis réussis`,
    pw: `${[progress.pw.analyzed, progress.pw.strong, progress.pw.generated].filter(Boolean).length}/3 objectifs`,
  };

  return (
    <div className="animate-fade-up space-y-8">
      {/* Hero */}
      <section className="card relative overflow-hidden p-6 sm:p-8">
        <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" /> Bac Pro CIEL · Sensibilisation
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
              Ne mordez pas à <span className="bg-gradient-to-r from-accent to-ok bg-clip-text text-transparent">l'hameçon</span>.
            </h1>
            <p className="mt-4 text-base text-muted sm:text-lg">
              Entraînez-vous face à de faux e-mails, testez la solidité de vos mots de passe et apprenez à démasquer les liens piégés. Pour les élèves et les professeurs du lycée, sans compte, sans serveur, sans collecte de données.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" className="btn btn-primary !px-5 !py-3" onClick={() => go("mail")}>
                Commencer l'entraînement <Icon name="chevron" className="h-4 w-4" />
              </button>
              <button type="button" className="btn !px-5 !py-3" onClick={() => go("password")}>
                Tester un mot de passe
              </button>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <Ring value={percent.global} />
            <p className="text-xs text-muted">Progression sauvegardée sur cet appareil</p>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section aria-labelledby="mods">
        <h2 id="mods" className="mb-4 text-xl font-bold">
          Modules d'entraînement
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {MODULES.map((m, i) => (
            <button key={m.page} type="button" onClick={() => go(m.page)} style={{ animationDelay: `${i * 80}ms` }} className="card animate-fade-up group p-5 text-left transition hover:-translate-y-1 hover:border-accent hover:shadow-lg hover:shadow-accent/10">
              <div className="mb-4 flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/30">
                  <Icon name={m.icon} className="h-5 w-5" />
                </span>
                <span className="text-sm font-extrabold">{percent[m.key]}%</span>
              </div>
              <h3 className="font-bold">{m.title}</h3>
              <p className="mt-1 text-sm text-muted">{m.text}</p>
              <ProgressBar value={percent[m.key]} className="mt-4" />
              <p className="mt-2 text-xs text-muted">{subtitle[m.key]}</p>
            </button>
          ))}
        </div>
      </section>

      {/* ANSSI */}
      <section aria-labelledby="anssi">
        <h2 id="anssi" className="text-xl font-bold">
          Nos objectifs : les bonnes pratiques de l'ANSSI
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          La plateforme s'inspire du « Guide des bonnes pratiques de l'informatique » de l'ANSSI (Agence nationale de la sécurité des systèmes d'information) et des conseils de cybermalveillance.gouv.fr.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {PRACTICES.map((p) => (
            <div key={p.title} className="card flex gap-3 p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface2 text-accent">
                <Icon name={p.icon} className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold">{p.title}</h3>
                <p className="mt-1 text-sm text-muted">{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Réflexes */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-bold">
            <Icon name="target" className="h-5 w-5 text-accent" /> Les 5 réflexes face à un message suspect
          </h2>
          <ol className="space-y-2 text-sm">
            {[
              "Qui m'écrit ? Vérifier l'adresse réelle de l'expéditeur, pas seulement son nom.",
              "Que me demande-t-on ? Mot de passe, paiement, code reçu par SMS : on se méfie.",
              "Quelle pression ? Urgence, menace, gain inattendu : signaux classiques.",
              "Où mène le lien ? Le survoler sans cliquer et lire le vrai domaine.",
              "En cas de doute : ne pas répondre, vérifier par un autre canal, signaler.",
            ].map((t, i) => (
              <li key={t} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/15 text-xs font-bold text-accent">{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>
        </div>
        <div className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-bold">
            <Icon name="shieldCheck" className="h-5 w-5 text-ok" /> Signaler & se faire aider
          </h2>
          <ul className="space-y-2 text-sm text-muted">
            <li>
              <strong className="text-fg">signal-spam.fr</strong> — signaler un e-mail frauduleux.
            </li>
            <li>
              <strong className="text-fg">33700</strong> — transférer gratuitement un SMS suspect.
            </li>
            <li>
              <strong className="text-fg">cybermalveillance.gouv.fr</strong> — assistance et diagnostic en cas d'incident.
            </li>
            <li>
              <strong className="text-fg">Au lycée</strong> — prévenir immédiatement l'administrateur réseau / le référent numérique.
            </li>
          </ul>
          <button type="button" className="btn mt-4 text-xs" onClick={() => window.confirm("Effacer toute votre progression sur cet appareil ?") && resetAll()}>
            <Icon name="trash" className="h-4 w-4" /> Réinitialiser ma progression
          </button>
        </div>
      </section>
    </div>
  );
}
