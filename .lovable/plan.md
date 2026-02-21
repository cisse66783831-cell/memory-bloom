

# Correction de l'authentification Orbit

## Probleme identifie

L'API Orbit retourne `auth_unavailable: no auth available` (erreur 500). Le code actuel envoie le token avec le header `Authorization: Bearer ...` (format OpenAI), mais Orbit est un proxy de type Anthropic qui attend probablement le header `x-api-key` a la place.

Ta configuration originale utilise le champ `ANTHROPIC_AUTH_TOKEN`, ce qui confirme cette hypothese.

## Solution

Modifier le header d'authentification dans l'edge function `restore-photo` pour envoyer le token dans **les deux formats** afin de maximiser la compatibilite :

### Fichier : `supabase/functions/restore-photo/index.ts`

**Avant (ligne 276-278) :**
```typescript
headers: {
  "Authorization": `Bearer ${ORBIT_AUTH_TOKEN}`,
  "Content-Type": "application/json",
},
```

**Apres :**
```typescript
headers: {
  "Authorization": `Bearer ${ORBIT_AUTH_TOKEN}`,
  "x-api-key": ORBIT_AUTH_TOKEN,
  "Content-Type": "application/json",
},
```

Cela envoie le token dans les deux formats (`Bearer` pour OpenAI-compatible et `x-api-key` pour Anthropic-compatible), garantissant que le proxy Orbit reconnaisse l'authentification quel que soit le format attendu.

## Etapes

1. Modifier les headers dans `restore-photo/index.ts` (ligne 276-278)
2. Redeployer la fonction
3. Tester une restauration avec Orbit

