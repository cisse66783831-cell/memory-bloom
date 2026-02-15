-- 1. Autoriser l'INSERT pour les utilisateurs authentifiés
DROP POLICY IF EXISTS "Users can insert their own restorations" ON public.photo_restorations;
CREATE POLICY "Users can insert their own restorations"
ON public.photo_restorations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 2. S'assurer qu'ils peuvent voir leurs propres lignes (SELECT)
DROP POLICY IF EXISTS "Users can view their own restorations" ON public.photo_restorations;
CREATE POLICY "Users can view their own restorations"
ON public.photo_restorations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. Autoriser l'UPDATE
DROP POLICY IF EXISTS "Users can update their own restorations" ON public.photo_restorations;
CREATE POLICY "Users can update their own restorations"
ON public.photo_restorations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);