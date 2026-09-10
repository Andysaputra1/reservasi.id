import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured = Boolean(url && key);
export const supabase = configured ? createClient(url, key) : null;
// Public pages must not use an admin session: draft content stays private even
// when an administrator previews the website in the same browser.
export const publicSupabase = configured ? createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'reservasi-public' },
}) : null;

export const ADMIN_USERNAME = 'administrator';
export const ADMIN_EMAIL = 'andychensaputra@gmail.com';

const assets = import.meta.glob<string>(['../assets/*.webp', '../assets/catalog/*.webp', '../assets/herophotos/*.webp', '../assetsbaru/*.png', '../playpackage/*.png'], {
  eager: true, query: '?url', import: 'default',
});
export function mediaUrl(media: any): string {
  if (!media) return '';
  if (media.object_path && publicSupabase) return publicSupabase.storage.from('website-media').getPublicUrl(media.object_path).data.publicUrl;
  return assets[media.source_path?.replace(/^src\//, '../')] || '';
}
