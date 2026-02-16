

## Retour de Nano Banana : Configuration et Backend

### Tache 1 : Migration SQL

Mise a jour de la base de donnees :
- Reactiver `nano-banana` (`is_active = true`)
- Desactiver `microsoft` (`is_active = false`)
- Fixer `trial_1_model_id = 'nano-banana'`
- Confirmer `trial_2_model_id = 'flux-kontext'`

### Tache 2 : Backend (`restore-photo/index.ts`)

Modifier le bloc `buildModelInput` pour `nano-banana` (lignes 82-89). Remplacer les champs actuels (`text`, `image_input` array, `aspect_ratio`, `resolution`) par le schema demande :

```text
AVANT (lignes 82-89):
  text: prompt,
  image_input: [imageUrl],
  aspect_ratio: aspectRatio,
  output_format: "png",
  resolution,

APRES:
  image: imageUrl,
  prompt: prompt || "Restaurer cette photo, ameliorer la nettete...",
  output_format: "png",
```

Details techniques :
- Le champ `image` remplace `image_input` (string au lieu d'array)
- Le champ `prompt` remplace `text` avec un prompt par defaut de restauration en francais si aucun `system_prompt` n'est defini dans la BDD
- Les champs `aspect_ratio` et `resolution` sont supprimes (non requis par ce schema)
- Les modeles `nano-banana-pro` et `gemini-flash` suivent le meme mapping

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| Migration SQL | Reactiver nano-banana, desactiver microsoft, corriger les essais |
| `supabase/functions/restore-photo/index.ts` | Nouveau mapping input pour nano-banana (image + prompt) |

