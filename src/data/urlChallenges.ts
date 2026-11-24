/**
 * Défis du Module 3 — "Inspecteur d'URL".
 * Chaque URL est découpée à la main en segments typés. L'élève doit :
 *   1) cliquer sur le segment qui désigne le VRAI nom de domaine (le propriétaire du site) ;
 *   2) juger si l'URL est légitime ou piégée.
 *
 * Règle d'or : le vrai domaine = les deux derniers "mots" du nom d'hôte
 * (avant le premier "/" et après un éventuel "@"), ex. : mail.google.com → google.com
 */
export type SegmentRole = "scheme" | "userinfo" | "sub" | "domain" | "path";

export interface Segment {
  text: string;
  role: SegmentRole;
}

export interface UrlChallenge {
  id: string;
  brand: string; // marque que le mail prétend représenter
  technique: string; // nom de la technique d'attaque (ou "Légitime")
  legit: boolean;
  segments: Segment[];
  explanation: string;
}

export const URL_CHALLENGES: UrlChallenge[] = [
  {
    id: "u-paypal-sous-domaine",
    brand: "PayPal",
    technique: "Sous-domaine trompeur",
    legit: false,
    segments: [
      { text: "https://", role: "scheme" },
      { text: "www.paypal.com.", role: "sub" },
      { text: "secure-login.info", role: "domain" },
      { text: "/signin", role: "path" },
    ],
    explanation:
      "On lit le nom d'hôte de droite à gauche : le vrai domaine est « secure-login.info ». « www.paypal.com. » n'est qu'un sous-domaine choisi par l'attaquant pour vous rassurer.",
  },
  {
    id: "u-paypal-legit",
    brand: "PayPal",
    technique: "Légitime",
    legit: true,
    segments: [
      { text: "https://", role: "scheme" },
      { text: "www.", role: "sub" },
      { text: "paypal.com", role: "domain" },
      { text: "/signin", role: "path" },
    ],
    explanation:
      "Le domaine « paypal.com » est bien celui de PayPal, « www » est un simple sous-domaine. Protocole HTTPS. Rien d'anormal.",
  },
  {
    id: "u-google-majuscule-i",
    brand: "Google",
    technique: "Typosquatting (I majuscule / l minuscule)",
    legit: false,
    segments: [
      { text: "https://", role: "scheme" },
      { text: "accounts.", role: "sub" },
      { text: "googIe.com", role: "domain" },
      { text: "/signin", role: "path" },
    ],
    explanation:
      "Dans « googIe », le caractère n'est pas un « l » minuscule mais un « i » MAJUSCULE (I). Dans beaucoup de polices sans empattement, les deux sont identiques. Astuce : copiez l'URL dans un éditeur à police à chasse fixe.",
  },
  {
    id: "u-amazon-rn",
    brand: "Amazon",
    technique: "Typosquatting (rn → m)",
    legit: false,
    segments: [
      { text: "https://", role: "scheme" },
      { text: "www.", role: "sub" },
      { text: "arnazon.fr", role: "domain" },
      { text: "/mon-compte/commandes", role: "path" },
    ],
    explanation:
      "« rn » (r + n) ressemble à « m » : « arnazon » n'est pas « amazon ». D'autres classiques : 0 pour o, 1 pour l, vv pour w.",
  },
  {
    id: "u-apple-homoglyphe",
    brand: "Apple",
    technique: "Homoglyphe (alphabet cyrillique)",
    legit: false,
    segments: [
      { text: "https://", role: "scheme" },
      { text: "www.", role: "sub" },
      { text: "\u0430pple.com", role: "domain" }, // « а » cyrillique U+0430
      { text: "/fr/verification-identifiant", role: "path" },
    ],
    explanation:
      "Le premier « а » est la lettre cyrillique U+0430, visuellement identique au « a » latin. Le navigateur envoie en réalité vers « xn--pple-43d.com » (punycode). Méfiez-vous d'un domaine qui s'affiche en « xn-- ».",
  },
  {
    id: "u-service-public-legit",
    brand: "Service-Public.fr",
    technique: "Légitime",
    legit: true,
    segments: [
      { text: "https://", role: "scheme" },
      { text: "www.", role: "sub" },
      { text: "service-public.fr", role: "domain" },
      { text: "/particuliers/vosdroits/N359", role: "path" },
    ],
    explanation:
      "Domaine officiel « service-public.fr » (le tiret est légitime : ce n'est pas lui qui rend une URL suspecte, c'est le propriétaire du domaine).",
  },
  {
    id: "u-ameli-arobase",
    brand: "Ameli (Assurance Maladie)",
    technique: "Astuce de l'arobase (userinfo)",
    legit: false,
    segments: [
      { text: "https://", role: "scheme" },
      { text: "ameli.fr@", role: "userinfo" },
      { text: "compte-assure.xyz", role: "domain" },
      { text: "/connexion", role: "path" },
    ],
    explanation:
      "Tout ce qui précède le « @ » est un identifiant utilisateur (userinfo), PAS le serveur. Le navigateur se connecte à « compte-assure.xyz ». Le trompeur « ameli.fr@ » n'est là que pour vous induire en erreur.",
  },
  {
    id: "u-ent-sous-domaine",
    brand: "ENT du lycée",
    technique: "Sous-domaine trompeur (nom d'établissement)",
    legit: false,
    segments: [
      { text: "https://", role: "scheme" },
      { text: "ent.lycee-jean-moulin.fr.", role: "sub" },
      { text: "portail-eleves.com", role: "domain" },
      { text: "/login", role: "path" },
    ],
    explanation:
      "Le nom du lycée figure bien dans l'URL, mais il est placé AVANT le vrai domaine « portail-eleves.com ». Le propriétaire de ce domaine peut créer n'importe quel sous-domaine.",
  },
  {
    id: "u-pronote-legit",
    brand: "Pronote (Index Éducation)",
    technique: "Légitime",
    legit: true,
    segments: [
      { text: "https://", role: "scheme" },
      { text: "www.", role: "sub" },
      { text: "index-education.net", role: "domain" },
      { text: "/fr/pronote", role: "path" },
    ],
    explanation:
      "« index-education.net » est le domaine de l'éditeur de Pronote. Les espaces des établissements sont généralement sous leur propre domaine d'ENT : vérifiez toujours avec l'adresse fournie par votre lycée.",
  },
  {
    id: "u-microsoft-legit",
    brand: "Microsoft 365",
    technique: "Légitime (domaine surprenant)",
    legit: true,
    segments: [
      { text: "https://", role: "scheme" },
      { text: "login.", role: "sub" },
      { text: "microsoftonline.com", role: "domain" },
      { text: "/common/oauth2/authorize", role: "path" },
    ],
    explanation:
      "Surprise : « microsoftonline.com » est bien un domaine appartenant à Microsoft, utilisé pour l'authentification Microsoft 365. Un domaine qui ne contient pas le nom de la marque n'est pas forcément faux : il faut le connaître ou le vérifier à la source.",
  },
];
