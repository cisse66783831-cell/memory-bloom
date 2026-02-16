

## Correction des problemes de generation (nano-banana, combo, et gestion d'erreurs)

### Problemes identifies

1. **Aucune restauration ne passe en "failed"** : Le bloc `catch` retourne une erreur HTTP mais ne met jamais a jour le statut dans la base de donnees. Resultat : toutes les restaurations restent bloquees en "processing" indefiniment.

2. **nano-banana timeout** : Le modele IA generative est lent. Le mode synchrone (`Prefer: wait`) expire avant que le resultat ne revienne. Il faut basculer en mode polling avec timeout explicite.

3. **Combo pipeline crash (image trop grande)** : `real-esrgan` multiplie la taille de l'image par 2. L'image resultante (2048x2048 = 4M pixels) depasse la limite GPU du modele `microsoft` (~2M pixels). Il faut limiter le upscale en mode combo.

4. **Double resolution de version** : `resolveVersion()` est appelee a la ligne 351 (mode standard) ET a la ligne 118 (dans `runSingleModel`), doublant les appels API inutiles.

### Modifications prevues

**Fichier** : `supabase/functions/restore-photo/index.ts`

#### 1. Ajouter la mise a jour du statut "failed" dans le catch

```typescript
// Dans le bloc catch (ligne 418), AVANT de retourner la reponse d'erreur :
try {
  await supabase
    .from("photo_restorations")
    .update({ status: "failed" })
    .eq("id", restorationId);
} catch {}
```

Cela debloquera l'interface utilisateur en cas d'erreur au lieu de laisser le statut "processing" indefiniment.

#### 2. Augmenter le timeout de polling et ajouter un timeout explicite

Dans `runSingleModel`, ajouter un compteur de polling avec un maximum de 120 secondes (au lieu d'attendre indefiniment) :

```typescript
// Dans la boucle de polling (ligne 149)
const MAX_POLL_TIME = 120_000; // 2 minutes max
const startTime = Date.now();

while (prediction.status !== "succeeded" && prediction.status !== "failed") {
  if (Date.now() - startTime > MAX_POLL_TIME) {
    throw new Error("Prediction timed out after 120 seconds");
  }
  await new Promise(resolve => setTimeout(resolve, 2000));
  // ... poll
}
```

#### 3. Corriger le combo pipeline : ne pas upscaler au step 1

Quand `real-esrgan` est utilise comme etape dans le combo pipeline, forcer `scale: 1` pour eviter que l'image devienne trop grosse pour les etapes suivantes :

```typescript
// Dans la boucle combo (ligne 294), si le step est real-esrgan en combo :
const isComboStep = true;
const stepInput = buildModelInput(
  stepModelId, currentImageUrl, stepPrompt, 
  isComboStep ? true : previewMode, // force preview scale
  outputAspectRatio, outputResolution
);
```

Alternativement, ajouter un parametre `maxScale` a `buildModelInput` pour le mode combo.

#### 4. Eviter la double resolution de version

Restructurer le mode standard pour ne resoudre la version qu'une seule fois. Supprimer l'appel `resolveVersion` a la ligne 351 et laisser `runSingleModel` s'en charger (il le fait deja en interne a la ligne 118).

```typescript
// Remplacer les lignes 351-352 :
// AVANT :
const resolvedVersion = await resolveVersion(modelConfig.replicateId, REPLICATE_API_TOKEN);
const replicateBody: any = { version: resolvedVersion, input: modelInput };

// APRES :
// Pour le webhook path, resoudre une seule fois
const resolvedVersion = await resolveVersion(modelConfig.replicateId, REPLICATE_API_TOKEN);
const replicateBody: any = { version: resolvedVersion, input: modelInput };
// Et dans runSingleModel, passer directement le hash deja resolu
```

Ou mieux : passer le hash resolu a `runSingleModel` pour qu'il ne le re-resolve pas.

### Resume des corrections

| Probleme | Impact | Correction |
|----------|--------|------------|
| Status jamais "failed" | UI bloquee, utilisateur coincé | Mise a jour DB dans le catch |
| nano-banana timeout | Generation ne finit jamais | Timeout polling 120s + status failed |
| Combo image trop grande | Crash GPU au step 2 | Limiter le upscale en mode combo |
| Double resolveVersion | 2 appels API inutiles | Passer le hash deja resolu |

