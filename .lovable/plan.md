
## Simplification Totale du Flux : Générer Une Seule Fois, Stocker, puis Débloquer

### Ce que vous voulez (et c'est la bonne logique)

```
1. L'user upload sa photo + choisit le format
         ↓
2. On génère UNE SEULE FOIS en nano-banana 2K
   → Image stockée dans Supabase Storage
   → Affichée avec filigrane à l'user ET à l'admin
         ↓
3. L'user soumet son paiement
   → L'admin voit la photo (avant + après avec filigrane)
   → L'admin valide le paiement
         ↓
4. La même image déjà générée devient accessible sans filigrane
   → L'user peut la télécharger directement
   → Aucune nouvelle génération IA
```

### Problèmes dans le code actuel

**Problème 1 — Le flux distingue "preview" et "HD final"**
- Quand `previewMode: true` → génère en 1K avec `aspect_ratio: "match_input_image"`
- Quand l'admin valide → re-génère en 2K avec le bon format
- Ce double-passage crée des échecs et de la confusion

**Problème 2 — L'admin déclenche une 2ème génération IA inutile**
Dans `process-payment/index.ts` lignes 89-116 :
```typescript
// === TRIGGER AI RESTORATION after payment validated ===
if (restoration && restoration.status !== "completed") {
  // RE-GÉNÈRE toute l'image... inutile !
  await fetch(`${SUPABASE_URL}/functions/v1/restore-photo`, ...)
}
```
Cette re-génération est ce qui cause le bouton "Échec" après validation admin.

**Problème 3 — La preview est en 1K sans le bon format**
L'aperçu actuel utilise `resolution: "1K"` et `aspect_ratio: "match_input_image"` peu importe le choix de l'user — donc même si le paiement fonctionnait, la version finale serait différente de l'aperçu.

**Problème 4 — Le filigrane est côté frontend uniquement**
Le filigrane REVIVO est superposé par CSS dans le navigateur — ce n'est pas dans l'image stockée. C'est OK car l'image réelle (sans filigrane) est déjà stockée en HD, on bloque juste l'accès.

---

### Plan de Correction

#### Tâche 1 — Modifier `restore-photo` : toujours générer en 2K avec le bon format dès le départ

Dans `supabase/functions/restore-photo/index.ts` :

- **Supprimer la logique `previewMode`** qui changeait la résolution et le format
- **Toujours utiliser** `resolution: "2K"` et le `aspectRatio` reçu
- Le chemin de stockage sera toujours `preview/{date}/{id}_t{n}.png` (même path)
- L'image générée une seule fois = cette image est l'aperçu watermarqué ET le final HD — c'est la même

```typescript
// AVANT (2 résolutions différentes)
const outputResolution = previewMode ? "1K" : "2K";
const outputAspectRatio = previewMode ? "match_input_image" : aspectRatio;

// APRÈS (toujours HD dès le départ)
const outputResolution = "2K";
const outputAspectRatio = aspectRatio;
```

- Toujours stocker dans `preview/{date}/{id}_t{n}.png` (pas besoin du path "restored" séparé)
- Toujours mettre `status: "preview_ready"` et `preview_image_path: storagePath`

#### Tâche 2 — Modifier `process-payment` : supprimer la re-génération IA après validation

Dans `supabase/functions/process-payment/index.ts`, remplacer le bloc "TRIGGER AI RESTORATION" (lignes 89-116) par une logique simple :

```typescript
// APRÈS validation admin : on marque juste la restoration comme "completed"
// et on copie preview_image_path dans restored_image_path (même fichier)
await supabase
  .from("photo_restorations")
  .update({
    status: "completed",
    restored_image_path: restoration.preview_image_path, // même image !
  })
  .eq("id", payment.restoration_id);
```

Cela signifie :
- Aucune nouvelle génération IA = 0 risque d'échec
- L'image déjà générée devient simplement accessible
- `restored_image_path` pointe vers le même fichier que `preview_image_path`

#### Tâche 3 — Adapter `RestorationContext` : passer le format dès le premier appel

Dans `src/contexts/RestorationContext.tsx`, lors de l'upload (ligne 136-147), envoyer le `outputFormat` choisi :

```typescript
body: {
  restorationId: restoration.id,
  imageBase64: base64,
  colorize: state.colorize,
  previewMode: true, // gardé pour compatibilité mais ignoré côté serveur
  aspectRatio: state.outputFormat, // NOUVEAU — format choisi par l'user
  trialNumber: 1,
},
```

Mais le format est choisi APRÈS la génération (sur l'écran de comparaison)... Donc deux options :

**Option A (recommandée)** : Déplacer le sélecteur de format sur l'écran d'upload, AVANT la génération, pour que le format soit connu dès le départ.

**Option B** : Conserver le format sur l'écran de comparaison mais régénérer si le format change (complexe).

Nous allons faire l'**Option A** : ajouter le sélecteur de format dans `PhotoUploader.tsx` (ou directement dans la section upload de `Index.tsx`), et le passer lors de `uploadPhoto()`.

#### Tâche 4 — Adapter `checkPaymentStatus` dans `RestorationContext`

Actuellement, après validation admin, le contexte attend `restoration.status === "completed"` ET `restoration.restored_image_path`. Avec notre nouvelle logique, ces deux conditions seront bien remplies (le path est copié depuis preview). Aucune modification nécessaire.

#### Tâche 5 — Simplifier le `PhotosSection` utilisateur

La logique de retry/trial (essai 1, essai 2...) devient inutile puisqu'on génère une seule fois. Simplifier :

- Supprimer la logique `isFailed` basée sur `trial_number >= MAX_TRIALS`
- Un seul état : `failed` = vraiment échoué
- `preview_ready` = image disponible, en attente de paiement
- `completed` = payé, téléchargeable

---

### Résumé des fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/restore-photo/index.ts` | Toujours générer en 2K avec le bon format, supprimer la différence preview/HD |
| `supabase/functions/process-payment/index.ts` | Supprimer la re-génération IA, juste copier preview_path → restored_path + status "completed" |
| `src/contexts/RestorationContext.tsx` | Passer le format choisi lors de uploadPhoto |
| `src/pages/Index.tsx` | Déplacer le sélecteur de format AVANT la génération (sur l'écran upload) |
| `src/components/dashboard/PhotosSection.tsx` | Simplifier la logique d'état |

### Résultat attendu

```
User upload + choisit format (Original/Carré/Story...)
       ↓
Une seule génération nano-banana 2K avec ce format ✅
Image stockée dans preview/{id}.png
       ↓
User voit l'aperçu avec filigrane CSS (image HD stockée) ✅
Admin voit avant/après dans son tableau ✅
       ↓
User soumet paiement (numéro de dépôt)
Admin valide → restored_image_path = preview_image_path ✅
status = "completed", is_paid = true
       ↓
User voit le bouton TÉLÉCHARGER → même image, sans filigrane CSS ✅
Aucune 2ème génération IA, zéro risque d'échec ✅
```
