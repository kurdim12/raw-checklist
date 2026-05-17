import type { Profile } from '@/types/database';

export function isManager(profile: Profile | null | undefined): boolean {
  return profile?.role === 'manager' && profile.active;
}

export function isBarista(profile: Profile | null | undefined): boolean {
  return profile?.role === 'barista' && profile.active;
}
