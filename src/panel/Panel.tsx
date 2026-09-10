import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ADMIN_EMAIL, ADMIN_USERNAME, supabase, mediaUrl } from '../lib/supabase';
import { resources, rowName, posterState } from './resources';
import { loadAdminContent, errorMessage, cleanupNotice, flushMediaCleanup } from './api';
import Editor from './RecordEditor';
import SettingsEditor from './SettingsEditor';
import PosterPreview from './PosterPreview';
import './Panel.css';
import useDialog from '../component/ui/useDialog';

export default function Panel() {
 const [access,setAccess]=useState<'checking'|'login'|'admin'>('checking');
 const [username,setUsername]=useState(''); const [password,setPassword]=useState('');
 const [busy,setBusy]=useState(false); const [error,setError]=useState('');
 const [rows,setRows]=useState<Record<string,any[]>|null>(null);
 const [section,setSection]=useState('posters'); const [search,setSearch]=useState('');
 const [editing,setEditing]=useState<any|null>(null); const [notice,setNotice]=useState('');
 const [deleteRow,setDeleteRow]=useState<any|null>(null);
 const [previewRow,setPreviewRow]=useState<any|null>(null);
 const deleteDialog=useDialog(Boolean(deleteRow),()=>{if(!busy)setDeleteRow(null);});
 const resource=resources.find(item=>item.key===section);
 const reload=useCallback(async()=>{ const next=await loadAdminContent();setRows(next);const cleanup=await cleanupNotice();if(cleanup)setNotice(cleanup); },[]);
 useEffect(()=>{
  document.title='Panel Admin · Reservasi.id';
  if(!supabase){setAccess('login');return;}
  let active=true; let version=0;
  const verify=async(session:any)=>{
   const attempt=++version;
   if(!session){if(active){setAccess('login');setRows(null);}return;}
   const {data,error}=await supabase!.rpc('is_admin');
   if(!active||attempt!==version)return;
   if(error||data!==true){setAccess('login');setRows(null);setError('Akun ini belum memiliki akses administrator.');return;}
   setAccess('admin');
   try{await reload();}catch(e){if(active)setError(errorMessage(e));}
  };
  supabase.auth.getSession().then(({data})=>verify(data.session));
  const {data}=supabase.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>{if(active)verify(session);},0);});
  return()=>{active=false;data.subscription.unsubscribe();};
 },[reload]);
 async function login(event:FormEvent){
  event.preventDefault();setError('');
  if(!supabase){setError('Koneksi Supabase belum dikonfigurasi.');return;}
  if(username.trim().toLowerCase()!==ADMIN_USERNAME){setError('Username atau password tidak cocok.');return;}
  setBusy(true);
  try{const {error}=await supabase.auth.signInWithPassword({email:ADMIN_EMAIL,password});if(error)throw error;setPassword('');}
  catch{setError('Tidak dapat masuk. Periksa username, password, dan koneksi internet.');}
  finally{setBusy(false);}
 }
 async function logout(){setBusy(true);const result=await supabase!.auth.signOut({scope:'local'});setBusy(false);if(result.error){setError(errorMessage(result.error));return;}setEditing(null);setRows(null);setAccess('login');}
 async function saved(message?:string){setEditing(null);setNotice(message||'Perubahan tersimpan. Konten yang tayang sudah tersedia di website.');try{await reload();}catch(e){setError(errorMessage(e));}}
 async function remove(){
  if(!deleteRow||!resource)return; setBusy(true);setError('');
  try{const {error}=await supabase!.rpc('delete_content',{table_name:resource.key,item_id:deleteRow.id});if(error)throw error;
   setDeleteRow(null);setNotice(await cleanupNotice()||'Konten dan gambarnya berhasil dihapus.');await reload();
  }catch(e){setError(errorMessage(e));}finally{setBusy(false);}
 }
 if(access!=='admin')return <main className="panel-login"><a className="panel-brand" href="/"><img src="/logo.svg" alt=""/>Reservasi.id <span>STUDIO</span></a><div className="panel-login-layout"><section className="panel-login-intro"><p className="panel-eyebrow">RUANG KERJA ADMIN</p><h1>Perjalanan baru,<br/>dimulai dari sini.</h1><p>Kelola destinasi, cerita, dan penawaran terbaik untuk perjalanan berikutnya.</p><div className="panel-login-note">Satu tempat untuk seluruh konten perjalanan Anda.</div></section><form className="panel-login-card" onSubmit={login}><span className="panel-mark">R.</span><h2>Selamat datang kembali</h2><p>Masuk ke ruang kerja Reservasi.id.</p>{access==='checking'?<p role="status">Memeriksa sesi…</p>:<><label>Username<input autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required autoCapitalize="none" spellCheck={false}/></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{error&&<p role="alert" className="panel-alert">{error}</p>}<button className="panel-primary" disabled={busy||!supabase}>{busy?'Memproses…':'Masuk ke panel →'}</button></>}<a href="/">← Kembali ke website</a></form></div></main>;
 const list=(rows?.[section]||[]).filter(row=>`${rowName(row)} ${row.description_id||''}`.toLowerCase().includes(search.toLowerCase()));
 const expired=(rows?.posters||[]).filter(row=>posterState(row).toLowerCase().includes('berakhir')).length;
 return <div className="panel-shell"><aside className="panel-sidebar"><a className="panel-brand" href="/"><img src="/logo.svg" alt=""/>Reservasi.id</a><span className="panel-eyebrow">CONTENT STUDIO</span><nav aria-label="Menu admin">{resources.map(item=><button key={item.key} className={section===item.key?'active':''} onClick={()=>{setSection(item.key);setSearch('');setNotice('');setError('');}}>{item.title}<span>{rows?.[item.key]?.length??'—'}</span></button>)}<button className={section==='settings'?'active':''} onClick={()=>{setSection('settings');setNotice('');}}>Teks & pengaturan <span>↗</span></button></nav><div className="panel-sidebar-bottom"><a href="/" target="_blank" rel="noreferrer">Lihat website ↗</a><button onClick={logout} disabled={busy}>Keluar dari akun</button><small>Masuk sebagai administrator</small></div></aside><main className="panel-main"><header className="panel-topbar"><span>Ruang kerja / {resource?.title||'Pengaturan'}</span><span className="panel-account">A <span>Administrator</span></span></header><div className="panel-workspace"><div className="panel-page-heading"><div><p className="panel-eyebrow">KELOLA KONTEN</p><h1>{resource?.title||'Teks & pengaturan'}</h1><p>{resource?.description||'Atur identitas, bahasa, dan tampilan website.'}</p></div>{resource&&<button className="panel-primary" disabled={!rows} onClick={()=>setEditing({})}>+ Tambah {resource.singular}</button>}</div>
 {section==='posters'&&<div className="panel-stats"><div><span>Seluruh poster</span><strong>{rows?.posters.length??'—'}</strong></div><div><span>Aktif / terjadwal</span><strong>{rows?.posters.filter(p=>['Tayang','Terjadwal'].includes(posterState(p))).length??'—'}</strong></div><div><span>Perlu diperbarui</span><strong>{expired}</strong></div></div>}
 {error&&<div className="panel-alert" role="alert">{error} <button onClick={()=>{setError('');reload().catch(e=>setError(errorMessage(e)));}}>Coba lagi</button></div>}{notice&&<div className="panel-notice" role="status">✓ {notice}{notice.includes('penghapusan foto')&&<button onClick={async()=>{try{await flushMediaCleanup();setNotice('Pembersihan foto selesai.');}catch(e){setError(errorMessage(e));}}}>Coba bersihkan foto</button>}</div>}
 {!rows?<p role="status">Memuat konten…</p>:section==='settings'?<SettingsEditor rows={rows} onSaved={saved}/>:<><div className="panel-list-toolbar"><label className="panel-search"><span>Cari {resource?.singular}</span><input type="search" placeholder={`Cari ${resource?.singular}…`} value={search} onChange={e=>setSearch(e.target.value)}/></label><span>{list.length} item</span></div><div className="panel-records">{list.map(row=>{
 const image=rows.media_assets.find(m=>m.id===(row.image_id||row.logo_id));
 const state=section==='posters'?posterState(row):row.is_published?'Tayang':'Draft';
 return <article className="panel-record" key={row.id}>{image?<img className="panel-record-image" src={mediaUrl(image)} alt={image.alt_id||''} loading="lazy"/>:<span className="panel-record-placeholder">{rowName(row).slice(0,2).toUpperCase()}</span>}<div className="panel-record-info"><span className={`panel-status ${state==='Tayang'?'live':''}`}>{state}</span><h2>{rowName(row)}</h2><p>{section==='posters'?`${row.kind==='promo'?'Promo':'Informasi harga'} · ${row.valid_until?`Sampai ${row.valid_until}`:'Berlaku sampai diperbarui'}`:row.description_id||row.name_en||row.alt_id||`Urutan ${row.sort_order}`}</p></div><div className="panel-record-actions">{section==='posters'&&<button onClick={()=>setPreviewRow(row)}>Preview</button>}<button onClick={()=>{setError('');setEditing(row);}}>Edit <span aria-hidden="true">↗</span></button><button className="panel-delete-link" onClick={()=>setDeleteRow(row)} aria-label={`Hapus ${rowName(row)}`}>Hapus</button></div></article>;
 })}</div>{list.length===0&&<div className="panel-empty"><h2>{search?'Tidak ada hasil pencarian':'Belum ada konten'}</h2><p>{search?'Coba kata kunci lain.':`Tambahkan ${resource?.singular} pertama Anda.`}</p></div>}</>}
 </div></main>{editing&&resource&&rows&&<Editor key={`${section}-${editing.id||'new'}`} resource={resource} record={editing} rows={rows} onClose={()=>setEditing(null)} onSaved={saved}/>}
 {previewRow&&rows&&<PosterPreview record={previewRow} rows={rows} onClose={()=>setPreviewRow(null)}/>}
 {deleteRow&&<div className="panel-overlay"><section ref={deleteDialog} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className="panel-confirm"><h2 id="delete-title">Hapus {rowName(deleteRow)}?</h2><p>Data yang masih digunakan tidak dapat dihapus. Gambar milik konten ini ikut dihapus dari penyimpanan.</p>{error&&<p className="panel-alert" role="alert">{error}</p>}<div><button autoFocus onClick={()=>setDeleteRow(null)} disabled={busy}>Batal</button><button className="panel-danger" onClick={remove} disabled={busy}>{busy?'Menghapus…':'Hapus data'}</button></div></section></div>}
 </div>;
}
