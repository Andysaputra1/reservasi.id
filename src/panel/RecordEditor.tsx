import { useState } from 'react';
import type { FormEvent } from 'react';
import { supabase, mediaUrl } from '../lib/supabase';
import CustomDropdown from '../component/ui/CustomDropdown';
import useDialog from '../component/ui/useDialog';
import { initialRecord, rowName } from './resources';
import type { Resource, Field } from './resources';
import { errorMessage, uploadImage, discardUpload, cleanupNotice } from './api';
import ImageUpload, { useImagePreview } from './ImageUpload';
import PosterPreview from './PosterPreview';

export default function RecordEditor({resource,record,rows,onClose,onSaved}: {
 resource:Resource;record:any;rows:Record<string,any[]>;onClose:()=>void;onSaved:(notice?:string)=>void;
}) {
 const [form,setForm]=useState<any>({...initialRecord(resource),sort_order:record.id?rows[resource.key].findIndex(r=>r.id===record.id)+1:rows[resource.key].length+1,...record});
 const [countries,setCountries]=useState<string[]>(rows.poster_countries.filter(r=>r.poster_id===record.id).map(r=>r.country_id));
 const [cities,setCities]=useState<string[]>(rows.poster_cities.filter(r=>r.poster_id===record.id).map(r=>r.city_id));
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [dirty,setDirty]=useState(false);
 const [discard,setDiscard]=useState(false);
 const [file,setFile]=useState<File|null>(null);
 const [preview,setPreview]=useState(false);
 const mediaField=resource.fields.find(f=>f.type==='media');
 const imagePreview=useImagePreview(file,mediaUrl(rows.media_assets.find(m=>m.id===form[mediaField?.key||'image_id'])));
 const close=()=>{if(busy)return;if(dirty)setDiscard(true);else onClose();};
 const dialog=useDialog(true,close);
 function change(key:string,value:any){setDirty(true);setForm((current:any)=>({...current,[key]:value}));}
 async function save(event:FormEvent){
  event.preventDefault();setError('');
  for(const field of resource.fields){if(field.required&&!(field.type==='media'&&file)&&!String(form[field.key]??'').trim()){setError(`Isi ${field.label.toLowerCase()} terlebih dahulu.`);return;}}
  if(resource.key==='posters'){
   if(form.valid_from&&form.valid_until&&form.valid_from>form.valid_until){setError('Tanggal akhir tidak boleh sebelum tanggal mulai.');return;}
   if(form.status==='published'){
    if(!countries.length){setError('Pilih minimal satu negara untuk poster yang tayang.');return;}
    const required=[['providers',form.provider_id],['service_types',form.service_type_id],...countries.map(id=>['countries',id]),...cities.map(id=>['cities',id])];
    if(required.some(([table,id])=>!rows[table].find(r=>r.id===id)?.is_published)){setError('Publikasikan provider, layanan, tujuan, dan gambar terkait terlebih dahulu sebelum menayangkan poster.');return;}
   }
  }
  if(resource.key==='destinations'&&form.city_id&&rows.cities.find(r=>r.id===form.city_id)?.country_id!==form.country_id){setError('Kota harus berada di negara tujuan yang dipilih.');return;}
  setBusy(true);
  let uploaded:any=null;
  try{
   const payload:any={};
   for(const field of resource.fields){let value=form[field.key];if(field.type==='number'||field.key==='sort_order')value=Number(value||0);if((field.type==='date'||field.type==='media'||field.table)&&!value)value=null;payload[field.key]=typeof value==='string'?value.trim():value;}
   if(record.id||form.id)payload.id=record.id||form.id;
   if(file&&mediaField){uploaded=await uploadImage(file);payload[mediaField.key]=uploaded.id;}
   if(resource.key==='posters')payload.thumbnail_id=payload.image_id;
   if(resource.key==='countries')payload.code=payload.code.toUpperCase();
   const result=await supabase!.rpc('save_content',{table_name:resource.key,payload,country_ids:countries,city_ids:cities});
   if(result.error)throw result.error;
   uploaded=null;
   onSaved(await cleanupNotice());
  }catch(e){let message=errorMessage(e);if(uploaded){try{await discardUpload(uploaded.id);}catch{message+=' Pembersihan upload akan dicoba kembali saat panel dimuat ulang.';}}setError(message);}finally{setBusy(false);}
 }
 function renderField(field:Field){
  const value=form[field.key];
  if(field.type==='checkbox')return <label className="panel-checkbox" key={field.key}><input type="checkbox" checked={Boolean(value)} onChange={e=>change(field.key,e.target.checked)}/>{field.label}</label>;
  if(field.type==='media')return <ImageUpload key={field.key} label={field.label} src={mediaUrl(rows.media_assets.find(m=>m.id===value))} file={file} disabled={busy} onChange={next=>{setFile(next);setDirty(true);}}/>;
  if(field.key==='sort_order')return <div key={field.key}><CustomDropdown label="Posisi tampil" value={String(value||1)} onChange={v=>change(field.key,Number(v))} options={Array.from({length:rows[resource.key].length+(record.id?0:1)},(_,i)=>({value:String(i+1),city:`${i+1}${i===0?' ? Paling awal':''}`}))}/><small>Konten lain otomatis bergeser mengikuti posisi ini.</small></div>;
  if(field.type==='select'){
   const choices=field.choices?.map(([value,city])=>({value,city}))||rows[field.table!].filter(r=>field.key!=='city_id'||!form.country_id||r.country_id===form.country_id).map(r=>({value:r.id,city:`${rowName(r)}${r.is_published?'':' ? Draft'}`}));
   return <CustomDropdown key={field.key} label={field.label} value={value||''} onChange={v=>change(field.key,v)} options={field.choices?choices:[{value:'',city:field.required?'Pilih?':'Tidak dipilih'},...choices]}/>;
  }
  return <label key={field.key} className={field.type==='textarea'?'panel-wide':''}>{field.label}{field.required&&' *'}{field.type==='textarea'?<textarea rows={3} value={value||''} onChange={e=>change(field.key,e.target.value)}/>:<input type={field.type==='number'?'number':field.type==='date'?'date':'text'} required={field.required} value={value??''} onChange={e=>change(field.key,e.target.value)}/>}</label>;
 }
 const toggle=(list:string[],id:string)=>list.includes(id)?list.filter(v=>v!==id):[...list,id];
 return <div className="panel-overlay"><section className="panel-editor" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="editor-title" tabIndex={-1}><header><div><p className="panel-eyebrow">{record.id?'EDIT KONTEN':'KONTEN BARU'}</p><h2 id="editor-title">{record.id?rowName(record):`Tambah ${resource.singular}`}</h2></div><button aria-label="Tutup editor" onClick={close} disabled={busy}>×</button></header><form onSubmit={save}><div className="panel-editor-body">
 {resource.key==='posters'&&<div className="panel-tip">Tanggal mengikuti WIB. Kosongkan tanggal akhir untuk harga yang berlaku sampai diperbarui. Tanggal pada gambar tidak berubah otomatis.</div>}
 <fieldset disabled={busy} className="panel-fields">{resource.fields.map(renderField)}</fieldset>
 {resource.key==='posters'&&<fieldset disabled={busy} className="panel-destinations"><legend>Tujuan poster</legend><p>Pilih satu atau beberapa negara. Kota bersifat opsional.</p><div className="panel-check-grid">{rows.countries.map(row=><label key={row.id} className="panel-checkbox"><input type="checkbox" checked={countries.includes(row.id)} onChange={()=>{const next=toggle(countries,row.id);setCountries(next);setCities(cities.filter(id=>next.includes(rows.cities.find(c=>c.id===id)?.country_id)));setDirty(true);}}/>{row.name_id}{!row.is_published?' · Draft':''}</label>)}</div><div className="panel-check-grid">{rows.cities.filter(c=>countries.includes(c.country_id)).map(row=><label key={row.id} className="panel-checkbox"><input type="checkbox" checked={cities.includes(row.id)} onChange={()=>{setCities(toggle(cities,row.id));setDirty(true);}}/>{row.name_id}</label>)}</div></fieldset>}
 {error&&<p className="panel-alert" role="alert">{error}</p>}
 {discard&&<div className="panel-alert" role="alert"><p>Perubahan formulir belum disimpan. Tutup editor? Gambar pilihan belum diupload sebelum Anda menyimpan.</p><button type="button" onClick={()=>setDiscard(false)}>Lanjut edit</button> <button type="button" onClick={onClose}>Tutup tanpa menyimpan</button></div>}
 </div><footer><span>{dirty?'Ada perubahan belum disimpan':'Semua siap diedit'}</span><div>{resource.key==='posters'&&<button type="button" onClick={()=>setPreview(true)} disabled={busy}>Preview</button>}<button type="button" onClick={close} disabled={busy}>Batal</button><button className="panel-primary" disabled={busy}>{busy?'Menyimpan…':'Simpan perubahan'}</button></div></footer></form>{preview&&<PosterPreview record={form} rows={rows} image={imagePreview} countries={countries} onClose={()=>setPreview(false)}/>}</section></div>;
}
