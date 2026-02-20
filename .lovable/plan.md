
## Audit complet du système — Problèmes identifiés et plan de correction

### Ce que la base de données révèle

En regardant les données réelles, le diagnostic est sans appel :

```
photo_restorations récentes :
- a353cf8f : status="processing", preview_image_path=NULL  ← le webhook a bien tourné mais le statut est resté "processing"
- 766d0f81 : status="processing", preview_image_path=NULL  ← même problème
- Les paiements validés ont tous : preview_image_path=NULL, restored_image_path=NULL
```

Et dans les logs du webhook :
```
INFO Restoration a353cf8f preview ready at preview/2026-02-20/a353cf8f_t1.png ✅
```

Le webhook a bien généré et stocké l'image — mais la base de données dit encore `status="processing"`. 

**Conclusion : le webhook met bien à jour `preview_image_path` et `status = "preview_ready"`, mais le frontend poll pendant 3 minutes, expire, et affiche "La génération a pris trop de temps" — laissant le statut bloqué à "processing" en BDD.**

---

### Les 4 vrais problèmes

**Problème 1 — Timing : le frontend abandonne AVANT que le webhook ne réponde**

Le webhook prend ~60-90 secondes (génération Replicate). Le frontend poll toutes 3 secondes pendant 3 minutes max. En théorie ça devrait fonctionner. Mais l'erreur dans la console dit :

```
"La génération a pris trop de temps. Veuillez réessayer."
```

Cela signifie que la session du navigateur a été fermée ou que le poll n'a pas été déclenché correctement. Le problème : **le poll est bloquant dans `uploadPhoto`** — si l'utilisateur ferme l'onglet ou recharge la page, tout est perdu même si l'IA a fini son travail en arrière-plan.

**Problème 2 — Statut bloqué en "processing" après le timeout**

Quand l'utilisateur voit "La génération a pris trop de temps", la fonction coté serveur a peut-être bien terminé (webhook reçu = `preview_ready`). Mais le frontend a abandonné et l'UI est revenue à l'étape "upload" avec une erreur. L'utilisateur ne sait pas que son image est en fait prête.

**Problème 3 — Zéro image = zéro téléchargement après paiement validé**

La ligne dans `process-payment` est :
```typescript
if (restoration && restoration.status !== "completed" && restoration.preview_image_path) {
```
Si `preview_image_path` est NULL (parce que la génération n'a pas encore terminé ou que le frontend a expiré mais le webhook n'a pas encore mis à jour), **cette condition échoue silencieusement**. L'admin valide → paiement `completed` → mais la restauration reste à `processing` et `is_paid = true` sans image. L'user ne peut jamais télécharger.

**Problème 4 — Pas de récupération de session**

Si l'utilisateur ferme l'onglet pendant la génération (1-2 minutes) puis revient, il recommence depuis zéro alors que son image est peut-être `preview_ready` en base. Il n'y a aucun mécanisme de récupération.

---

### Plan de correction : 4 changements ciblés

#### Correction 1 — Dashboard : afficher les photos en `preview_ready` comme cliquables

Dans `PhotosSection.tsx`, les photos avec `status = "preview_ready"` ET un `preview_image_path` sont déjà gérées correctement. MAIS si le statut est `"processing"` alors que le webhook a déjà mis à jour la base en `preview_ready`, le refetch interval de 5 secondes va détecter ça. Ce n'est pas un problème ici.

Le vrai problème c'est que les anciennes restaurations (pre-bug) ont `status = "processing"` ET `preview_image_path = NULL` même si l'image existe physiquement dans le storage. Ces records sont des orphelins.

#### Correction 2 — `RestorationContext.tsx` : ne pas bloquer sur le poll, gérer la récupération

Au lieu d'une boucle `while` bloquante dans `uploadPhoto`, on va :
1. Lancer la génération (appel `restore-photo` qui retourne immédiatement)
2. Passer à l'étape `processing` avec un état `restorationId` sauvegardé
3. Faire un poll léger qui survit à travers le composant via `useEffect` au lieu d'une boucle bloquante dans une fonction async
4. Quand le poll détecte `preview_ready`, passer à `comparison` et afficher l'image

Cela signifie que si l'utilisateur navigue, le poll continuera. Et surtout, si l'utilisateur revient sur la page avec le même `sessionId` et une restauration en cours, on peut récupérer l'état.

#### Correction 3 — `process-payment` : attendre que `preview_image_path` soit disponible

Si l'admin valide alors que `preview_image_path` est encore NULL, il faut déclencher une attente ou plutôt mettre un statut intermédiaire. Solution simple : si `preview_image_path` est NULL au moment de la validation admin → marquer `is_paid = true` et `status = "awaiting_image"`. Quand le webhook arrive ensuite avec l'image → copier directement vers `restored_image_path` et passer à `completed`.

