

# Analyse de l'infrastructure REVIVO - Problemes identifies

## Etat actuel de la base de donnees

- **22 paiements** tous en statut `completed`
- **22 restaurations** : 16 completed/paid, 4 failed/paid, **2 bloquees en `processing` avec `is_paid = true`** (depuis le 15 et 17 fevrier)
- **0 restaurations non payees** en cours (la limite fonctionne correctement)
- `max_free_restorations` = 5 (configurable)
- **1 seul modele IA actif** (`nano-banana`), les 2 autres sont inactifs

## Problemes identifies

### 1. Deux restaurations bloquees en `processing` (is_paid = true)
Les restaurations `a8bf246a` et `474f89b5` sont en statut `processing` depuis plus d'une semaine avec `is_paid = true`. Le webhook Replicate n'a jamais repondu ou a echoue. Ces enregistrements sont orphelins et faussent potentiellement les statistiques.

**Action** : Les passer en `failed` via SQL.

### 2. Securite RLS : 11 politiques trop permissives (`true`)
Les tables suivantes ont des politiques INSERT ou UPDATE avec `USING (true)` ou `WITH CHECK (true)` :
- `photo_restorations` : "Anyone can create restorations" avec `WITH CHECK (true)` — permet a n'importe qui (meme non authentifie) de creer des enregistrements
- `payments` : "Backend can create/update" avec `true` — necessaire pour les edge functions mais expose la table
- `referrals`, `promo_code_uses`, `optimization_logs`, `moderator_commissions`, `user_subscriptions`, `partner_commissions` : politiques INSERT/UPDATE trop ouvertes

Ces politiques `true` sont utilisees pour que les edge functions (qui utilisent le `service_role_key`) puissent operer. Le `service_role_key` bypass RLS de toute facon, donc ces politiques `true` sont en fait un risque : elles permettent aussi au client `anon` d'inserer/modifier des donnees.

**Action** : Supprimer les politiques "Backend can..." qui sont inutiles (le service role key bypass RLS). Cela ferme les failles sans casser les edge functions.

### 3. Doublon de politique INSERT sur `photo_restorations`
Deux politiques INSERT coexistent :
- "Anyone can create restorations" (`WITH CHECK (true)`)
- "Users can insert their own restorations" (`WITH CHECK (auth.uid() = user_id)`)

La premiere rend la seconde inutile et ouvre la table a tous.

**Action** : Supprimer "Anyone can create restorations" et modifier "Users can insert their own restorations" pour aussi permettre les insertions anonymes via `WITH CHECK (auth.uid() = user_id OR user_id IS NULL)` (pour les utilisateurs non connectes).

### 4. Erreur console : `Select` sans `forwardRef` dans `AdminAIModels`
L'erreur `Function components cannot be given refs` vient de l'utilisation directe du composant `Select` de Radix. C'est un warning non bloquant mais visible dans la console.

### 5. Pas de trigger `handle_new_user` detecte
La fonction `handle_new_user()` existe mais le trigger n'apparait pas dans la liste des triggers. Si le trigger a ete supprime accidentellement, les nouveaux utilisateurs n'auront pas de profil cree automatiquement.

**Action** : Verifier et recreer le trigger si necessaire.

### 6. Configuration AI : modeles inactifs mais references
`flux-kontext` est `is_active = false` et `status = inactive`. `microsoft` est `is_active = false` mais `status = active` (incoherence).

**Action** : Aligner les statuts.

### 7. Pas de suppression possible sur `photo_restorations`
Aucune politique DELETE n'existe. L'admin ne peut pas nettoyer les restaurations depuis le panneau (seulement via SQL direct).

**Action** : Ajouter une politique DELETE pour les admins.

---

## Plan d'implementation

### Etape 1 : Nettoyage des donnees
- Passer les 2 restaurations bloquees en `processing` a `failed`
- Aligner `microsoft` : `status = 'inactive'`

### Etape 2 : Securisation RLS (migration SQL)
- Supprimer les politiques `WITH CHECK (true)` inutiles sur : `payments`, `referrals`, `promo_code_uses`, `optimization_logs`, `moderator_commissions`, `user_subscriptions`, `partner_commissions`
- Remplacer la politique "Anyone can create restorations" par une version qui autorise `user_id IS NULL OR auth.uid() = user_id`
- Ajouter une politique DELETE pour les admins sur `photo_restorations`

### Etape 3 : Verifier/recreer le trigger `handle_new_user`
- S'assurer que le trigger `on_auth_user_created` existe sur `auth.users`

### Etape 4 : Fix console warning AdminAIModels (mineur)

---

## Section technique

Les politiques `WITH CHECK (true)` sont dangereuses car le client `anon` (accessible publiquement via la cle publishable) peut inserer des lignes dans ces tables. Meme si l'intention etait de permettre aux edge functions d'ecrire, celles-ci utilisent le `service_role_key` qui bypass completement RLS. Donc ces politiques sont a la fois inutiles et dangereuses.

Le trigger `handle_new_user` est critique : sans lui, les nouveaux inscrits n'auront pas de profil, ce qui cassera le parrainage, les credits gratuits et l'affichage du dashboard.

