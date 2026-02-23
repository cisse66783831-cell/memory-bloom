

# Correction du bug des previews avant/apres

## Probleme identifie

Le systeme a **deux providers IA** : Replicate (asynchrone via webhook) et Orbit (synchrone). Le bug vient d'un decalage entre le backend et le frontend :

1. **Orbit** termine la restauration immediatement et met le statut a `"completed"` + sauvegarde l'image dans `restored_image_path`
2. **Le polling frontend** (RestorationContext.tsx, ligne 117) ne verifie QUE le statut `"preview_ready"` et QUE le champ `preview_image_path`
3. Resultat : le polling ne detecte jamais l'image restauree, tourne 5 minutes, puis timeout
4. L'image "apres" retombe sur `DEMO_AFTER` (une photo stock Unsplash sans rapport avec la photo de l'utilisateur) a cause du fallback ligne 99

## Solution

### Fichier : `src/contexts/RestorationContext.tsx`

**Correction 1 — Polling elargi (ligne 101-103)**
Ajouter `restored_image_path` au select du polling :
```text
Avant :  .select("status, preview_image_path, used_model_id")
Apres :  .select("status, preview_image_path, restored_image_path, used_model_id")
```

**Correction 2 — Condition de detection (ligne 117)**
Accepter aussi le statut `"completed"` et le chemin `restored_image_path` :
```text
Avant :
if (dbRestoration?.status === "preview_ready" && dbRestoration.preview_image_path)

Apres :
if (
  (dbRestoration?.status === "preview_ready" || dbRestoration?.status === "completed") &&
  (dbRestoration.preview_image_path || dbRestoration.restored_image_path)
)
```

**Correction 3 — Chemin image dynamique (ligne 122-124)**
Utiliser le chemin disponible (preview OU restored) :
```text
Avant :
const { data: signed } = await supabase.storage
  .from("photos")
  .createSignedUrl(dbRestoration.preview_image_path, 3600);

Apres :
const imagePath = dbRestoration.preview_image_path || dbRestoration.restored_image_path;
const { data: signed } = await supabase.storage
  .from("photos")
  .createSignedUrl(imagePath!, 3600);
```

**Correction 4 — Supprimer le fallback DEMO_AFTER (Index.tsx, ligne 28 et 98-99)**
Supprimer la constante `DEMO_AFTER` et ne plus l'utiliser comme fallback, pour eviter qu'une image stock s'affiche a la place du resultat de l'utilisateur :
```text
Avant :
const DEMO_AFTER = "https://images.unsplash.com/...";
const beforeImage = originalImageUrl || DEMO_AFTER;
const afterImage = previewImageUrl || restoredImageUrl || DEMO_AFTER;

Apres :
const beforeImage = originalImageUrl || "";
const afterImage = previewImageUrl || restoredImageUrl || "";
```

## Resume

| Fichier | Modification |
|---|---|
| `src/contexts/RestorationContext.tsx` | Polling : detecter "completed" + utiliser restored_image_path |
| `src/pages/Index.tsx` | Supprimer le fallback DEMO_AFTER qui affiche des images sans rapport |

