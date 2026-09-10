import { useEffect, useState } from 'react';

export function useImagePreview(file: File | null, fallback: string) {
 const [preview,setPreview]=useState('');
 useEffect(()=>{
  if(!file){setPreview('');return;}
  const url=URL.createObjectURL(file);setPreview(url);
  return()=>URL.revokeObjectURL(url);
 },[file]);
 return file?preview:fallback;
}
export default function ImageUpload({label,file,src,onChange,disabled=false}:{label:string;file:File|null;src:string;onChange:(file:File)=>void;disabled?:boolean}){
 const preview=useImagePreview(file,src);
 const [error,setError]=useState('');
 return <div className="panel-image-upload"><span>{label}</span><div className="panel-upload-area">{preview?<img src={preview} alt="Pratinjau gambar pilihan"/>:<div className="panel-upload-placeholder" aria-hidden="true">↥</div>}<div><label className="panel-upload">{preview?'Ganti gambar':'Pilih gambar'}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={disabled} onChange={e=>{
  const next=e.target.files?.[0];e.target.value='';if(!next)return;
  if(!['image/jpeg','image/png','image/webp','image/avif'].includes(next.type)){setError('Gunakan JPG, PNG, WebP, atau AVIF.');return;}
  if(next.size>10*1024*1024){setError('Ukuran gambar maksimal 10 MB.');return;}
  setError('');onChange(next);
 }}/></label><p>{file?.name||'Satu konten, satu gambar.'}</p><small>JPG, PNG, WebP, AVIF · maks. 10 MB<br/>Gambar diupload saat perubahan disimpan.</small></div></div>{error&&<p className="panel-alert" role="alert">{error}</p>}</div>;
}
