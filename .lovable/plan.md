
## Correction de l'affichage des images avant/après validation

### Problèmes identifiés

**1. Côté Admin (`AdminPhotosTable`) :**
- Le bouton "Voir" (icône œil) n'a aucune action connectée — il est vide (`<Button variant="ghost" size="icon" title="Voir"><Eye /></Button>`)
- Il n'existe aucune modal de prévisualisation côté admin
- Les colonnes "Aperçu" et "Final" montrent seulement un ✓ ou ✗, pas d'image réelle
- Aucune URL signée n'est jamais générée pour l'admin

**2. Côté Utilisateur (`PhotosSection`) :**
- La logique est correcte en théorie (URL signée générée via `createSignedUrl`)
- Mais si le bucket `photos` a des restrictions RLS sur `storage.objects`, les URLs signées peuvent échouer silencieusement
- La modal affiche "Impossible de charger l'aperçu" quand `previewUrl` est null

### Solution

#### Partie 1 : Admin — Ajouter une modal de prévisualisation

Modifier `src/components/admin/AdminPhotosTable.tsx` pour :

1. Importer `supabase` et `Dialog`
2. Ajouter un état `selectedPhoto` et `previewUrls` (avant + après)
3. Connecter le bouton "Voir" pour ouvrir une modal
4. Dans la modal : générer 2 URLs signées (original via `original_image_path` + restauré via `restored_image_path` ou `preview_image_path`)
5. Afficher les deux images côte à côte (avant / après) avec un label clair

**Structure de la modal admin :**
```
┌─────────────────────────────────────┐
│  Aperçu de la restauration          │
│  ID: abc123...  Status: Aperçu prêt │
├──────────────┬──────────────────────┤
│  AVANT       │  APRÈS               │
│  [image]     │  [image]             │
│              │  (watermark si non   │
│              │   payé)              │
└──────────────┴──────────────────────┘
```

Il faut aussi récupérer `original_image_path` dans la requête admin (actuellement absente du `select` dans `Admin.tsx`).

#### Partie 2 : Utilisateur — Fiabiliser l'affichage

La `PhotosSection` génère déjà des URLs signées correctement. Le problème probable est que les thumbnails utilisent `restored_image_path || preview_image_path` — si les deux sont null (restauration en cours ou échouée), rien ne s'affiche, ce qui est le comportement attendu.

Cependant, vérifier que la modal utilisateur prend bien `preview_image_path` pour les photos en statut `preview_ready` (avant paiement) et `restored_image_path` pour les complètes. Le code actuel fait déjà `restored_image_path || preview_image_path` — c'est correct mais dans la modal on veut montrer l'aperçu watermarké avant paiement, donc on devrait préférer `preview_image_path` pour les non-payées.

#### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/components/admin/AdminPhotosTable.tsx` | Ajout modal avant/après avec URLs signées |
| `src/pages/Admin.tsx` | Ajouter `original_image_path` dans le select des restorations |
| `src/components/dashboard/PhotosSection.tsx` | Corriger l'ordre de préférence des chemins dans la modal (preview_image_path pour les non-payées) |

### Détails techniques

**Génération des URLs signées dans AdminPhotosTable :**
```typescript
const openPreview = async (photo: PhotoRestoration) => {
  setPreviewOpen(true);
  setPreviewPhoto(photo);
  setPreviewUrls({ before: null, after: null });

  // URL "avant" depuis original_image_path
  if (photo.original_image_path) {
    const { data } = await supabase.storage.from("photos").createSignedUrl(photo.original_image_path, 3600);
    if (data?.signedUrl) setPreviewUrls(prev => ({ ...prev, before: data.signedUrl }));
  }

  // URL "après" depuis restored_image_path ou preview_image_path
  const afterPath = photo.restored_image_path || photo.preview_image_path;
  if (afterPath) {
    const { data } = await supabase.storage.from("photos").createSignedUrl(afterPath, 3600);
    if (data?.signedUrl) setPreviewUrls(prev => ({ ...prev, after: data.signedUrl }));
  }
};
```

**Ajout du champ manquant dans Admin.tsx :**
```typescript
supabase
  .from("photo_restorations")
  .select("id, created_at, status, is_paid, user_id, session_id, preview_image_path, restored_image_path, original_image_path")
```

Et mettre à jour l'interface `Restoration` en conséquence pour inclure `original_image_path: string | null`.
