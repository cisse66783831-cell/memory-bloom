

## Correction du mapping d'input pour `flux-restore`

### Probleme

Le modele `flux-kontext-apps/restore-image` attend des champs specifiques qui ne correspondent pas a ce que le code envoie actuellement.

**Champs attendus par l'API Replicate :**
- `input_image` : string (URL simple)
- `output_format` : string (par defaut "jpg")
- `seed` : integer (optionnel)
- `safety_filter_level` : string (optionnel)

**Ce que le code envoie actuellement (INCORRECT) :**
- `image_input` : array (mauvais nom + mauvais type)
- `prompt` : string (non supporte)
- `aspect_ratio` : string (non supporte)
- `resolution` : string (non supporte)

### Verification des autres modeles

Tous les autres modeles sont correctement configures :

| Modele | Statut |
|--------|--------|
| microsoft | OK - `image` (string) |
| real-esrgan | OK - `image` (string), `scale` |
| gfpgan | OK - `img` (string), `version`, `scale` |
| codeformer | OK - `image` (string), `codeformer_fidelity`, `upscale` |
| nano-banana | OK - `image_input` (array), `prompt`, `aspect_ratio`, `output_format` |
| nano-banana-pro | OK - `image_input` (array), `prompt`, `aspect_ratio`, `output_format`, `resolution` |
| flux-restore | ERREUR - champs incorrects |

### Modification

**Fichier** : `supabase/functions/restore-photo/index.ts`

Remplacer le bloc `flux-restore` dans `buildModelInput` (lignes 83-90) :

```typescript
// Avant (incorrect) :
} else if (modelId === "flux-restore") {
  return {
    prompt,
    image_input: [imageUrl],
    aspect_ratio: aspectRatio,
    output_format: "png",
    resolution,
  };

// Apres (correct) :
} else if (modelId === "flux-restore") {
  return {
    input_image: imageUrl,
    output_format: "png",
  };
```

Les champs `prompt`, `aspect_ratio` et `resolution` ne sont pas supportes par ce modele et seront retires. Le champ `image_input` est renomme en `input_image` et passe en string simple au lieu d'un tableau.

### Resume

Un seul modele a corriger (`flux-restore`), une seule modification dans un seul fichier. Les 6 autres modeles sont correctement configures et fonctionneront sans probleme.

