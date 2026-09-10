import { useEffect, useMemo, useState } from 'react';
import { useContent } from './content';
import { mediaUrl } from './supabase';
import { posterCatalog } from '../data/posterCatalog';
import type { Poster } from '../data/posterCatalog';

export function useCatalog(): Poster[] {
 const {rows}=useContent();
 const [minute,setMinute]=useState(0);
 useEffect(()=>{const timer=setInterval(()=>setMinute(n=>n+1),60000);return()=>clearInterval(timer);},[]);
 return useMemo(()=>{
  if(!rows)return posterCatalog;
  const date=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'});
  return rows.posters.filter(p=>p.is_published&&p.status==='published'&&(!p.valid_from||p.valid_from<=date)&&(!p.valid_until||p.valid_until>=date||p.expiry_action!=='hide'))
   .filter(p=>rows.providers.some(r=>r.id===p.provider_id)&&rows.service_types.some(r=>r.id===p.service_type_id))
   .map(p=>({id:p.slug,image:mediaUrl(rows.media_assets.find(m=>m.id===p.image_id)),thumbnail:mediaUrl(rows.media_assets.find(m=>m.id===p.thumbnail_id) || rows.media_assets.find(m=>m.id===p.image_id)),title:{id:p.title_id,en:p.title_en},description:{id:p.description_id,en:p.description_en},countries:rows.poster_countries.filter(r=>r.poster_id===p.id).map(r=>rows.countries.find(c=>c.id===r.country_id)?.name_id).filter(Boolean),service:rows.service_types.find(s=>s.id===p.service_type_id)?.slug,provider:rows.providers.find(r=>r.id===p.provider_id)?.name,validUntil:p.valid_until,validFrom:p.valid_from,kind:p.kind,expiryAction:p.expiry_action,period:{id:p.period_id,en:p.period_en}})).filter(p=>p.image);
 },[rows,minute]);
}
