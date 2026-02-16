

## Correction des erreurs de production

### Erreur 1 (CRITIQUE) : `restore-photo` retourne une erreur 500

**Cause** : Ligne 107 de `supabase/functions/restore-photo/index.ts` utilise `.catch()` sur le retour de `supabase.rpc()`. Le client Supabase ne retourne pas une vraie Promise mais un "thenable", ce qui fait que `.catch()` n'existe pas et crash la fonction.

De plus, la fonction RPC `increment_total_runs` n'a jamais ete creee dans la base de donnees.

**Solution** : Remplacer le bloc `.rpc(...).catch(...)` (lignes 107-111) par un simple `try/catch` classique avec une mise a jour manuelle directe de `total_runs` :

```typescript
// Remplacer:
await supabase.rpc("increment_total_runs", { model_id: modelId }).catch(async () => {
  const { data: m } = await supabase.from("ai_models_config").select("total_runs").eq("id", modelId).single();
  if (m) await supabase.from("ai_models_config").update({ total_runs: (m.total_runs || 0) + 1 }).eq("id", modelId);
});

// Par:
try {
  const { data: m } = await supabase
    .from("ai_models_config")
    .select("total_runs")
    .eq("id", modelId)
    .single();
  if (m) {
    await supabase
      .from("ai_models_config")
      .update({ total_runs: (m.total_runs || 0) + 1 })
      .eq("id", modelId);
  }
} catch (e) {
  console.warn("Could not increment total_runs:", e);
}
```

**Fichier** : `supabase/functions/restore-photo/index.ts` (lignes 107-111)

---

### Erreur 2 (Warning) : React ref sur PhotosSection/Dialog

**Cause** : Le composant `DialogContent` de shadcn/ui tente de passer une ref a un composant enfant qui ne la supporte pas. C'est un warning cosmétique qui n'empeche pas le fonctionnement.

**Solution** : Pas de modification necessaire. Ce warning provient d'une incompatibilite mineure entre les versions de `@radix-ui/react-dialog` et React 18. Il n'affecte pas le fonctionnement de l'application.

---

### Resume

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/restore-photo/index.ts` | Remplacer `.rpc().catch()` par un `try/catch` avec update manuel |

Une seule modification, un seul fichier, et la restauration de photos fonctionnera a nouveau.

