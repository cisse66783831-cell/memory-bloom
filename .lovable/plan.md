

# Refonte visuelle REVIVO -- Style lettrepourtoi.com

## Objectif
Adopter la charte graphique moderne et les patterns de design de lettrepourtoi.com tout en conservant l'identite REVIVO (restauration photo, nostalgie, souvenirs de famille).

## Changements principaux

### 1. Palette de couleurs -- Fond sombre moderne
Passer du fond beige/sepia actuel a un fond sombre type navy/slate, avec des accents chauds.

| Element | Avant | Apres |
|---------|-------|-------|
| Background | Beige (#F2E6D8) | Slate sombre (#0B1120) |
| Foreground | Noir doux (#2B2B2B) | Blanc casse (#F1F5F9) |
| Primary | Olive vert (#7A8F5A) | Ambre dore (#D4A853) |
| Cards | Cream | Slate translucide avec bordure subtile |
| Accents | Sepia | Gradient dore/ambre |

### 2. Hero Section -- Structure lettrepourtoi.com
- Badge pill en haut : "VOS SOUVENIRS MERITENT UNE SECONDE VIE"
- Grand titre bold avec un mot en italique accentue : "Redonnez vie a vos *anciennes photos*"
- Sous-titre descriptif
- Deux CTA : bouton primaire avec fleche + bouton outline "Voir des exemples"
- Social proof : avatars empiles + note + "Plus de X photos restaurees"
- Image hero a droite (garder le floating frame mais sur fond sombre)

### 3. Section "Comment ca marche" -- 3 etapes en cartes
Remplacer la galerie d'exemples par une structure en 3 etapes numerotees comme lettrepourtoi.com :
1. "Importez votre photo" -- description courte
2. "La magie opere" -- description du traitement
3. "Telechargez le resultat" -- description du resultat

### 4. Section Exemples -- Galerie modernisee
- Titre avec badge pill
- Cartes de temoignages/exemples avant-apres en grille
- Animations au scroll (whileInView)

### 5. Section Tarif -- Carte de prix style lettrepourtoi
- Badge "Tarif simple"
- Titre "Un prix, un souvenir restaure"
- Carte centree avec prix, features, CTA
- Badges de confiance en bas (paiement securise, acces immediat)

### 6. Section FAQ -- Accordion
- Questions frequentes avec accordion Radix
- Style clean sur fond sombre

### 7. Header -- Navigation modernisee
- Logo REVIVO a gauche
- Liens de navigation au centre (Le Concept, Exemples, Tarif)
- Bouton "Connexion" pill a droite
- Background transparent puis solid au scroll

### 8. Footer -- Minimaliste
- Copyright + liens utiles

### 9. Animations globales
- Scroll-triggered animations (whileInView avec framer-motion)
- Transitions douces entre sections
- Hover effects sur les cartes (scale + shadow)
- Badge pills avec animations d'entree

## Fichiers a modifier

| Fichier | Nature du changement |
|---------|---------------------|
| `src/index.css` | Nouvelle palette sombre, variables CSS, gradients, classes utilitaires |
| `tailwind.config.ts` | Couleurs mises a jour, nouvelles animations |
| `src/pages/Index.tsx` | Restructuration complete : hero, how-it-works, exemples, tarif, FAQ |
| `src/components/Header.tsx` | Navigation avec liens anchor, fond transparent/scroll, style pill |
| `src/components/FloatingPhotoFrame.tsx` | Adapter au fond sombre |
| `src/components/ExamplesGallery.tsx` | Refonte en grille de cartes modernes |
| `src/components/PhotoUploader.tsx` | Adapter au theme sombre |
| `src/components/PaymentSection.tsx` | Style carte prix lettrepourtoi |
| `src/components/ProcessingLoader.tsx` | Adapter au theme sombre |
| `src/components/BeforeAfterSlider.tsx` | Adapter au theme sombre |
| `src/components/SuccessDownload.tsx` | Adapter au theme sombre |
| `src/components/UpsellSection.tsx` | Adapter au theme sombre |

## Details techniques

### Nouvelle palette CSS (index.css)
```text
--background: 222 47% 8%     (slate sombre)
--foreground: 210 40% 96%    (blanc casse)
--primary: 38 65% 58%        (ambre dore)
--card: 222 30% 12%          (slate un peu plus clair)
--muted: 222 20% 20%         (gris slate)
--border: 222 15% 18%        (bordure subtile)
```

### Structure de la page Index
```text
[Header - fixed, transparent -> solid on scroll]
[Hero - 2 colonnes : texte + image]
[How it works - 3 cartes numerotees]
[Exemples avant/apres - grille]
[Tarif - carte centree]
[FAQ - accordion]
[Footer]
```

### Animations communes
- `whileInView={{ opacity: 1, y: 0 }}` pour les entrees au scroll
- `initial={{ opacity: 0, y: 30 }}` pour les etats initiaux
- `viewport={{ once: true, margin: "-100px" }}` pour le declenchement
- Hover cards : `whileHover={{ y: -4 }}` avec transition de shadow

### Pages Auth, Dashboard, Admin, Partner
- Adapter les fonds et couleurs pour etre coherent avec le theme sombre
- Garder la structure fonctionnelle existante

