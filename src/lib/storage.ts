/**
 * storage.ts — Persistance locale (localStorage), sans aucun serveur.
 * Le localStorage est modifiable par l'utilisateur : on RE-VALIDE donc tout ce
 * qu'on y relit avant de l'utiliser (jamais de JSON.parse "à l'aveugle").
 */
import type { Scenario } from "../types";
import { validateScenarioList } from "./security";

const KEY_PROGRESS = "cyberdojo.progress.v1";
const KEY_SCENARIOS = "cyberdojo.scenarios.v1";
const KEY_THEME = "cyberdojo.theme.v1";

export interface Progress {
  mail: Record<string, boolean>; // id scénario -> bonne réponse ?
  urls: Record<string, boolean>; // id défi URL -> réussi ?
  pw: { analyzed: boolean; strong: boolean; generated: boolean };
}

export const emptyProgress = (): Progress => ({
  mail: {},
  urls: {},
  pw: { analyzed: false, strong: false, generated: false },
});

const KEY_RE = /^[a-z0-9_-]{1,48}$/;

function readBoolMap(v: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (typeof v !== "object" || v === null || Array.isArray(v)) return out;
  for (const [k, val] of Object.entries(v)) {
    if (KEY_RE.test(k) && typeof val === "boolean") out[k] = val;
  }
  return out;
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY_PROGRESS);
    if (!raw || raw.length > 100_000) return emptyProgress();
    const d: unknown = JSON.parse(raw);
    if (typeof d !== "object" || d === null) return emptyProgress();
    const o = d as Record<string, unknown>;
    const pw = (typeof o.pw === "object" && o.pw !== null ? o.pw : {}) as Record<string, unknown>;
    return {
      mail: readBoolMap(o.mail),
      urls: readBoolMap(o.urls),
      pw: { analyzed: pw.analyzed === true, strong: pw.strong === true, generated: pw.generated === true },
    };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY_PROGRESS, JSON.stringify(p));
  } catch {
    /* quota dépassé / navigation privée : on ignore, l'app reste utilisable */
  }
}

export function loadCustomScenarios(): Scenario[] | null {
  try {
    const raw = localStorage.getItem(KEY_SCENARIOS);
    if (!raw || raw.length > 400_000) return null;
    const r = validateScenarioList(JSON.parse(raw));
    return r.ok ? r.value : null;
  } catch {
    return null;
  }
}

export function saveCustomScenarios(list: Scenario[] | null): void {
  try {
    if (list === null) localStorage.removeItem(KEY_SCENARIOS);
    else localStorage.setItem(KEY_SCENARIOS, JSON.stringify(list));
  } catch {
    /* ignoré */
  }
}

export type Theme = "dark" | "light";

export function loadTheme(): Theme {
  try {
    return localStorage.getItem(KEY_THEME) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(t: Theme): void {
  document.documentElement.classList.toggle("light", t === "light");
  try {
    localStorage.setItem(KEY_THEME, t);
  } catch {
    /* ignoré */
  }
}
