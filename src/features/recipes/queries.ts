import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Recipe } from '@/types/database';

export async function fetchRecipes(): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('active', true)
    .order('category')
    .order('order_index');
  if (error) throw error;
  return (data ?? []) as Recipe[];
}

export function useRecipes() {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: fetchRecipes,
    staleTime: 5 * 60_000,
  });
}

export function useRecipe(code: string | undefined) {
  return useQuery({
    queryKey: ['recipes', code],
    queryFn: async () => {
      if (!code) return null;
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('code', code)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Recipe | null;
    },
    enabled: !!code,
  });
}
