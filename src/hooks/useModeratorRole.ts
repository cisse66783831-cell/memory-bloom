import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useModeratorRole = () => {
  const { user } = useAuth();
  const [isModerator, setIsModerator] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkModeratorRole = async () => {
      if (!user) {
        setIsModerator(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'moderator')
          .maybeSingle();

        if (error) {
          console.error('Error checking moderator role:', error);
          setIsModerator(false);
        } else {
          setIsModerator(!!data);
        }
      } catch (err) {
        console.error('Error checking moderator role:', err);
        setIsModerator(false);
      } finally {
        setLoading(false);
      }
    };

    checkModeratorRole();
  }, [user]);

  return { isModerator, loading };
};
