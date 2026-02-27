

## Plan : Lien d'invitation moderateur + promotion partenaire

Le moderateur recoit un code unique (MOD...) et un lien de partage. Les inscrits via ce lien sont automatiquement lies au moderateur. Le moderateur peut ensuite promouvoir ses recrues en partenaires. L'admin peut aussi promouvoir manuellement.

### 1. Migration base de donnees

- Ajouter colonne `moderator_code` (text, unique, nullable) dans `profiles`
- Creer fonction `generate_moderator_code()` (prefixe MOD + 6 caracteres)
- Modifier le trigger `handle_new_user()` pour lire `meta->>'moderator_code'`, lookup le `user_id` du moderateur, et remplir `recruited_by_moderator_id` automatiquement
- Generer automatiquement un `moderator_code` pour les moderateurs existants qui n'en ont pas
- Modifier la RLS `profiles` pour que les moderateurs puissent voir TOUS les inscrits via leur lien (pas seulement `is_partner = true`)

### 2. Capturer le parametre `?mod=CODE` (Index + Auth)

- `Index.tsx` : lire `?mod=` depuis l'URL et le stocker en `sessionStorage`
- `Auth.tsx` : lire `mod` depuis l'URL ou sessionStorage, le passer a `SignupForm`
- `SignupForm.tsx` : ajouter un prop `moderatorCode`, l'envoyer dans `onSubmit`
- `AuthContext.tsx` : ajouter `moderatorCode` dans `SignUpData` et le passer dans `raw_user_meta_data`

### 3. Page Moderateur : lien de partage + promotion partenaire

- Charger `moderator_code` depuis `useProfile`
- Ajouter une Card en haut avec :
  - Code moderateur affiche
  - Lien copiable (`revivo.lovable.app/?mod=MODXXXXXX`)
  - Bouton WhatsApp (texte simple, sans emoji)
- Modifier la liste "Mes recrues" pour afficher TOUS les inscrits (pas seulement les partenaires)
- Ajouter un bouton "Nommer partenaire" sur chaque recrue non-partenaire
- Hook `useModerator.ts` : modifier `useModeratorPartners` pour charger aussi les non-partenaires, et ajouter une mutation pour promouvoir en partenaire

### 4. Admin : generation auto du code moderateur

- Dans `AdminUsersTable.tsx`, quand l'admin promeut en moderateur, generer et sauvegarder un `moderator_code` dans le profil
- Afficher le `moderator_code` dans `AdminModeratorsTable.tsx`

### 5. Mise a jour du type Profile

- Ajouter `moderator_code` dans l'interface `Profile` de `useProfile.ts`

### Details techniques

- Le `moderator_code` suit le meme pattern que `referral_code` / `partner_code`
- Le trigger `handle_new_user` gere tout cote serveur (SECURITY DEFINER)
- La promotion partenaire par le moderateur reutilise la meme logique que l'admin (generer `partner_code`, mettre `is_partner = true`)
- Pas de modification de la table `user_roles` pour les partenaires (le statut partenaire reste sur `profiles.is_partner`)

