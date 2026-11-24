# 🛡️ CyberDojo CIEL — Plateforme d'entraînement au phishing et à la cybersécurité

Projet pédagogique **Bac Pro CIEL** (Cybersécurité, Informatique et réseaux, Électronique) destiné aux élèves et aux professeurs du lycée.

> **100 % statique** : aucun back-end, aucune base de données, aucun cookie, aucun traceur.
> Hébergeable gratuitement sur **GitHub Pages**.

## ✨ Fonctionnalités

| Module | Description |
|---|---|
| 🏠 **Tableau de bord** | Objectifs (bonnes pratiques ANSSI), progression globale (localStorage), accès rapide |
| 📧 **Module 1 – Vrai ou Phishing ?** | Boîte mail simulée, 10 scénarios (dont 3 légitimes pour éviter les faux positifs), inspection des liens au survol, détails d'en-tête (De / Reply-To / SPF / DKIM), vote puis débriefing détaillé |
| 🔑 **Module 2 – Mot de passe** | Entropie en bits, diversité des caractères, temps de craquage (GPU RTX 4090, 3 algorithmes), détection de motifs, générateur `crypto.getRandomValues`, **100 % local** |
| 🔗 **Module 3 – Inspecteur d'URL** | 10 défis (typosquatting, sous-domaines trompeurs, homoglyphes, astuce du `@`…) + analyseur libre d'URL |
| ✏️ **Mode Éditeur / Professeur** | Création/modification de scénarios, aperçu, **export / import `scenarios.json`** validés |
| 🌗 **UI/UX** | Thème sombre par défaut + thème clair, responsive (barre latérale PC, onglets mobile), animations fluides, navigation SPA instantanée |

---

## 🗂️ Arborescence du dépôt

```text
cyberdojo-ciel/
├── .github/
│   └── workflows/
│       └── deploy.yml            # Build + déploiement automatique sur GitHub Pages
├── src/
│   ├── main.tsx                  # Point d'entrée (applique le thème, monte React)
│   ├── App.tsx                   # Coquille SPA : navigation par hash validé (liste blanche)
│   ├── index.css                 # Tailwind CSS + thèmes (variables CSS) + animations
│   ├── state.tsx                 # État global : progression, scénarios, thème
│   ├── types.ts                  # Types TypeScript (Scenario, BodyBlock, Clue…)
│   ├── data/
│   │   ├── scenarios.json        # ⭐ Scénarios de phishing (fichier à remplacer après export)
│   │   └── urlChallenges.ts      # Défis du Module 3
│   ├── lib/
│   │   ├── security.ts           # 🔒 Validation stricte / assainissement des entrées
│   │   ├── storage.ts            # localStorage (re-validé à chaque lecture)
│   │   ├── password.ts           # Entropie, temps de craquage, générateur crypto
│   │   └── urlAnalyzer.ts        # Analyse heuristique d'URL
│   ├── components/
│   │   ├── Icons.tsx             # Icônes SVG inline (aucune dépendance externe)
│   │   ├── MailReader.tsx        # Lecteur d'e-mail simulé (liens jamais ouverts)
│   │   └── ui.tsx                # Composants d'interface réutilisables
│   └── modules/
│       ├── Dashboard.tsx         # Accueil
│       ├── PhishingSim.tsx       # Module 1
│       ├── PasswordLab.tsx       # Module 2
│       ├── UrlInspector.tsx      # Module 3
│       └── Editor.tsx            # Mode éditeur / professeur
├── index.html                    # Page unique + Content-Security-Policy
├── package.json
├── vite.config.ts                # Vite + Tailwind + « single file » (tout dans index.html)
├── tsconfig.json
└── README.md
```

---

## 🧱 Architecture technique

- **Langage / outils** : TypeScript + React (rendu), Vite (build), **Tailwind CSS** (styles).
  Le résultat du build est **un unique fichier `dist/index.html`** (JS et CSS intégrés) :
  du *HTML5 + CSS3 + JavaScript ES6+ pur* dans le navigateur, sans serveur.
