

## Correction du bug "Restaurer une nouvelle photo ne foncait rien"

### Probleme identifie

Dans `src/pages/Index.tsx` (lignes 56-58), un `useEffect` redirige automatiquement tout utilisateur connecte vers `/dashboard`. Quand un utilisateur clique sur "Restaurer une nouvelle photo" depuis le dashboard (lien vers `/`), il est instantanement renvoye au dashboard.

### Solution

Modifier la logique de redirection pour permettre aux utilisateurs connectes d'acceder a la page d'upload quand ils le souhaitent. Deux options :

**Option retenue** : Supprimer la redirection automatique dans `Index.tsx`. Les utilisateurs connectes verront la landing page normalement et pourront uploader des photos. La redirection vers le dashboard se fera uniquement depuis la page `/auth` apres connexion.

### Changements techniques

**Fichier : `src/pages/Index.tsx`**
- Supprimer le `useEffect` de redirection (lignes 56-58) qui redirige les utilisateurs connectes vers `/dashboard`
- L'import `useNavigate` et `useAuth` restent necessaires pour d'autres fonctionnalites

### Taches 1 et 2 (deja appliquees)

- **Tache 1** (securiser le paiement) : deja en place dans `PaymentSection.tsx` avec la verification `useAuth` et redirection vers `/auth`
- **Tache 2** (RLS photo_restorations) : migration SQL deja appliquee avec les policies INSERT/SELECT/UPDATE pour `authenticated`

