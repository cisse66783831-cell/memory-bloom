

## Systeme de Gestion IA Hybride (Manuel / Automatique)

Ce plan ajoute un systeme complet permettant a l'Admin de piloter les modeles IA utilises pour la restauration, avec deux modes : Manuel (choix direct) et Automatique (algorithme de scoring avec boost).

---

### 1. Nouvelles Tables (Migration SQL)

**Table `app_settings`** : Stocke les parametres globaux de l'application.

```text
app_settings
+--------------------+--------+-----------+
| key (PK, text)     | value  | updated_at|
+--------------------+--------+-----------+
| ai_management_mode | manual | now()     |
+--------------------+--------+-----------+
```

- RLS : SELECT pour tous les authentifies, UPDATE/INSERT uniquement pour les admins.

**Table `ai_models_config`** : Catalogue des modeles IA disponibles.

```text
ai_models_config
+------+-------------------+------------------+-------+--------+--------+------------+--------+
| id   | name              | replicate_version| stage | active | score  | admin_boost| ...    |
+------+-------------------+------------------+-------+--------+--------+------------+--------+
| uuid | Aura SR v2        | f5318740...      | all   | true   | 0.0    | false      |        |
+------+-------------------+------------------+-------+--------+--------+------------+--------+
```

Colonnes :
- `name` : Nom lisible du modele
- `replicate_version` : ID de version Replicate
- `stage` : Etape ciblee (`preview`, `final`, `all`)
- `is_active` : Si le modele est disponible
- `current_score` : Score calcule par l'algorithme auto (defaut 0.0)
- `admin_boost` : Bonus de +20% au score (defaut false)
- `total_runs`, `avg_rating`, `conversion_rate` : Metriques de performance
- RLS : SELECT pour authentifies, ALL pour admins

On inserera le modele actuel (version `f5318740...`) comme premiere entree.

---

### 2. Modification de `restore-photo/index.ts`

Logique ajoutee au debut de la fonction, avant l'appel Replicate :

1. Lire `app_settings` pour obtenir `ai_management_mode`
2. **Mode Manuel** : Lire le modele ou `is_active = true` et `stage` correspond (ou `all`). Si plusieurs, prendre le premier. Sinon, fallback sur la version hardcodee actuelle.
3. **Mode Auto** : Interroger `ai_models_config` ou `is_active = true`, trier par `current_score` DESC, prendre le meilleur pour le stage demande.
4. Utiliser la `replicate_version` du modele selectionne au lieu de la valeur hardcodee.
5. Incrementer `total_runs` du modele utilise.

---

### 3. Nouvelle Edge Function `auto-optimize-models/index.ts`

Fonction planifiable (cron) qui recalcule les scores :

1. Verifier `ai_management_mode`. Si `manual`, arreter immediatement.
2. Si `auto` :
   - Pour chaque modele actif, calculer :
     ```
     finalScore = (avg_rating * 0.7) + (conversion_rate * 0.3)
     if (admin_boost) finalScore *= 1.2
     ```
   - Mettre a jour `current_score` dans `ai_models_config`.
3. Ajouter dans `supabase/config.toml` :
   ```
   [functions.auto-optimize-models]
   verify_jwt = false
   ```

---

### 4. Interface Admin (Nouvel onglet)

**Nouveau composant `src/components/admin/AdminAIModels.tsx`** :

- Toggle pour basculer entre mode Manuel et Automatique (met a jour `app_settings`)
- Tableau listant tous les modeles avec :
  - Nom, version (tronquee), stage, statut actif, score, boost
  - Boutons pour activer/desactiver un modele
  - Bouton pour toggler `admin_boost`
- En mode Manuel : un bouton "Definir comme modele actif" par modele
- En mode Auto : affichage du score et du classement

**Modification de `src/pages/Admin.tsx`** :

- Ajouter un nouvel onglet "Modeles IA" avec icone `Brain`
- Importer et afficher `AdminAIModels`

---

### Resume des fichiers

| Action | Fichier |
|--------|---------|
| Creer | Migration SQL (tables + seed) |
| Creer | `src/components/admin/AdminAIModels.tsx` |
| Creer | `supabase/functions/auto-optimize-models/index.ts` |
| Modifier | `supabase/functions/restore-photo/index.ts` |
| Modifier | `supabase/config.toml` |
| Modifier | `src/pages/Admin.tsx` |

