

## Probleme

La promotion partenaire echoue car la politique RLS sur `profiles` ne permet qu'a un utilisateur de modifier son propre profil. Ni l'admin ni le moderateur ne peuvent faire `UPDATE` sur le profil d'un autre utilisateur.

## Solution

Creer une fonction SECURITY DEFINER `promote_to_partner` qui contourne la RLS de maniere securisee.

## Modifications

### 1. Migration SQL - Fonction `promote_to_partner`
- Cree une fonction `promote_to_partner(target_user_id uuid, moderator_id uuid DEFAULT NULL)`
- Verifie que l'appelant est admin OU moderateur (et dans ce cas, que la cible est bien sa recrue)
- Genere un `partner_code` unique
- Met a jour `is_partner = true`, `partner_code`, et optionnellement `recruited_by_moderator_id`

### 2. `src/hooks/useAdminPartners.ts` - Modifier `usePromoteToPartner`
- Remplacer le `update` direct par `supabase.rpc("promote_to_partner", { target_user_id, moderator_id })`

### 3. `src/hooks/useModerator.ts` - Modifier `usePromoteToPartner`
- Remplacer le `update` direct par `supabase.rpc("promote_to_partner", { target_user_id })`

### 4. `src/components/admin/AdminUsersTable.tsx` - Corriger le flux admin
- Passer le `selectedModeratorId` dans l'appel RPC au lieu de faire un second `update`
- Gerer le cas "none" du select moderateur

