import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  body_ar: string | null;
  pinned: boolean;
  published: boolean;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
}

export function useAnnouncementsAll() {
  return useQuery({
    queryKey: ['announcements', 'all'],
    queryFn: async (): Promise<AnnouncementRow[]> => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AnnouncementRow[];
    },
  });
}

export interface UnreadAnnouncement extends AnnouncementRow {
  read_at: string | null;
}

/** The single most-recent pinned, published, not-expired, unread announcement for the user. */
export function useTopUnreadAnnouncement(userId: string | undefined) {
  return useQuery({
    queryKey: ['announcements', 'topUnread', userId],
    enabled: !!userId,
    queryFn: async (): Promise<UnreadAnnouncement | null> => {
      const { data: anns, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('published', true)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      const active = (anns ?? []).filter((a: AnnouncementRow) => {
        if (!a.pinned) return false;
        if (!a.expires_at) return true;
        return new Date(a.expires_at).getTime() > Date.now();
      });
      if (active.length === 0) return null;

      const ids = active.map((a: AnnouncementRow) => a.id);
      const { data: reads, error: rErr } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', userId!)
        .in('announcement_id', ids);
      if (rErr) throw rErr;
      const readSet = new Set((reads ?? []).map((r: { announcement_id: string }) => r.announcement_id));

      const firstUnread = active.find((a: AnnouncementRow) => !readSet.has(a.id));
      if (!firstUnread) return null;
      return { ...firstUnread, read_at: null };
    },
    staleTime: 30_000,
  });
}

export function useMarkAnnouncementRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (announcementId: string) => {
      const { error } = await supabase.rpc('mark_announcement_read', {
        p_announcement_id: announcementId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements', 'topUnread'] });
    },
  });
}

export interface UpsertAnnouncement {
  id?: string;
  title: string;
  body: string;
  body_ar?: string | null;
  pinned: boolean;
  published: boolean;
  expires_at?: string | null;
}

export function useUpsertAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: UpsertAnnouncement) => {
      if (a.id) {
        const { error } = await supabase
          .from('announcements')
          .update({
            title: a.title,
            body: a.body,
            body_ar: a.body_ar ?? null,
            pinned: a.pinned,
            published: a.published,
            expires_at: a.expires_at ?? null,
          })
          .eq('id', a.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('announcements').insert({
          title: a.title,
          body: a.body,
          body_ar: a.body_ar ?? null,
          pinned: a.pinned,
          published: a.published,
          expires_at: a.expires_at ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}
