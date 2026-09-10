import { useState } from 'react';
import type { FormEvent } from 'react';
import { supabase, mediaUrl } from '../lib/supabase';
import CustomDropdown from '../component/ui/CustomDropdown';
import useDialog from '../component/ui/useDialog';
import { initialRecord, rowName, toSlug } from './resources';
import type { Resource, Field } from './resources';
import { errorMessage, uploadImage } from './api';

export default function RecordEditor({resource,record,rows,onClose,onSaved,onMediaAdded}: {
 resource:Resource;record:any;rows:Record<string,any[]>;onClose:()=>void;onSaved:()=>void;onMediaAdded:(row:any)=>void;
}) {
 const [form,setForm]=useState<any>({...initialRecord(resource),...record});
 const [countries,setCountries]=useState<string[]>(rows.poster_countries.filter(r=>r.poster_id===record.id).map(r=>r.country_id));
 const [cities,setCities]=useState<string[]>(rows.poster_cities.filter(r=>r.poster_id===record.id).map(r=>r.city_id));
 const [busy,setBusy]=useState(false);const [uploading,setUploading]=useState(false);const [error,setError]=useState('');const [dirty,setDirty]=useState(false);
 const [discard,setDiscard]=useState(false);
 const close=()=>{if(busy||uploading)return;if(dirty)setDiscard(true);else onClose();};
 const dialog=useDialog(true,close);
 function change(key:string,value:any){setDirty(true);setForm((current:any)=>({...current,[key]:value,...(!record.id&&(!current.slug||current.slug===toSlug(current.title_id||current.name_id||current.name||''))&&['title_id','name_id','name'].includes(key)?{slug:toSlug(value)}:{})}));}
 async function upload(file:File|undefined,field?:string){
  if(!file)return;setUploading(true);setError('');
  try{const replacing=resource.key==='media_assets'&&form.id;const media=await uploadImage(file,replacing?form:undefined);if(!replacing)onMediaAdded(media);
   if(resource.key==='media_assets')setForm((current:any)=>({...current,...media}));else change(field!,media.id);
   setDirty(true);
  }catch(e){setError(errorMessage(e));}finally{setUploading(false);}
 }
 async function save(event:FormEvent){
  event.preventDefault();setError('');
  for(const field of resource.fields){if(field.required&&!String(form[field.key]??'').trim()){setError(`Isi ${field.label.toLowerCase()} terlebih dahulu.`);return;}}
  if(resource.key==='media_assets'&&!form.object_path&&!form.source_path){setError('Upload gambar terlebih dahulu.');return;}
  if(resource.key==='posters'){
   if(form.valid_from&&form.valid_until&&form.valid_from>form.valid_until){setError('Tanggal akhir tidak boleh sebelum tanggal mulai.');return;}
   if(form.status==='published'){
    if(!countries.length){setError('Pilih minimal satu negara untuk poster yang tayang.');return;}
    const required=[['providers',form.provider_id],['service_types',form.service_type_id],['media_assets',form.image_id],...countries.map(id=>['countries',id]),...cities.map(id=>['cities',id])];
    if(form.thumbnail_id)required.push(['media_assets',form.thumbnail_id]);
    if(required.some(([table,id])=>!rows[table].find(r=>r.id===id)?.is_published)){setError('Publikasikan provider, layanan, tujuan, dan gambar terkait terlebih dahulu sebelum menayangkan poster.');return;}
   }
  }
  if(resource.key==='destinations'&&form.city_id&&rows.cities.find(r=>r.id===form.city_id)?.country_id!==form.country_id){setError('Kota harus berada di negara tujuan yang dipilih.');return;}
  setBusy(true);
  try{
   const payload:any={};
   for(const field of resource.fields){let value=form[field.key];if(field.type==='number')value=Number(value||0);if((field.type==='date'||field.type==='media'||field.table)&&!value)value=null;payload[field.key]=typeof value==='string'?value.trim():value;}
   if(record.id||form.id)payload.id=record.id||form.id;
   if(resource.key==='media_assets')payload.object_path=form.object_path||null;
   if(resource.key==='countries')payload.code=payload.code.toUpperCase();
   let result;
   if(resource.key==='posters')result=await supabase!.rpc('save_poster',{payload,country_ids:countries,city_ids:cities});
   else result=payload.id?await supabase!.from(resource.key).update(payload).eq('id',payload.id).select('id').single():await supabase!.from(resource.key).insert(payload).select('id').single();
   if(result.error)throw result.error;
   onSaved();
  }catch(e){setError(errorMessage(e));}finally{setBusy(false);}
 }
 function renderField(field:Field){
  const value=form[field.key];
  if(field.type==='checkbox')return <label className="panel-checkbox" key={field.key}><input type="checkbox" checked={Boolean(value)} onChange={e=>change(field.key,e.target.checked)}/>{field.label}</label>;
  if(field.type==='select'||field.type==='media'){
   let choices=field.choices?.map(([value,city])=>({value,city}))||rows[field.type==='media'?'media_assets':field.table!].filter(r=>field.key!=='city_id'||!form.country_id||r.country_id===form.country_id).map(r=>({value:r.id,city:`${rowName(r)}${r.is_published?'':' · Draft'}`}));
   return <div className={field.type==='media'?'panel-media-field':''} key={field.key}><CustomDropdown label={field.label} value={value||''} onChange={v=>change(field.key,v)} options={[{value:'',city:field.required?'Pilih…':'Tidak dipilih'},...choices]}/>{field.type==='media'&&<><div className="panel-field-preview">{value&&<img src={mediaUrl(rows.media_assets.find(m=>m.id===value))} alt="Pratinjau gambar"/>}<label className="panel-upload">{uploading?'Mengupload…':'+ Upload gambar baru'}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading||busy} onChange={e=>{upload(e.target.files?.[0],field.key);e.target.value='';}}/></label></div><small>JPG, PNG, WebP, AVIF · maksimal 10 MB</small></>}</div>;
  }
  return <label key={field.key} className={field.type==='textarea'?'panel-wide':''}>{field.label}{field.required&&' *'}{field.type==='textarea'?<textarea rows={3} value={value||''} onChange={e=>change(field.key,e.target.value)}/>:<input type={field.type==='number'?'number':field.type==='date'?'date':'text'} required={field.required} value={value??''} onChange={e=>change(field.key,e.target.value)} {...(field.key==='slug'?{pattern:'[a-z0-9]+(-[a-z0-9]+)*',title:'Huruf kecil, angka, dan tanda hubung'}:{})}/>}</label>;
 }
 const toggle=(list:string[],id:string)=>list.includes(id)?list.filter(v=>v!==id):[...list,id];
 return <div className="panel-overlay"><section className="panel-editor" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="editor-title" tabIndex={-1}><header><div><p className="panel-eyebrow">{record.id?'EDIT KONTEN':'KONTEN BARU'}</p><h2 id="editor-title">{record.id?rowName(record):`Tambah ${resource.singular}`}</h2></div><button aria-label="Tutup editor" onClick={close} disabled={busy||uploading}>×</button></header><form onSubmit={save}><div className="panel-editor-body">
 {resource.key==='posters'&&<div className="panel-tip">Tanggal mengikuti WIB. Kosongkan tanggal akhir untuk harga yang berlaku sampai diperbarui. Tanggal pada gambar tidak berubah otomatis.</div>}
 {resource.key==='media_assets'&&<div className="panel-library-upload">{mediaUrl(form)&&<img src={mediaUrl(form)} alt="Pratinjau gambar"/>}<label className="panel-upload">{uploading?'Mengupload…':form.id?'Ganti file gambar':'Upload gambar'}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading||busy} onChange={e=>{upload(e.target.files?.[0]);e.target.value='';}}/></label><small>Gambar yang diupload dapat diakses melalui URL publik.</small></div>}
 <fieldset disabled={busy||uploading} className="panel-fields">{resource.fields.map(renderField)}</fieldset>
 {resource.key==='posters'&&<fieldset disabled={busy||uploading} className="panel-destinations"><legend>Tujuan poster</legend><p>Pilih satu atau beberapa negara. Kota bersifat opsional.</p><div className="panel-check-grid">{rows.countries.map(row=><label key={row.id} className="panel-checkbox"><input type="checkbox" checked={countries.includes(row.id)} onChange={()=>{const next=toggle(countries,row.id);setCountries(next);setCities(cities.filter(id=>next.includes(rows.cities.find(c=>c.id===id)?.country_id)));setDirty(true);}}/>{row.name_id}{!row.is_published?' · Draft':''}</label>)}</div><div className="panel-check-grid">{rows.cities.filter(c=>countries.includes(c.country_id)).map(row=><label key={row.id} className="panel-checkbox"><input type="checkbox" checked={cities.includes(row.id)} onChange={()=>{setCities(toggle(cities,row.id));setDirty(true);}}/>{row.name_id}</label>)}</div></fieldset>}
 {error&&<p className="panel-alert" role="alert">{error}</p>}
 {discard&&<div className="panel-alert" role="alert"><p>Perubahan formulir belum disimpan. Tutup editor? File yang sudah diupload tetap tersimpan di Storage.</p><button type="button" onClick={()=>setDiscard(false)}>Lanjut edit</button> <button type="button" onClick={onClose}>Tutup tanpa menyimpan</button></div>}
 </div><footer><span>{dirty?'Ada perubahan belum disimpan':'Semua siap diedit'}</span><div><button type="button" onClick={close} disabled={busy||uploading}>Batal</button><button className="panel-primary" disabled={busy||uploading}>{busy?'Menyimpan…':'Simpan perubahan'}</button></div></footer></form></section></div>;
}
