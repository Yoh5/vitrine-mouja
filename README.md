# Mouja — site vitrine de club de sport & bien-être (démonstration)

Troisième site vitrine du portfolio freelance. **Établissement fictif** (Aïn Diab, Casablanca) :
adresse, téléphone, coachs et tarifs sont des exemples, et le pied de page le dit.

| Demande récurrente d'une salle de sport | Où c'est dans le site |
|---|---|
| Français, anglais **et arabe** | sélecteur FR / EN / عربي ; l'arabe retourne toute la page (`dir="rtl"`) ; `?lang=ar` dans l'adresse |
| Le planning des cours | « Planning » : semaine en 7 colonnes sur ordinateur, un jour à la fois sur téléphone ; filtre par discipline ; le jour courant est marqué |
| Réserver un cours | un clic sur un cours du planning le **présélectionne à sa prochaine date** dans le formulaire ; le message WhatsApp est composé dans la langue du site |
| Séance d'essai | les boutons « Séance d'essai » cochent la case « première séance », reprise dans le message |
| Les abonnements | 3 formules, bascule mensuel / annuel ; « Je choisis » ouvre WhatsApp avec la formule et la période |
| « Modifier moi-même le planning et les prix » | **tout le contenu est dans `content.js`** : textes des trois langues, disciplines, cours, coachs, tarifs, horaires |
| Avis clients « si disponibles » | section masquée tant que `reviews` est vide — on n'invente pas d'avis |

## Lancer

Aucune installation : servir le dossier (`npx http-server`) et ouvrir l'adresse affichée.
Hébergement : n'importe quel hébergeur statique.

## Adapter à un vrai client

1. `content.js` → `config.whatsapp` (indicatif sans « + »), `phone`, `email`.
2. `schedule` : un cours = jour (0 = dimanche), heure, discipline, coach, niveau. Le planning ET les
   séances proposées dans le formulaire en découlent.
3. `disciplines`, `coaches`, `plans` (prix en dirhams ; `yearly: null` = pas de formule annuelle).
4. Photos : remplacer `assets/photos/` (WebP ~1 600 px), puis **vider `credits`**.
5. Retirer « établissement fictif » de `footer.demo` et `book.addressText`.

## Choix de conception — distinct de Dar Zellige et de Warda

- **Sujet → la piste et le béton.** La base ui-ux-pro-max propose pour une salle de sport de l'orange
  « énergie » et du vert sur ardoise : générique, ne dit rien de Casablanca. Retenu : béton clair de la
  « ville blanche », encre, océan Atlantique pour les sections sombres, **un seul accent vermillon**.
- **Formes** : angles vifs, bordures pleines, ombres décalées sans flou, lignes de couloir en fond,
  numéros de section en plaques de départ (01 à 07), photo d'accueil coupée en biais. Aucune arche
  (Dar Zellige), aucun pétale (Warda).
- **Typographie** condensée : Barlow Condensed + Barlow ; Changa + IBM Plex Sans Arabic en arabe
  (sans espacement des lettres, qui casserait les liaisons).
- **Photos en noir et blanc** pour les disciplines et le club, seule la photo d'accueil reste en couleur.
- **Coachs sans visage** : monogrammes. Un portrait de banque d'images sous un prénom inventé
  ferait passer un inconnu pour un employé.
- **Contrastes mesurés** : encre/béton 15,4 · gris/béton 5,7 · vermillon foncé/béton 5,0 · blanc/vermillon
  foncé 6,0 · béton/océan 9,9 · erreur/océan 7,0 · blanc/vert WhatsApp 5,3. Le vermillon vif (3,5 sur
  béton) ne porte que du très grand texte.
- Accessibilité : lien d'évitement, focus visible (clair sur fond sombre), filtres et jours en
  `aria-pressed`, intensité annoncée en texte (« Intensité 3 sur 3 »), disciplines repérées par leur nom
  et pas seulement par la couleur, erreurs à côté du champ et annoncées, cibles ≥ 44 px, animations
  coupées si `prefers-reduced-motion`.

## Photos

7 photos Wikimedia Commons (CC BY, CC BY-SA, une CC0), auteurs crédités en pied de page ; détail dans
`assets/photos/credits.json`. Aucune ne montre un établissement réel nommé.

## Vérifié le 10/11/2026

- Bureau 1 280 px en français ; mobile 375 px en arabe, sans défilement horizontal ; console sans erreur.
- Formulaire vide → 3 erreurs annoncées, focus sur le premier champ ; un cours du jeudi cliqué dans le
  planning → présélectionné au « jeudi 12 novembre » ; message WhatsApp composé en arabe avec la mention
  de séance d'essai ; bascule annuelle → 4 500 et 3 000 DH, la carte 10 séances inchangée.
- Fenêtre de réservation = aujourd'hui + 7 jours : un cours déjà passé ce soir reste réservable pour la
  semaine suivante (aucun cours grisé dans le planning).
- Les trois langues ont exactement les mêmes 108 clés de traduction.
