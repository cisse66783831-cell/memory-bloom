

# Plan de modifications REVIVO

## 1. Bouton admin sur la page de paiement

**Probleme** : Les boutons WhatsApp "Envoyer la preuve" et "Rejoindre la communaute" sont affiches en bas de la section paiement, visibles par tous. Le bouton WhatsApp de preuve est utile mais le probleme est qu'un utilisateur non inscrit qui envoie la preuve par WhatsApp ne sera pas identifie dans le systeme.

**Solution** :
- Garder le bouton WhatsApp "Envoyer la preuve" dans la page de paiement mais le rendre plus petit (taille `sm`, style discret)
- Deplacer le bouton "Rejoindre la communaute" dans le Dashboard (espace utilisateur)
- Rendre le bouton WhatsApp de preuve accessible UNIQUEMENT apres que l'utilisateur ait rempli ses infos (email/compte) pour eviter les envois anonymes

**Fichiers modifies** :
- `src/components/PaymentSection.tsx` : reduire les boutons WhatsApp, supprimer "Rejoindre la communaute"
- `src/pages/Dashboard.tsx` : ajouter un lien "Rejoindre la communaute" dans l'espace utilisateur

---

## 2. Images d'Africains avec effet avant/apres sur la landing page

**Probleme** : Les images d'exemple actuelles (`before-1.jpg`, `after-1.jpg`, etc.) ne representent pas le public cible africain.

**Solution** :
- Generer 3 paires d'images (avant/apres) representant des Africains avec l'IA integree (modele `google/gemini-3-pro-image-preview`)
- Remplacer les images existantes dans `src/assets/examples/`
- Mettre a jour les titres/descriptions dans `ExamplesGallery.tsx` pour correspondre au contexte africain

**Fichiers modifies** :
- `src/assets/examples/before-1.jpg` a `after-3.jpg` : remplaces par des images generees
- `src/components/ExamplesGallery.tsx` : mise a jour des titres

---

## 3. Limite de 2 generations gratuites sans paiement valide

**Probleme** : Actuellement, il n'y a aucune limite sur le nombre de generations qu'un utilisateur peut faire sans payer. Cela entraine une perte de credits IA.

**Solution** :
- Ajouter une verification dans l'edge function `restore-photo` : compter le nombre de restaurations non payees pour le `session_id` ou `user_id`
- Si >= 2 restaurations non payees existent, bloquer la generation et retourner une erreur
- Cote frontend, afficher un message clair invitant l'utilisateur a payer une restauration existante avant d'en lancer une nouvelle

### Detail technique

**Edge function `restore-photo/index.ts`** :
Apres la verification du `restorationId`, ajouter :
```text
// Compter les restaurations non payees pour cette session/user
const { count } = await supabase
  .from("photo_restorations")
  .select("id", { count: "exact", head: true })
  .eq("session_id", sessionId)
  .eq("is_paid", false)
  .in("status", ["preview_ready", "processing", "pending"]);

if (count >= 2) {
  return error "Limite atteinte : payez une restauration existante"
}
```

**Frontend `RestorationContext.tsx`** :
- Transmettre le `session_id` dans le body de l'appel a `restore-photo`
- Gerer l'erreur de limite et afficher un toast avec un message clair

**Frontend `PhotoUploader.tsx` ou `Index.tsx`** :
- Afficher un avertissement si la limite est atteinte, avec un lien vers le dashboard

**Fichiers modifies** :
- `supabase/functions/restore-photo/index.ts` : ajout du controle de limite
- `src/contexts/RestorationContext.tsx` : gestion de l'erreur de limite
- `src/pages/Index.tsx` : affichage du message de limite

---

## Resume des fichiers a modifier

| Fichier | Modification |
|---|---|
| `src/components/PaymentSection.tsx` | Reduire boutons WhatsApp, supprimer "Rejoindre la communaute" |
| `src/pages/Dashboard.tsx` | Ajouter lien communaute WhatsApp |
| `src/components/ExamplesGallery.tsx` | Mettre a jour titres africains |
| `src/assets/examples/*` | Generer et remplacer images |
| `supabase/functions/restore-photo/index.ts` | Limite de 2 generations non payees |
| `src/contexts/RestorationContext.tsx` | Gerer erreur de limite |
| `src/pages/Index.tsx` | Affichage message limite |

