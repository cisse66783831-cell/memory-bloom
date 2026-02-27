

## Probleme identifie

Le lien `https://revivo.lovable.app/?mod=MOD3L7XFK` fonctionne partiellement : il stocke bien le code moderateur dans `sessionStorage`, mais il ne redirige pas l'utilisateur vers la page d'inscription. Le visiteur arrive sur la page d'accueil sans savoir quoi faire, et s'il ne s'inscrit pas, le code est "perdu" sans effet visible.

## Solution

Quand un utilisateur arrive avec `?mod=CODE` sur la page d'accueil :
1. Stocker le code dans `sessionStorage` (deja fait)
2. **Rediriger automatiquement vers `/auth?mod=CODE`** pour que le visiteur tombe directement sur le formulaire d'inscription avec le code moderateur pre-capture

## Modifications

### 1. `src/pages/Index.tsx` - Redirection automatique
- Dans le `useEffect` qui capture `?mod=`, ajouter une redirection vers `/auth?mod=CODE` si l'utilisateur n'est pas connecte
- Si l'utilisateur est deja connecte, ne pas rediriger (le code est juste stocke)

### 2. Verification du flux complet
- `Auth.tsx` lit deja `?mod=` depuis l'URL ou `sessionStorage` -- OK
- `SignupForm` recoit deja `moderatorCode` en prop -- OK  
- `AuthContext.signUp` envoie deja `moderator_code` dans les metadata -- OK
- Le trigger `handle_new_user` fait deja le lookup -- OK

Le seul maillon manquant est la redirection depuis Index vers Auth.

