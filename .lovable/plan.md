
## Diagnostic et Correction Complète du Flux de Génération

### Ce qui se passe actuellement

Voici le flux complet avec les 3 bugs identifiés :

```text
User upload photo
       ↓
Trial 1 : nano-banana (google/nano-banana-pro)
  → Appelle /v1/predictions avec "version: hash"
  → Replicate répond ERREUR (mauvais endpoint)
  → status = "failed", preview_image_path = NULL
  → L'user voit "Échec" immédiatement
       ↓
Trial 2 : flux-kontext (flux-kontext-apps/restore-image)
  → Même problème d'endpoint deployment
  → status = "failed" à nouveau
       ↓
Après paiement admin
  → Tente de charger "combo-model"
  → N'existe pas dans la base de données
  → status = "failed" encore
```

---

### Cause Racine : Les 3 Bugs

**Bug 1 — Mauvais endpoint API pour les modèles "deployment"**

Replicate a deux types de modèles :
- **Modèles versionnés** (ancien système) : on envoie `{ version: "hash" }` à `/v1/predictions`
- **Modèles deployment** (nouveau système) : on envoie `{ input: ... }` à `/v1/models/{owner}/{model}/predictions`

`google/nano-banana-pro` et `flux-kontext-apps/restore-image` sont des **modèles deployment**. Le code actuel utilise toujours l'ancien endpoint → erreur 422 à chaque fois.

**Bug 2 — `combo-model` inexistant en base**

`final_hd_model_id = 'combo-model'` mais `combo-model` n'existe pas dans `ai_models_config`. Résultat : quand l'admin valide un paiement et que le système tente la génération HD, il ne trouve pas le modèle et échoue.

**Bug 3 — `flux-kontext` actif mais modèle désactivé pour Trial 2**

`trial_2_model_id = 'flux-kontext'` mais dans le code, la résolution de version pour `flux-kontext-apps/restore-image` va aussi utiliser l'ancien endpoint.

---

### Plan de Correction

#### Tâche 1 — Corriger l'endpoint Replicate dans `restore-photo/index.ts`

Modifier `runSingleModel` pour détecter automatiquement le type de modèle :

- Si `replicateId` contient "/" et ne ressemble pas à un hash SHA-256 (64 caractères hexadécimaux) → utiliser le **nouvel endpoint deployment**
- Sinon → continuer avec l'ancien endpoint

```text
replicateId = "google/nano-banana-pro"
  → contient "/"
  → n'est pas un hash
  → utiliser POST /v1/models/google/nano-banana-pro/predictions
     avec body { input: modelInput }

replicateId = "c75db81..."  (hash 64 chars)
  → utiliser POST /v1/predictions
     avec body { version: hash, input: modelInput }
```

Même correction pour le mode non-preview (webhook) aux lignes 378-407 du fichier.

#### Tâche 2 — Remplacer `combo-model` par `nano-banana` pour la HD finale

Migration SQL :
```sql
UPDATE app_settings SET value = 'nano-banana' WHERE key = 'final_hd_model_id';
```

Ainsi, après validation du paiement, le système utilisera `nano-banana` (qui génère déjà en 2K) pour la version HD — c'est le même modèle mais avec `previewMode = false` ce qui donnera `resolution = "2K"`.

#### Tâche 3 — Corriger `resolveVersion` pour les modèles deployment

La fonction `resolveVersion` tente de récupérer le `latest_version.id` d'un modèle deployment — mais ces modèles n'ont pas de `latest_version` au sens classique. Il faut court-circuiter cette fonction pour les modèles deployment :

```typescript
async function resolveVersion(replicateId: string, apiToken: string): Promise<string | null> {
  if (!replicateId.includes("/")) return replicateId; // déjà un hash
  // Pour les modèles deployment (owner/model), pas besoin de résolution
  // On retourne null pour signaler "utiliser l'endpoint deployment"
  return null;
}
```

#### Tâche 4 — Adapter le mode webhook pour les modèles deployment

Aux lignes 378-407, le code non-preview (avec webhook) utilise aussi l'ancien endpoint. Il faut appliquer la même logique de détection.

---

### Fichiers à Modifier

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/restore-photo/index.ts` | Corriger les 2 endpoints (sync + webhook) pour les modèles deployment |
| Migration SQL | Changer `final_hd_model_id` de `combo-model` vers `nano-banana` |

### Résultat Attendu

Après correction :

```text
User upload photo
       ↓
Trial 1 : nano-banana → /v1/models/google/nano-banana-pro/predictions ✅
  → preview_image_path sauvegardé
  → status = "preview_ready"
  → L'user voit l'aperçu watermarké ✅
       ↓ (si note ≤ 3)
Trial 2 : flux-kontext → /v1/models/flux-kontext-apps/restore-image/predictions ✅
  → 2ème aperçu disponible ✅
       ↓ (après paiement validé)
Génération HD : nano-banana en 2K → résultat HD sauvegardé ✅
  → Bouton Télécharger disponible ✅
```