- **SPA sans rechargement** : la navigation utilise le *hash* (`#/mail`, `#/password`…). Cela fonctionne tel quel sur GitHub Pages (pas de réécriture d'URL serveur) et le bouton « Retour » du navigateur reste fonctionnel.
- **Données** : les scénarios sont du **JSON pur** (pas de HTML). Le corps d'un mail est une liste de *blocs typés* (`p`, `link`, `button`, `attachment`) : c'est le composant d'affichage qui décide comment les rendre.
- **Persistance** : `localStorage` uniquement (progression, thème, scénarios modifiés en local).
- **Thèmes** : variables CSS (`--c-bg`, `--c-accent`…) exposées à Tailwind comme couleurs sémantiques ; la classe `light` sur `<html>` bascule le thème.

### Flux de données

```text
scenarios.json ──► validateScenarioList() ──► état React ──► <MailReader/> (texte échappé)
localStorage  ──► re-validation stricte   ──┘
Fichier importé ─► taille → JSON.parse (try) → liste blanche de champs → URL http(s) only
```

---

## 🔐 Choix de sécurité (à présenter à l'oral)

| # | Risque (OWASP) | Mesure appliquée | Où ? |
|---|---|---|---|
| 1 | **DOM XSS** | **Aucun `innerHTML` / `dangerouslySetInnerHTML` / `eval`** dans le projet. Toute donnée dynamique est insérée comme *texte* via React (échappement automatique, équivalent de `textContent`). | tout le code |
| 2 | **XSS stocké** | Le corps d'un mail n'est **pas du HTML** mais des blocs typés ; impossible d'injecter `<script>` ou `<img onerror=…>`. | `types.ts`, `MailReader.tsx` |
| 3 | **Entrées non fiables** (JSON importé, localStorage, formulaires) | **Validation par liste blanche** : on *reconstruit* chaque objet champ par champ (clés inconnues ignorées → pas de pollution de prototype), types vérifiés, **longueurs bornées**, nombre d'éléments limité, `id` au format strict. | `lib/security.ts` |
| 4 | **Schémas d'URL dangereux** (`javascript:`, `data:`) | Seuls `http:` et `https:` sont acceptés. De plus, **les liens simulés ne sont jamais ouverts** (`href="#"` + `preventDefault`) : l'URL réelle est juste *affichée*. | `security.ts`, `MailReader.tsx`, `urlAnalyzer.ts` |
| 5 | **Trojan Source / caractères invisibles** | Suppression des caractères de contrôle, *zero-width* et bidirectionnels (U+202E…). | `cleanText()` |
| 6 | **Exfiltration de données** | **CSP** : `default-src 'none'` + `connect-src 'self'` → le JS ne peut contacter **aucun** serveur externe. Preuve technique du *Privacy by Design* pour l'analyseur de mots de passe. | `index.html` |
| 7 | **Clickjacking / fuite de referrer** | `<meta name="referrer" content="no-referrer">`, `form-action 'none'`, `base-uri 'none'`, `object-src 'none'`. | `index.html` |
| 8 | **Aléa faible** | Générateur de mots de passe via `crypto.getRandomValues` + *rejection sampling* (pas de *modulo bias*), jamais `Math.random()`. | `lib/password.ts` |
| 9 | **Donnée sensible** | Le mot de passe saisi n'est **jamais stocké** (ni localStorage, ni logs) ; seuls des booléens de progression sont sauvegardés. `autocomplete="off"`. | `PasswordLab.tsx` |
| 10 | **Chaîne d'approvisionnement** | Peu de dépendances (React, Tailwind), aucun CDN, aucune police ni script externe, `npm ci` + lockfile en CI. | `package.json`, `deploy.yml` |
| 11 | **Navigation** | Le hash d'URL est comparé à une **liste blanche** de pages avant usage. | `App.tsx` |

### ⚠️ Limites assumées (honnêteté technique)

- La CSP contient `'unsafe-inline'` pour `script-src`/`style-src` **uniquement** car le build « fichier unique » intègre JS/CSS dans `index.html`. GitHub Pages ne permet pas de définir des en-têtes HTTP : la CSP est donc posée via `<meta>`. *Amélioration possible* : désactiver `vite-plugin-singlefile` pour servir des fichiers `.js`/`.css` séparés et retirer `'unsafe-inline'`.
- Le **mode Éditeur n'est pas authentifié** (impossible sur un site statique). La vraie protection est celle du dépôt GitHub : seuls les collaborateurs peuvent publier ; on peut exiger une *Pull Request* relue (branche `main` protégée).
- Le calcul d'entropie est une **estimation pédagogique** (modèle simple + petit dictionnaire). Pour un usage réel, on utiliserait une bibliothèque comme *zxcvbn*.
- Les vitesses de craquage sont des **ordres de grandeur** issus de benchmarks publics Hashcat pour une RTX 4090.

---

## 🚀 Installation et développement local

Pré-requis : [Node.js](https://nodejs.org) ≥ 20.

```bash
git clone https://github.com/<votre-compte>/cyberdojo-ciel.git
cd cyberdojo-ciel
npm install
npm run dev        # serveur de développement (http://localhost:5173)
npm run build      # génère dist/index.html (fichier unique)
npm run preview    # prévisualise le build
```

---

## 🌐 Déployer sur GitHub Pages — pas à pas

### Méthode recommandée : GitHub Actions (automatique)

1. **Créez un dépôt** sur GitHub (ex. `cyberdojo-ciel`), en *Public* (Pages gratuit).
2. **Envoyez le code** :
   ```bash
   git init
   git add .
   git commit -m "Première version de CyberDojo CIEL"
   git branch -M main
   git remote add origin https://github.com/<votre-compte>/cyberdojo-ciel.git
   git push -u origin main
   ```
3. Sur GitHub : **Settings → Pages → Build and deployment → Source : « GitHub Actions »**.
4. Onglet **Actions** : le workflow *« Déployer sur GitHub Pages »* se lance à chaque `push` sur `main`.
5. Une fois le workflow vert ✅, le site est en ligne sur
   `https://<votre-compte>.github.io/cyberdojo-ciel/`.

> 💡 **Aucune configuration de `base` n'est nécessaire** : le build ne référence aucun fichier externe (tout est dans `index.html`) et la navigation utilise le hash. Le site fonctionne donc dans un sous-dossier `/nom-du-depot/`.

### Méthode alternative : sans GitHub Actions

1. `npm run build` en local.
2. Publiez le contenu de `dist/` sur une branche `gh-pages` (par ex. `npx gh-pages -d dist`).
3. **Settings → Pages → Source : « Deploy from a branch » → `gh-pages` / `/ (root)`**.

---

## 🧑‍🏫 Mettre à jour les scénarios (mode professeur)

1. Ouvrez le site → onglet **Éditeur**.
2. Créez / modifiez des scénarios ; utilisez **Aperçu** pour vérifier le rendu.
3. Cliquez **« Exporter scenarios.json »**.
4. Remplacez `src/data/scenarios.json` dans le dépôt par le fichier exporté :
   ```bash
   git add src/data/scenarios.json
   git commit -m "Nouveaux scénarios de phishing"
   git push
   ```
5. GitHub Actions reconstruit et redéploie : **tous les élèves** voient les nouveaux scénarios.

Pour **réviser** un fichier reçu d'un collègue : bouton **« Importer un JSON »** (validation automatique, import refusé si le fichier est invalide).

### Format de `scenarios.json`

```json
{
  "version": 1,
  "scenarios": [
    {
      "id": "mon-scenario",
      "title": "Titre interne",
      "difficulty": 1,
      "isPhishing": true,
      "senderName": "Nom affiché",
      "senderEmail": "vraie.adresse@domaine.fr",
      "replyTo": "",
      "to": "vous",
      "subject": "Objet du mail",
      "date": "Lun. 12 mai 2025, 07:42",
      "spf": "fail",
      "dkim": "none",
      "body": [
        { "type": "p", "text": "Texte…" },
        { "type": "button", "text": "Cliquez ici", "href": "https://faux-domaine.top/login" },
        { "type": "link", "text": "https://vrai-domaine.fr", "href": "https://faux-domaine.top/login" },
        { "type": "attachment", "name": "Facture.pdf.exe", "size": "1,2 Mo" }
      ],
      "clues": [
        { "kind": "red", "text": "Indice d'alerte" },
        { "kind": "green", "text": "Indice rassurant" }
      ],
      "explanation": "À retenir…"
    }
  ]
}
```

Contraintes : `id` en `[a-z0-9_-]` (48 max) et unique ; `difficulty` ∈ {1,2,3} ; `spf`/`dkim` ∈ {`pass`,`fail`,`none`} ; URLs en `http(s)://` ; 14 blocs et 14 indices maximum ; 60 scénarios maximum.

---

## 📚 Références

- ANSSI — *Guide des bonnes pratiques de l'informatique* · [cyber.gouv.fr](https://cyber.gouv.fr)
- [cybermalveillance.gouv.fr](https://www.cybermalveillance.gouv.fr) · [signal-spam.fr](https://www.signal-spam.fr) · SMS suspect : **33700**
- OWASP — *DOM based XSS Prevention Cheat Sheet*, *Input Validation Cheat Sheet*
- Benchmarks Hashcat (RTX 4090) pour les ordres de grandeur de craquage

*Les scénarios et marques cités sont fictifs ou utilisés à des fins strictement pédagogiques.*
#   s t a t i c - c y b e r s e c u r i t y - t r a i n i n g - p l a t f o r m  
 #   s t a t i c - c y b e r s e c u r i t y - t r a i n i n g - p l a t f o r m  
 