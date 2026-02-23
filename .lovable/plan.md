

# Systeme de Moderateurs de Partenaires (Commerciaux)

## Concept

Les **moderateurs** sont des commerciaux qui recrutent des **partenaires** (influenceurs). Ils gagnent des commissions pour chaque partenaire recrute et pour chaque inscription faite par les filleuls de leurs partenaires. Ils ont acces aux statistiques de leurs partenaires (nombre d'inscrits, nombre de paiements) mais **pas au chiffre d'affaires**.

## Modifications de la base de donnees

### 1. Ajouter le role "moderator" a l'enum `app_role`

L'enum `app_role` contient deja `admin`, `moderator`, `user`. Le role `moderator` est donc deja disponible.

### 2. Nouvelle colonne dans `profiles`

Ajouter `recruited_by_moderator_id` (uuid, nullable) dans la table `profiles` pour lier un partenaire a son moderateur recruteur.

### 3. Nouvelle table `moderator_commissions`

| Colonne | Type | Description |
|---|---|---|
| id | uuid | Cle primaire |
| moderator_user_id | uuid | L'ID du moderateur |
| partner_user_id | uuid | Le partenaire recrute |
| reason | text | "partner_recruited" ou "partner_referral_signup" |
| commission_amount | integer | Montant (ex: 500 F par partenaire recrute) |
| status | text | "pending" / "paid" |
| created_at | timestamp | Date |

Avec RLS : les moderateurs voient leurs propres commissions, les admins voient tout.

### 4. Nouvelle table `moderator_payouts`

Meme structure que `partner_payouts` mais pour les moderateurs.

## Modifications Admin

### Fichier : `src/components/admin/AdminUsersTable.tsx`

- Ajouter un bouton "Nommer moderateur" a cote du bouton existant d'ajustement de solde
- Ajouter un bouton "Nommer partenaire" (manquant actuellement dans le tableau des utilisateurs)
- Lors de la nomination d'un partenaire, permettre de selectionner un moderateur recruteur

### Fichier : `src/pages/Admin.tsx`

- Ajouter un onglet "Moderateurs" avec les stats des moderateurs et la liste de leurs partenaires

### Nouveau fichier : `src/components/admin/AdminModeratorsTable.tsx`

- Liste des moderateurs avec : nombre de partenaires recrutes, commissions totales, demandes de versement
- Vue detaillee des partenaires de chaque moderateur

## Page Moderateur

### Nouveau fichier : `src/pages/Moderator.tsx`

Dashboard dedie pour les moderateurs avec :
- Lien de recrutement partenaire unique
- Nombre de partenaires recrutes
- Pour chaque partenaire : nombre d'inscrits et nombre de paiements (PAS le montant)
- Commissions gagnees et demande de versement

### Nouveau fichier : `src/hooks/useModerator.ts`

- `useModeratorStatus()` : verifier le role moderateur
- `useModeratorStats()` : stats globales
- `useModeratorPartners()` : liste des partenaires avec stats filtrees (pas de CA)
- `useModeratorCommissions()` : commissions du moderateur
- `useModeratorPayouts()` : historique des versements

## Routing

### Fichier : `src/App.tsx`

- Ajouter la route `/moderator` pointant vers `Moderator.tsx`

### Fichier : `src/components/Header.tsx`

- Ajouter un lien "Espace Commercial" visible uniquement pour les moderateurs

## Hooks et securite

### Nouveau fichier : `src/hooks/useModeratorRole.ts`

- Verifier dans `user_roles` si l'utilisateur a le role `moderator`

## Resume des fichiers

| Fichier | Action |
|---|---|
| Migration SQL | Ajouter colonne `recruited_by_moderator_id`, tables `moderator_commissions` et `moderator_payouts` |
| `src/components/admin/AdminUsersTable.tsx` | Boutons "Nommer moderateur" et "Nommer partenaire" |
| `src/components/admin/AdminModeratorsTable.tsx` | Nouveau - onglet moderateurs dans admin |
| `src/pages/Admin.tsx` | Ajouter onglet "Moderateurs" |
| `src/pages/Moderator.tsx` | Nouveau - dashboard moderateur |
| `src/hooks/useModerator.ts` | Nouveau - hooks pour les donnees moderateur |
| `src/hooks/useModeratorRole.ts` | Nouveau - verification du role |
| `src/hooks/useAdminPartners.ts` | Ajouter `usePromoteToModerator()` |
| `src/App.tsx` | Route `/moderator` |
| `src/components/Header.tsx` | Lien "Espace Commercial" |

