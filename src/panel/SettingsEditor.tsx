import { useState } from 'react';
import { supabase, mediaUrl } from '../lib/supabase';
import { errorMessage, uploadImage, discardUpload, cleanupNotice } from './api';
import CustomDropdown from '../component/ui/CustomDropdown';
import ImageUpload from './ImageUpload';

export default function SettingsEditor({rows,onSaved}:{rows:Record<string,any[]>;onSaved:(notice?:string)=>void}){
 const lookup=(key:string)=>structuredClone(rows.site_content.find(r=>r.key===key)?.value||{});
 const [contact,setContact]=useState(lookup('contact'));const [carousel,setCarousel]=useState(lookup('carousel'));const [sections,setSections]=useState(lookup('sections'));const [translations,setTranslations]=useState(lookup('translations'));
 const [logoFile,setLogoFile]=useState<File|null>(null);
 const [query,setQuery]=useState('');const [busy,setBusy]=useState('');const [error,setError]=useState('');
 async function save(key:string,value:any){
  setBusy(key);setError('');let uploaded:any=null;
  try{
   if(key==='contact'&&!/^\d{8,15}$/.test(value.whatsapp||''))throw new Error('Nomor WhatsApp memakai kode negara dan angka saja, contoh 628123456789.');
   let next=value;
   if(key==='contact'&&logoFile){uploaded=await uploadImage(logoFile);next={...value,logo_id:uploaded.id};}
   const {error}=await supabase!.from('site_content').upsert({key,value:next,is_published:true},{onConflict:'key'});if(error)throw error;
   uploaded=null;
   if(key==='contact'){setContact(next);setLogoFile(null);}
   onSaved(await cleanupNotice());
  }catch(e){if(uploaded){try{await discardUpload(uploaded.id);}catch{/* Durable cleanup queue retries on next login. */}}setError(errorMessage(e));}finally{setBusy('');}
 }
 const keys=Object.keys(translations.id||{}).filter(key=>`${key} ${translations.id[key]} ${translations.en?.[key]}`.toLowerCase().includes(query.toLowerCase()));
 return <div className="panel-settings">{error&&<p className="panel-alert" role="alert">{error}</p>}<section className="panel-settings-card"><h2>Identitas & kontak</h2><p>Informasi ini dipakai di website dan tombol WhatsApp.</p><div className="panel-fields">{[['brand','Nama brand'],['whatsapp','WhatsApp · angka dengan kode negara'],['address','Alamat']].map(([key,label])=><label key={key}>{label}<input value={contact[key]||''} onChange={e=>setContact({...contact,[key]:e.target.value})}/></label>)}<ImageUpload label="Logo website" file={logoFile} src={mediaUrl(rows.media_assets.find(m=>m.id===contact.logo_id))||'/logo.svg'} onChange={setLogoFile} disabled={Boolean(busy)}/>{contact.logo_id&&<button type="button" disabled={Boolean(busy)} onClick={()=>{setLogoFile(null);setContact({...contact,logo_id:null});}}>Hapus logo ? gunakan bawaan</button>}</div><button className="panel-primary" disabled={Boolean(busy)} onClick={()=>save('contact',contact)}>{busy==='contact'?'Menyimpan…':'Simpan kontak'}</button></section>
 <section className="panel-settings-card"><h2>Tampilan website</h2><div className="panel-check-grid">{[['hero','Bagian pembuka'],['destinations','Destinasi populer'],['catalog','Katalog poster'],['about','Tentang & kontak']].map(([key,label])=><label className="panel-checkbox" key={key}><input type="checkbox" checked={sections[key]!==false} onChange={e=>setSections({...sections,[key]:e.target.checked})}/>{label}</label>)}</div><button className="panel-primary" disabled={Boolean(busy)} onClick={()=>save('sections',sections)}>Simpan tampilan</button></section>
 <section className="panel-settings-card"><h2>Gerakan katalog</h2><label className="panel-checkbox"><input type="checkbox" checked={Boolean(carousel.autoplay)} onChange={e=>setCarousel({...carousel,autoplay:e.target.checked})}/>Putar otomatis</label><div className="panel-fields"><label>Jeda antar kartu (detik)<input type="number" min="2" max="30" value={(carousel.interval_ms||5500)/1000} onChange={e=>setCarousel({...carousel,interval_ms:Math.max(2000,Math.min(30000,Number(e.target.value)*1000))})}/></label><label>Mulai bergerak setelah (detik)<input type="number" min="0.5" max="30" step="0.5" value={(carousel.initial_delay_ms||1800)/1000} onChange={e=>setCarousel({...carousel,initial_delay_ms:Math.max(500,Math.min(30000,Number(e.target.value)*1000))})}/></label><CustomDropdown label="Arah gerakan kartu" value={carousel.direction||'right'} onChange={direction=>setCarousel({...carousel,direction})} options={[{value:'right',city:'Ke kanan'},{value:'left',city:'Ke kiri'}]}/></div><button className="panel-primary" disabled={Boolean(busy)} onClick={()=>save('carousel',carousel)}>Simpan gerakan</button></section>
 <section className="panel-settings-card"><h2>Teks & bahasa</h2><p>Edit kalimat dalam dua bahasa. Judul dan deskripsi poster/destinasi ada di editor masing-masing.</p><label>Cari kalimat<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Contoh: perjalanan, tiket, tentang…"/></label><div className="panel-translations">{keys.map(key=><div className="panel-translation" key={key}><small>{key}</small><div className="panel-fields">{['id','en'].map(lang=><label key={lang}>{lang==='id'?'Indonesia':'English'}<textarea rows={2} value={translations[lang]?.[key]??''} onChange={e=>setTranslations({...translations,[lang]:{...translations[lang],[key]:e.target.value}})}/></label>)}</div></div>)}</div><button className="panel-primary" disabled={Boolean(busy)} onClick={()=>save('translations',translations)}>{busy==='translations'?'Menyimpan…':'Simpan teks & bahasa'}</button></section></div>;
}
