
# Integration du logo REVIVO

## Objectif
Ajouter le logo uploade comme image du site et remplacer l'icone Sparkles actuelle dans le header par le vrai logo.

## Changements

### 1. Copier le logo dans le projet
- Copier `user-uploads://Gemini_Generated_Image_aqojyaaqojyaaqoj.png` vers `src/assets/logo-revivo.png`

### 2. Mettre a jour le Header (`src/components/Header.tsx`)
- Importer le logo : `import logoRevivo from "@/assets/logo-revivo.png"`
- Remplacer le bloc icone Sparkles + texte "REVIVO" par une balise `<img>` utilisant le logo
- Taille : environ 40px de hauteur, ajustee pour le header
- Supprimer l'import de `Sparkles` s'il n'est plus utilise ailleurs

### 3. Ajouter le logo comme favicon
- Copier egalement le logo vers `public/logo-revivo.png`
- Mettre a jour `index.html` pour pointer le favicon vers ce logo (ou garder l'actuel si prefere)

## Details techniques

| Fichier | Changement |
|---------|-----------|
| `src/assets/logo-revivo.png` | Nouveau fichier (copie du logo uploade) |
| `public/logo-revivo.png` | Nouveau fichier pour favicon/meta |
| `src/components/Header.tsx` | Remplacer icone + texte par `<img src={logoRevivo}>` |
| `index.html` | Mettre a jour le favicon (optionnel) |
