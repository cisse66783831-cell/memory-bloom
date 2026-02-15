
# Plan: Numero de depot unique et redirection utilisateur connecte

## 1. Numero de depot unique (+22666783831)

Dans `PaymentSection.tsx`, le numero de depot affiche actuellement celui stocke dans la base de donnees (`deposit_instructions`). Le changement consiste a afficher **toujours** le numero `+22666783831` a la place du numero de la base, quel que soit le moyen de paiement selectionne (Orange Money, Wave, etc.).

## 2. Redirection des utilisateurs connectes

Actuellement, la page d'accueil (`/`) affiche toujours la landing page, meme si l'utilisateur est connecte. Le changement consiste a :

- Dans `src/pages/Index.tsx` : verifier si l'utilisateur est connecte via `useAuth()`. Si oui, rediriger automatiquement vers `/dashboard`.
- Dans `src/contexts/AuthContext.tsx` : mettre a jour le `redirectTo` de Google OAuth pour pointer vers `/dashboard` au lieu de `/` (origin).

---

## Details techniques

### Fichier: `src/components/PaymentSection.tsx`
- Remplacer l'affichage de `method.phone_number` par la constante `+22666783831` dans la section "Deposit details" (ligne ~373).
- Le numero a copier sera egalement `+22666783831`.

### Fichier: `src/pages/Index.tsx`
- Importer `useAuth` depuis `AuthContext` et `useNavigate` depuis `react-router-dom`.
- Ajouter un `useEffect` dans `IndexContent` qui redirige vers `/dashboard` si `user` est present.

### Fichier: `src/contexts/AuthContext.tsx`
- Changer `redirectTo: window.location.origin` dans `signInWithGoogle` en `redirectTo: window.location.origin + '/dashboard'`.
