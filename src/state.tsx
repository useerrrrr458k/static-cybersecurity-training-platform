/**
 * state.tsx — État global : progression (localStorage), scénarios, thème.
 * Tout reste dans le navigateur. Aucune donnée n'est envoyée nulle part.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import baseData from "./data/scenarios.json";
import { URL_CHALLENGES } from "./data/urlChallenges";
import { validateScenarioList } from "./lib/security";
import {
  applyTheme,
  emptyProgress,
  loadCustomScenarios,
  loadProgress,
  loadTheme,
  saveCustomScenarios,
  saveProgress,
  type Progress,
  type Theme,
} from "./lib/storage";
import type { Scenario } from "./types";

// Même le fichier du dépôt est re-validé au démarrage (défense en profondeur).
function loadBaseScenarios(): Scenario[] {
  const r = validateScenarioList((baseData as { scenarios: unknown }).scenarios);
  return r.ok ? r.value : [];
}
const BASE_SCENARIOS = loadBaseScenarios();

interface AppState {
  progress: Progress;
  scenarios: Scenario[];
  hasCustomScenarios: boolean;
  theme: Theme;
  toggleTheme: () => void;
  recordMail: (id: string, correct: boolean) => void;
  recordUrl: (id: string, correct: boolean) => void;
  markPw: (key: keyof Progress["pw"]) => void;
  resetModule: (m: "mail" | "urls" | "pw") => void;
  resetAll: () => void;
  setScenarios: (list: Scenario[]) => void;
  restoreDefaultScenarios: () => void;
  percent: { mail: number; urls: number; pw: number; global: number };
  totals: { mail: number; urls: number };
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [custom, setCustom] = useState<Scenario[] | null>(() => loadCustomScenarios());
  const [theme, setTheme] = useState<Theme>(() => loadTheme());

  const scenarios = custom ?? BASE_SCENARIOS;

  useEffect(() => applyTheme(theme), [theme]);
  useEffect(() => saveProgress(progress), [progress]);

  const update = useCallback((fn: (p: Progress) => Progress) => setProgress((p) => fn(p)), []);

  const value = useMemo<AppState>(() => {
    const mailIds = new Set(scenarios.map((s) => s.id));
    const mailDone = Object.entries(progress.mail).filter(([id, ok]) => ok && mailIds.has(id)).length;
    const urlIds = new Set(URL_CHALLENGES.map((c) => c.id));
    const urlDone = Object.entries(progress.urls).filter(([id, ok]) => ok && urlIds.has(id)).length;
    const pwDone = [progress.pw.analyzed, progress.pw.strong, progress.pw.generated].filter(Boolean).length;

    const mail = scenarios.length ? Math.round((mailDone / scenarios.length) * 100) : 0;
    const urls = Math.round((urlDone / URL_CHALLENGES.length) * 100);
    const pw = Math.round((pwDone / 3) * 100);

    return {
      progress,
      scenarios,
      hasCustomScenarios: custom !== null,
      theme,
      toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
      recordMail: (id, correct) => update((p) => ({ ...p, mail: { ...p.mail, [id]: correct } })),
      recordUrl: (id, correct) => update((p) => ({ ...p, urls: { ...p.urls, [id]: correct } })),
      markPw: (key) => update((p) => (p.pw[key] ? p : { ...p, pw: { ...p.pw, [key]: true } })),
      resetModule: (m) =>
        update((p) => {
          const fresh = emptyProgress();
          return m === "mail" ? { ...p, mail: {} } : m === "urls" ? { ...p, urls: {} } : { ...p, pw: fresh.pw };
        }),
      resetAll: () => setProgress(emptyProgress()),
      setScenarios: (list) => {
        setCustom(list);
        saveCustomScenarios(list);
      },
      restoreDefaultScenarios: () => {
        setCustom(null);
        saveCustomScenarios(null);
      },
      percent: { mail, urls, pw, global: Math.round((mail + urls + pw) / 3) },
      totals: { mail: scenarios.length, urls: URL_CHALLENGES.length },
    };
  }, [progress, scenarios, custom, theme, update]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp doit être utilisé dans <AppProvider>");
  return v;
}
