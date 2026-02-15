
## Plan de correction

### 1. Redirection "Restaurer une nouvelle photo"

**Probleme** : Le bouton dans le Dashboard (`src/pages/Dashboard.tsx`, ligne 148) pointe vers `/` qui affiche la landing page complete. L'utilisateur doit scroller pour trouver la zone d'upload.

**Solution** : Changer le lien de `/` vers `/?restore=1` et ajouter dans `Index.tsx` une logique qui, si ce parametre est present, scrolle automatiquement vers la section d'upload (ou l'affiche directement via `setShowUploader(true)`).

**Fichiers modifies** :
- `src/pages/Dashboard.tsx` : Changer `<Link to="/">` en `<Link to="/?restore=1">`
- `src/pages/Index.tsx` : Detecter le parametre `restore=1` dans l'URL et activer automatiquement `setShowUploader(true)` pour afficher directement l'uploader

### 2. Configurer l'administrateur

**Probleme** : La table `user_roles` est vide. Aucun utilisateur n'a le role admin.

**Le seul utilisateur inscrit est** : **Issa Cisse** (cisse66783831@gmail.com, ID: `a7d402b4-c419-4ef6-a23e-af1ab5190305`)

**Solution** : Creer une migration SQL pour inserer ce compte comme admin :

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('a7d402b4-c419-4ef6-a23e-af1ab5190305', 'admin');
```

### Details techniques

**`src/pages/Dashboard.tsx`** (ligne 148)
- Remplacer `to="/"` par `to="/?restore=1"`

**`src/pages/Index.tsx`** (apres ligne 55)
- Ajouter `useSearchParams` de react-router-dom
- Ajouter un `useEffect` qui detecte `searchParams.get("restore")` et appelle `setShowUploader(true)` si present

**Migration SQL**
- Inserer le role admin pour l'utilisateur Issa Cisse