En pratique, si l'image est générée AVANT le paiement (c'est le flux normal), `preview_image_path` sera toujours rempli au moment de la validation admin. Ce cas ne devrait pas arriver.

#### Correction 4 — Récupération de session sur le Dashboard

Dans `PhotosSection.tsx`, si une photo a `status = "preview_ready"` et `preview_image_path` non null → afficher le bouton "Voir & Débloquer" qui redirige vers la page principale avec `?photo=ID` pour permettre de continuer le flux de paiement.

---

### Plan d'implémentation détaillé

#### Fichier 1 : `src/contexts/RestorationContext.tsx`

Réécrire `uploadPhoto` pour ne plus utiliser une boucle `while` bloquante. À la place :

```typescript
// 1. Appeler restore-photo (retour immédiat)
// 2. Sauvegarder restorationId dans le state
// 3. Passer à step="processing"
// 4. Le polling se fait dans un useEffect séparé qui surveille restorationId + step
```

Ajouter un `useEffect` de polling qui :
- Se déclenche quand `step === "processing"` ET `restorationId !== null`
- Poll toutes les 3 secondes la table `photo_restorations`
- Quand `status === "preview_ready"` → génère l'URL signée et passe à `comparison`
- Quand `status === "failed"` → passe à l'erreur
- Timeout de 5 minutes (300 secondes) avant d'afficher une erreur

#### Fichier 2 : `supabase/functions/process-payment/index.ts`

Ajouter une gestion robuste du cas où `preview_image_path` est NULL lors de la validation admin :

```typescript
if (restoration && restoration.status !== "completed") {
  if (restoration.preview_image_path) {
    // Cas normal : image prête → on débloque
    await supabase.from("photo_restorations").update({
      status: "completed",
      restored_image_path: restoration.preview_image_path,
    }).eq("id", payment.restoration_id);
  } else {
    // Image pas encore générée → on marque juste is_paid=true
    // Le webhook copiera l'image quand elle sera prête
    // status reste "processing"
    console.log("Image not yet ready, marking as paid only");
  }
}
```

#### Fichier 3 : `supabase/functions/replicate-webhook/index.ts`

Ajouter la logique : si `is_paid = true` au moment où le webhook arrive (paiement validé avant la fin de la génération) → copier directement dans `restored_image_path` ET mettre `status = "completed"`.

```typescript
// Dans le webhook, après upload de l'image :
const updateData: any = {
  status: "preview_ready",
  preview_image_path: storagePath,
};

// Si déjà payé : débloquer directement
if (restoration.is_paid) {
  updateData.status = "completed";
  updateData.restored_image_path = storagePath;
}

await supabase.from("photo_restorations").update(updateData).eq("id", restoration.id);
```

#### Fichier 4 : `src/components/dashboard/PhotosSection.tsx`

Améliorer le lien "Débloquer" dans le modal pour rediriger correctement vers le flux de paiement. Actuellement il pointe vers `/?photo=${selectedPhoto.id}` mais Index.tsx ne gère pas ce paramètre. Il faut soit :
- Gérer le paramètre `?photo=ID` dans Index.tsx pour pré-charger la restauration
- Ou simplifier : rediriger vers `/?restore=1` qui ouvre l'uploader

---

### Résumé des fichiers modifiés

| Fichier | Changement |
|---------|-----------|
| `src/contexts/RestorationContext.tsx` | Remplacer la boucle while par un useEffect de polling non-bloquant |
| `supabase/functions/replicate-webhook/index.ts` | Si `is_paid=true` au moment du webhook → `status=completed` directement |
| `supabase/functions/process-payment/index.ts` | Gérer le cas `preview_image_path=NULL` lors de la validation admin |
| `src/components/dashboard/PhotosSection.tsx` | Corriger le lien "Débloquer" dans la modale |

### Résultat attendu après correction

```
Flux génération :
  Upload → restore-photo appelé (retour immédiat) → step="processing"
  useEffect poll → détecte preview_ready → step="comparison" ✅
  (même si l'user ferme et revient, le poll reprend)

Flux paiement normal (image prête avant paiement) :
  Admin valide → preview_image_path est rempli → status="completed" ✅
  User voit le bouton TÉLÉCHARGER ✅

Flux paiement inversé (admin valide avant que l'image soit prête) :
  Admin valide → is_paid=true, status reste "processing"
  Webhook arrive → voit is_paid=true → status="completed", restored_image_path rempli ✅
  User voit le bouton TÉLÉCHARGER ✅
```
