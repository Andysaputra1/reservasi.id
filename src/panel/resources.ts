export type Field = { key: string; label: string; type?: 'text'|'textarea'|'number'|'date'|'select'|'media'|'checkbox'; required?: boolean; table?: string; choices?: [string,string][] };
export type Resource = { key: string; title: string; singular: string; description: string; fields: Field[] };
const slug: Field = {key:'slug',label:'Nama unik / slug',required:true};
const names: Field[] = [{key:'name_id',label:'Nama · Indonesia',required:true},{key:'name_en',label:'Nama · English',required:true}];
const titles: Field[] = [{key:'title_id',label:'Judul · Indonesia',required:true},{key:'title_en',label:'Judul · English',required:true}];
const descriptions: Field[] = [{key:'description_id',label:'Deskripsi · Indonesia',type:'textarea'},{key:'description_en',label:'Deskripsi · English',type:'textarea'}];
const order: Field = {key:'sort_order',label:'Urutan tampil (angka kecil lebih dulu)',type:'number'};
const published: Field = {key:'is_published',label:'Tampilkan di website',type:'checkbox'};
export const resources: Resource[] = [
 {key:'posters',title:'Poster & penawaran',singular:'poster',description:'Atur tiket, promo, dan informasi harga dalam satu tempat.',fields:[...titles,slug,...descriptions,
  {key:'kind',label:'Isi poster',type:'select',choices:[['price','Informasi harga'],['promo','Promo']]},
  {key:'service_type_id',label:'Jenis layanan',type:'select',table:'service_types',required:true},
  {key:'provider_id',label:'Provider',type:'select',table:'providers',required:true},
  {key:'image_id',label:'Gambar poster',type:'media',required:true},
  {key:'thumbnail_id',label:'Thumbnail (opsional)',type:'media'},
  {key:'status',label:'Status publikasi',type:'select',choices:[['draft','Draft'],['published','Tayang'],['archived','Arsip']]},
  {key:'valid_from',label:'Mulai berlaku (opsional)',type:'date'},
  {key:'valid_until',label:'Berlaku sampai (kosong = sampai diperbarui)',type:'date'},
  {key:'expiry_action',label:'Setelah masa berlaku berakhir',type:'select',choices:[['label','Tetap tampil · label sudah berakhir'],['hide','Sembunyikan otomatis']]},
  {key:'period_id',label:'Catatan periode · Indonesia'}, {key:'period_en',label:'Catatan periode · English'},order]},
 {key:'destinations',title:'Destinasi',singular:'destinasi',description:'Pilihan destinasi yang mengarahkan pengunjung ke katalog.',fields:[...titles,slug,...descriptions,{key:'country_id',label:'Negara tujuan',type:'select',table:'countries',required:true},{key:'city_id',label:'Kota (opsional)',type:'select',table:'cities'},{key:'badge_id',label:'Label · Indonesia'},{key:'badge_en',label:'Label · English'},{key:'image_id',label:'Foto destinasi',type:'media'},order,published]},
 {key:'hero_slides',title:'Foto beranda',singular:'foto beranda',description:'Gambar besar yang menyambut pengunjung website.',fields:[slug,{key:'image_id',label:'Foto beranda',type:'media',required:true},order,published]},
 {key:'countries',title:'Negara',singular:'negara',description:'Kelola negara tujuan untuk katalog dan kota.',fields:[...names,slug,{key:'code',label:'Kode negara (2 huruf, contoh ID)',required:true},order,published]},
 {key:'cities',title:'Kota',singular:'kota',description:'Pilihan kota asal dan tujuan perjalanan.',fields:[...names,slug,{key:'country_id',label:'Negara',type:'select',table:'countries',required:true},order,published]},
 {key:'service_types',title:'Jenis layanan',singular:'layanan',description:'Misalnya tiket ferry, paket wisata, atau tiket atraksi.',fields:[...names,slug,order,published]},
 {key:'providers',title:'Provider',singular:'provider',description:'Partner perjalanan dan penyedia tiket.',fields:[{key:'name',label:'Nama provider',required:true},slug,...descriptions,{key:'logo_id',label:'Logo',type:'media'},order,published]},
 {key:'media_assets',title:'Pustaka gambar',singular:'gambar',description:'Semua poster, thumbnail, logo, dan foto website.',fields:[slug,{key:'alt_id',label:'Deskripsi gambar · Indonesia'},{key:'alt_en',label:'Deskripsi gambar · English'},order,published]},
];
export const rowName = (row: any) => row.title_id || row.name_id || row.name || row.slug || row.key || 'Tanpa nama';
export const toSlug = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export function initialRecord(resource: Resource) {
 const result: any = {};
 for(const field of resource.fields) result[field.key] = field.type==='checkbox'?false:field.type==='number'?0:field.choices?.[0][0]??'';
 return result;
}
export function posterState(row: any, now = new Date()) {
 if(row.status==='archived') return 'Arsip';
 if(row.status==='draft' || !row.is_published) return 'Draft';
 const date = now.toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'});
 if(row.valid_from && row.valid_from > date) return 'Terjadwal';
 if(row.valid_until && row.valid_until < date) return row.expiry_action==='hide'?'Berakhir · tersembunyi':'Sudah berakhir';
 return 'Tayang';
}
