/**
 * Types partagés de l'application.
 * Un scénario de phishing est une donnée PURE (aucun HTML) : le corps du mail est
 * une liste de "blocs" typés. Le composant d'affichage décide seul comment les rendre,
 * ce qui supprime à la source le risque d'injection de balises (XSS stocké).
 */

export type AuthResult = "pass" | "fail" | "none";

export type BodyBlock =
  | { type: "p"; text: string }
  | { type: "link"; text: string; href: string }
  | { type: "button"; text: string; href: string }
  | { type: "attachment"; name: string; size: string };

export interface Clue {
  kind: "red" | "green";
  text: string;
}

export interface Scenario {
  id: string;
  title: string; // titre interne (liste / éditeur)
  difficulty: 1 | 2 | 3;
  isPhishing: boolean;
  senderName: string; // nom affiché
  senderEmail: string; // vraie adresse (visible dans l'en-tête détaillé)
  replyTo: string; // "" si absent
  to: string;
  subject: string;
  date: string;
  spf: AuthResult;
  dkim: AuthResult;
  body: BodyBlock[];
  clues: Clue[];
  explanation: string;
}

export type PageId = "home" | "mail" | "password" | "url" | "editor";
