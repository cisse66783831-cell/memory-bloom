

# Mise a jour du token Replicate

## Probleme
L'edge function `restore-photo` retourne une erreur 401 car le token Replicate stocke est invalide ou expire.

## Solution
Mettre a jour le secret `REPLICATE_API_TOKEN` avec la nouvelle valeur fournie (`r8_O5eGdTwJT8Mop4KFdnh2ckDapuGCtsO2nwAtN`).

## Verification post-mise a jour
Tester l'edge function en lancant une restauration de photo pour confirmer que l'erreur 401 est resolue.

## Detail technique
Aucune modification de code n'est necessaire. Le fichier `supabase/functions/restore-photo/index.ts` lit correctement le secret via `Deno.env.get("REPLICATE_API_TOKEN")` et l'envoie dans le header `Authorization: Bearer`. Seule la valeur du secret doit etre actualisee.

