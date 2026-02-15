
# Audit du systeme de paiement -- Problemes identifies et corrections

## Problemes trouves

### 1. L'abonnement n'est PAS transmis au backend (CRITIQUE)
Le `PaymentSection` envoie bien un `subscriptionPlanId` via `onPayment`, mais:
- `Index.tsx` appelle `handlePayment(promoCode, depositMethod)` -- le 3eme parametre `subscriptionPlanId` est **ignore**
- `RestorationContext.processPayment()` n'accepte que `(promoCode, depositMethod)` -- aucun parametre pour l'abonnement
- `process-payment` edge function ne recoit jamais l'info de l'abonnement choisi

**Resultat** : un utilisateur qui choisit un plan Standard ou Pro paiera quand meme le prix unitaire de 1 000 F.

### 2. La creation d'abonnement n'existe pas dans le backend
L'edge function `process-payment` verifie les abonnements **existants** (lignes 118-174) pour utiliser un credit, mais il n'y a **aucune logique** pour **creer** un nouvel abonnement quand l'utilisateur en achete un.

### 3. La section tarifs de la landing page ne montre que le prix unitaire
La section "Pricing Preview" (lignes 242-299 de Index.tsx) affiche uniquement "1 000 F" en dur. Les plans d'abonnement ne sont pas mentionnes sur la page d'accueil.

### 4. Le dashboard utilisateur ne montre pas les abonnements actifs
`PaymentsHistory.tsx` affiche l'historique des paiements mais il n'y a aucun composant pour afficher l'abonnement actif et les credits restants.

---

## Plan de correction

### Etape 1 -- Propager le plan d'abonnement dans tout le flux

**Fichier** : `src/contexts/RestorationContext.tsx`
- Modifier `processPayment` pour accepter un 3eme parametre `subscriptionPlanId?: string`
- Passer ce parametre dans le body de l'appel a `process-payment`

**Fichier** : `src/pages/Index.tsx`
- Modifier `handlePayment` pour transmettre les 3 parametres : `(promoCode, depositMethod, subscriptionPlanId)`

### Etape 2 -- Ajouter la logique de creation d'abonnement dans le backend

**Fichier** : `supabase/functions/process-payment/index.ts`
- Accepter `subscriptionPlanId` dans le body de la requete
- Si present : chercher le plan dans `subscription_plans`, utiliser son prix au lieu de 1 000 F
- Apres validation admin (`action: "validate"`), creer une entree dans `user_subscriptions` avec le bon nombre de credits et la date d'expiration

### Etape 3 -- Mettre a jour la section tarifs de la landing page

**Fichier** : `src/pages/Index.tsx`
- Remplacer le bloc statique "1 000 F" par un affichage dynamique incluant les plans d'abonnement
- Garder le prix unitaire visible + ajouter les cartes Standard et Pro avec leurs reductions

### Etape 4 -- Afficher l'abonnement actif dans le dashboard

**Fichier** : `src/components/dashboard/DashboardStats.tsx` ou nouveau composant
- Ajouter une requete pour verifier si l'utilisateur a un abonnement actif
- Afficher le plan, les credits restants, et la date d'expiration

---

## Details techniques

```text
Flux actuel (casse) :
PaymentSection --> onPayment(promo, method, planId)
  --> Index.handlePayment(promo, method)  // planId PERDU
    --> RestorationContext.processPayment(promo, method)  // pas de planId
      --> Edge Function (reçoit seulement promo + method)

Flux corrige :
PaymentSection --> onPayment(promo, method, planId)
  --> Index.handlePayment(promo, method, planId)  // planId transmis
    --> RestorationContext.processPayment(promo, method, planId)
      --> Edge Function (reçoit promo + method + planId)
        --> Si planId : utilise le prix du plan, cree l'abonnement apres validation
```
