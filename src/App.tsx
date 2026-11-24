/**
 * App.tsx — Coquille de l'application (Single Page Application).
 * La navigation se fait par le "hash" de l'URL (#/mail, #/password…) :
 *  - aucun rechargement de page, retour arrière du navigateur fonctionnel ;
 *  - compatible GitHub Pages (pas de réécriture d'URL côté serveur nécessaire) ;
 *  - le hash est VALIDÉ par liste blanche avant usage (jamais utilisé tel quel).
 */
import { useCallback, useEffect, useState } from "react";
import { Icon, type IconName } from "./components/Icons";
import { ProgressBar } from "./components/ui";
import { Dashboard } from "./modules/Dashboard";
import { Editor } from "./modules/Editor";
import { PasswordLab } from "./modules/PasswordLab";
import { PhishingSim } from "./modules/PhishingSim";
import { UrlInspector } from "./modules/UrlInspector";
import { AppProvider, useApp } from "./state";
import type { PageId } from "./types";

const NAV: { id: PageId; label: string; short: string; icon: IconName }[] = [
  { id: "home", label: "Tableau de bord", short: "Accueil", icon: "home" },
  { id: "mail", label: "Vrai ou Phishing ?", short: "Mails", icon: "mail" },
  { id: "password", label: "Mot de passe", short: "Mot de passe", icon: "key" },
  { id: "url", label: "Inspecteur d'URL", short: "URL", icon: "link" },
  { id: "editor", label: "Éditeur professeur", short: "Éditeur", icon: "edit" },
];

const PAGE_IDS = new Set<string>(NAV.map((n) => n.id));

/** Lit la page depuis le hash, avec liste blanche. */
function readHash(): PageId {
  const id = window.location.hash.replace(/^#\/?/, "");
  return PAGE_IDS.has(id) ? (id as PageId) : "home";
}

function Shell() {
  const [page, setPage] = useState<PageId>(readHash);
  const { theme, toggleTheme, percent } = useApp();

  useEffect(() => {
    const onHash = () => {
      setPage(readHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = useCallback((p: PageId) => {
    window.location.hash = `/${p}`;
  }, []);

  const themeBtn = (
    <button type="button" onClick={toggleTheme} className="btn !px-2.5" aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"} title="Changer de thème">
      <Icon name={theme === "dark" ? "sun" : "moon"} className="h-4 w-4" />
    </button>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      {/* ---------- Barre latérale (PC) ---------- */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface p-5 lg:flex">
        <Logo />
        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Navigation principale">
          {NAV.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => go(n.id)}
              aria-current={page === n.id ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                page === n.id ? "bg-accent/15 text-accent shadow-[inset_3px_0_0_var(--c-accent)]" : "text-muted hover:bg-surface2 hover:text-fg"
              }`}
            >
              <Icon name={n.icon} className="h-[18px] w-[18px]" /> {n.label}
              {n.id === "editor" && <span className="ml-auto rounded bg-line px-1.5 text-[10px] font-bold text-muted">PROF</span>}
            </button>
          ))}
        </nav>
        <div className="space-y-3 rounded-xl border border-line bg-bg p-3">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-muted">Progression</span>
            <span>{percent.global}%</span>
          </div>
          <ProgressBar value={percent.global} />
          <div className="flex items-center justify-between pt-1">
            <span className="flex items-center gap-1.5 text-[11px] text-ok">
              <Icon name="wifiOff" className="h-3.5 w-3.5" /> 100 % local
            </span>
            {themeBtn}
          </div>
        </div>
      </aside>

      {/* ---------- Barre haute (mobile) ---------- */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo compact />
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-accent">{percent.global}%</span>
          {themeBtn}
        </div>
      </header>

      {/* ---------- Contenu ---------- */}
      <main className="min-w-0 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
        <div className="mx-auto max-w-6xl">
          {page === "home" && <Dashboard go={go} />}
          {page === "mail" && <PhishingSim />}
          {page === "password" && <PasswordLab />}
          {page === "url" && <UrlInspector />}
          {page === "editor" && <Editor />}
          <footer className="mt-12 border-t border-line pt-5 text-center text-xs text-muted">
            CyberDojo CIEL · Projet pédagogique Bac Pro CIEL · Site 100 % statique — aucune donnée collectée, aucun cookie, aucun traceur.
            <br />
            Les scénarios sont fictifs. Les marques citées appartiennent à leurs propriétaires respectifs.
          </footer>
        </div>
      </main>

      {/* ---------- Barre d'onglets (mobile) ---------- */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Navigation mobile">
        {NAV.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => go(n.id)}
            aria-current={page === n.id ? "page" : undefined}
            className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition ${page === n.id ? "text-accent" : "text-muted"}`}
          >
            <Icon name={n.icon} className="h-5 w-5" />
            {n.short}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-fg shadow-lg shadow-accent/30">
        <Icon name="shieldCheck" className="h-6 w-6" />
      </span>
      <div className="leading-tight">
        <div className="text-base font-extrabold tracking-tight">CyberDojo</div>
        {!compact && <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">Bac Pro CIEL</div>}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
