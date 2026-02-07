
# Plan : Champ code promo + Onglet Partenaires Admin

## 1. Champ de saisie de code promo dans PaymentSection

### Modifications de `PaymentSection.tsx`
- Ajouter un champ texte "Code promo" avec un bouton "Appliquer"
- Utiliser le hook `useValidatePromoCode` existant pour valider le code
- Afficher le prix original (1000 F) barre et le prix reduit quand un code valide est applique
- Afficher les messages d'erreur/succes (code invalide, expire, epuise)
- Passer le code promo valide au parent via une nouvelle prop `onPayment(promoCode?: string)`

### Modifications de `RestorationContext.tsx`
- Mettre a jour `processPayment` pour accepter un `promoCode` optionnel
- Envoyer le `promoCode` dans le body de l'appel a l'edge function `process-payment`

### Interface utilisateur
- Lien cliquable "Vous avez un code promo ?" qui revele le champ
- Champ Input + Bouton "Appliquer"
- Badge vert avec la reduction appliquee (-500 F)
- Prix mis a jour dynamiquement (1000 F -> 500 F)

## 2. Onglet Partenaires dans Admin

### Modifications de `Admin.tsx`
- Ajouter un `TabsTrigger` "Partenaires" avec l'icone `Building2`
- Ajouter un `TabsContent` qui affiche le composant `AdminPartnersTable` deja cree
- Importer `Building2` depuis lucide-react et `AdminPartnersTable` depuis le bon chemin

## Details techniques

### Fichiers modifies

| Fichier | Changement |
|---------|-----------|
| `src/components/PaymentSection.tsx` | Ajout champ promo, logique validation, affichage prix reduit |
| `src/contexts/RestorationContext.tsx` | Ajout param `promoCode` a `processPayment` |
| `src/pages/Admin.tsx` | Ajout onglet + import AdminPartnersTable |

### Props PaymentSection mises a jour
```text
interface PaymentSectionProps {
  onPayment: (promoCode?: string) => void;
  isLoading?: boolean;
}
```

### Flux du code promo
```text
Utilisateur clique "Vous avez un code promo ?"
  -> Champ apparait
  -> Saisit le code, clique "Appliquer"
  -> useValidatePromoCode verifie en base
  -> Si valide : affiche reduction, met a jour le prix
  -> Si invalide : affiche message d'erreur
  -> Au clic "Debloquer" : passe le code a processPayment
  -> Edge function applique la reduction cote serveur
```
