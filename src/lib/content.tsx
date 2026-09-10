import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { publicSupabase } from './supabase';

export const contentTables = ['countries','cities','service_types','providers','posters','poster_countries','poster_cities','media_assets','destinations','hero_slides','site_content'] as const;
export type ContentRows = Record<string, any[]>;
const Context = createContext<{ rows: ContentRows | null; error: string; loading: boolean; refresh: () => void }>({ rows:null,error:'',loading:false,refresh:()=>{} });
export function ContentProvider({ children }: { children: ReactNode }) {
  const [rows,setRows] = useState<ContentRows | null>(null);
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(Boolean(publicSupabase));
  const [revision,setRevision] = useState(0);
  useEffect(() => {
    if (!publicSupabase) return;
    let cancelled=false;
    async function fetchContent() {
      try {
        const results = await Promise.all(contentTables.map(async table => {
          let query = publicSupabase!.from(table).select('*');
          if (!table.startsWith('poster_')) query = query.eq('is_published',true).order('sort_order');
          const {data,error} = await query;
          if (error) throw error;
          return [table,data] as const;
        }));
        if (!cancelled) { setRows(Object.fromEntries(results)); setError(''); }
      } catch { if (!cancelled) setError('Konten belum dapat dimuat. Silakan coba lagi.'); }
      finally { if (!cancelled) setLoading(false); }
    }
    fetchContent();
    const refresh = () => { if (!document.hidden) fetchContent(); };
    const timer = setInterval(refresh,60000);
    window.addEventListener('focus',refresh);
    return () => { cancelled=true; clearInterval(timer); window.removeEventListener('focus',refresh); };
  },[revision]);
  return <Context.Provider value={{rows,error,loading,refresh:()=>{setLoading(true);setRevision(r=>r+1);}}}>{children}</Context.Provider>;
}
export const useContent = () => useContext(Context);
export function useSetting(key: string, fallback: any = {}) {
  const {rows} = useContent();
  return rows?.site_content.find(row=>row.key===key)?.value ?? fallback;
}
export function useContact() { return useSetting('contact',{brand:'Reservasi.id',whatsapp:'6285265182020',address:'Batam, Indonesia'}); }
