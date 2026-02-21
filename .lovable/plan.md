

# Remplacement du logo REVIVO partout

## Etat actuel

Le nouveau logo SVG est deja en place dans :
- **Header.tsx** : utilise `logo-revivo.svg` (OK)
- **index.html** : favicon pointe vers `/logo-revivo.svg` (OK)

## Endroits a mettre a jour

### 1. Page Auth.tsx (connexion/inscription)
Actuellement, la page affiche une **icone Leaf** generique dans un cercle au lieu du vrai logo REVIVO. Il faut remplacer ce bloc par le logo SVG.

**Avant :**
```tsx
<div className="w-16 h-16 rounded-full bg-primary mx-auto flex items-center justify-center shadow-soft mb-4">
  <Leaf className="w-8 h-8 text-primary-foreground" />
</div>
```

**Apres :**
```tsx
<img src={logoRevivo} alt="REVIVO" className="h-16 w-auto mx-auto mb-4" />
```

Ajout de l'import en haut du fichier :
```tsx
import logoRevivo from "@/assets/logo-revivo.svg";
```

### 2. Footer de Index.tsx (pied de page)
Le footer utilise une icone Sparkles + texte "REVIVO". On remplace par le vrai logo.

**Avant :**
```tsx
<div className="flex items-center gap-2">
  <Sparkles className="w-4 h-4 text-primary" />
  <span className="font-heading text-sm font-semibold text-foreground">REVIVO</span>
</div>
```

**Apres :**
```tsx
<img src={logoRevivo} alt="REVIVO" className="h-8 w-auto" />
```

Ajout de l'import en haut du fichier :
```tsx
import logoRevivo from "@/assets/logo-revivo.svg";
```

## Resume des fichiers a modifier

| Fichier | Modification |
|---|---|
| `src/pages/Auth.tsx` | Remplacer icone Leaf par le logo SVG |
| `src/pages/Index.tsx` | Remplacer icone Sparkles + texte par le logo SVG dans le footer |

## Fichiers deja a jour (aucune action)
- `src/components/Header.tsx` - logo SVG deja en place
- `index.html` - favicon SVG deja en place

