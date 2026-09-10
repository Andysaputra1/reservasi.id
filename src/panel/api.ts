import { supabase } from '../lib/supabase';
import { contentTables } from '../lib/content';
import { toSlug } from './resources';

export async function loadAdminContent() {
 const result = await Promise.all(contentTables.map(async table=>{
  const {data,error} = await supabase!.from(table).select('*');
  if(error) throw error;
  return [table,(data || []).sort((a,b)=>(a.sort_order??0)-(b.sort_order??0)||String(a.created_at).localeCompare(String(b.created_at)))];
 }));
 return Object.fromEntries(result);
}
export async function flushMediaCleanup() {
 while(true){
 const {data,error}=await supabase!.from('media_cleanup').select('object_path').limit(100);
 if(error) throw error;
 if(!data?.length)return;
 for(const row of data||[]){
  const removed=await supabase!.storage.from('website-media').remove([row.object_path]);
  if(removed.error)throw removed.error;
  const done=await supabase!.from('media_cleanup').delete().eq('object_path',row.object_path);
  if(done.error)throw done.error;
 }
 }
}
export async function discardUpload(id: string) {
 const {error}=await supabase!.rpc('discard_unused_media',{media_id:id});
 if(error)throw error;
 await flushMediaCleanup();
}
export async function cleanupNotice() {
 try {await flushMediaCleanup();return '';}
 catch {return 'Perubahan tersimpan, tetapi penghapusan foto lama belum selesai. Tekan Coba bersihkan foto untuk melanjutkan.';}
}
export function errorMessage(error: any) {
 if(error?.code==='23503') return 'Data ini masih digunakan. Ganti atau hapus referensinya dahulu.';
 if(error?.code==='23505') return 'Kode sudah digunakan. Periksa kembali data yang dimasukkan.';
 if(error?.code==='42501') return 'Sesi tidak memiliki akses admin. Silakan masuk kembali.';
 if(error?.code==='23514') return error.message || 'Periksa kembali nilai dan rentang tanggal yang dimasukkan.';
 return error?.message || 'Perubahan belum berhasil. Silakan coba kembali.';
}
export async function uploadImage(file: File) {
 const allowed: Record<string,string> = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'};
 if(!allowed[file.type]) throw new Error('Gunakan gambar JPG, PNG, WebP, atau AVIF.');
 if(file.size>10*1024*1024) throw new Error('Ukuran gambar maksimal 10 MB.');
 const id=crypto.randomUUID();
 const object_path=`uploads/${id}.${allowed[file.type]}`;
 const {error:uploadError}=await supabase!.storage.from('website-media').upload(object_path,file,{contentType:file.type,cacheControl:'31536000'});
 if(uploadError) throw uploadError;
 const record={slug:`${toSlug(file.name.replace(/\.[^.]+$/,''))||'gambar'}-${id.slice(0,8)}`,object_path,alt_id:file.name,alt_en:file.name,is_published:true};
 const query=supabase!.from('media_assets').insert(record);
 const {data,error}=await query.select().single();
 if(error) { await supabase!.storage.from('website-media').remove([object_path]); throw error; }
 return data;
}
