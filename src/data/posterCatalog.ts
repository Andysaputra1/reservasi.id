export type Country = 'Indonesia' | 'Singapura' | 'Malaysia';
export type Service = 'ferry' | 'package';
export type CatalogFilters = { country: string; service: string; provider: string };
export type Poster = {
  id: string;
  image: string;
  thumbnail: string;
  title: { id: string; en: string };
  description: { id: string; en: string };
  countries: Country[];
  service: Service;
  provider: string;
  validUntil?: string;
  period?: { id: string; en: string };
};

const originals = import.meta.glob<string>(['../assetsbaru/*.png', '../playpackage/*.png'], { eager: true, query: '?url', import: 'default' });
const previews = import.meta.glob<string>('../assets/catalog/*.webp', { eager: true, query: '?url', import: 'default' });

function poster(folder: string, file: string, details: Omit<Poster, 'id' | 'image' | 'thumbnail'>): Poster {
  return { id: `${folder}-${file}`, image: originals[`../${folder}/${file}.png`], thumbnail: previews[`../assets/catalog/${folder}-${file}.webp`], ...details };
}

// Only catalogue metadata lives here. Fares and departure times remain in the posters.
// Replace the poster and preview, then update its period here when an offer changes.
export const posterCatalog: Poster[] = [
  poster('assetsbaru', 'image1', { title: { id: 'Batam Centre ↔ Stulang Laut', en: 'Batam Centre ↔ Stulang Laut' }, description: { id: 'Pilihan perjalanan ke Johor bersama Pintas & Dolphin.', en: 'Travel to Johor with Pintas & Dolphin.' }, countries: ['Indonesia', 'Malaysia'], service: 'ferry', provider: 'Pintas & Dolphin', validUntil: '2026-09-30', period: { id: 'Periode September 2026', en: 'September 2026 period' } }),
  poster('playpackage', 'image', { title: { id: 'Singapore Zoo', en: 'Singapore Zoo' }, description: { id: 'Tiket atraksi untuk menjelajahi dunia satwa bersama keluarga.', en: 'Attraction tickets for a family day discovering wildlife.' }, countries: ['Singapura'], service: 'package', provider: 'Singapore Zoo' }),
  poster('assetsbaru', 'image3', { title: { id: 'Jadwal Sindo Ferry', en: 'Sindo Ferry schedules' }, description: { id: 'Rute Singapura, Batam, Tanjung Balai & Tanjung Pinang.', en: 'Routes across Singapore, Batam, Tanjung Balai & Tanjung Pinang.' }, countries: ['Indonesia', 'Singapura'], service: 'ferry', provider: 'Sindo Ferry', period: { id: 'Berlaku mulai 19 Januari 2026', en: 'Effective from 19 January 2026' } }),
  poster('playpackage', 'image2', { title: { id: 'LEGOLAND Malaysia', en: 'LEGOLAND Malaysia' }, description: { id: 'Pilihan tiket Theme Park, Water Park, SEA LIFE dan kombo.', en: 'Theme Park, Water Park, SEA LIFE and combo ticket options.' }, countries: ['Malaysia'], service: 'package', provider: 'LEGOLAND' }),
  poster('assetsbaru', 'image2', { title: { id: 'Harbour Bay ↔ Puteri Harbour', en: 'Harbour Bay ↔ Puteri Harbour' }, description: { id: 'Jadwal perjalanan dengan pilihan kelas Economy dan VIP.', en: 'Ferry schedules with Economy and VIP fare options.' }, countries: ['Indonesia', 'Malaysia'], service: 'ferry', provider: 'Putri Anggreni' }),
  poster('playpackage', 'image3', { title: { id: 'Singapore Oceanarium', en: 'Singapore Oceanarium' }, description: { id: 'Tiket atraksi untuk mengenal kehidupan bawah laut.', en: 'Attraction tickets to discover life beneath the ocean.' }, countries: ['Singapura'], service: 'package', provider: 'Singapore Oceanarium' }),
  poster('assetsbaru', 'image4', { title: { id: 'Jadwal Batam Fast', en: 'Batam Fast schedules' }, description: { id: 'Pilihan rute Batam, Singapura dan Johor.', en: 'Ferry routes across Batam, Singapore and Johor.' }, countries: ['Indonesia', 'Singapura', 'Malaysia'], service: 'ferry', provider: 'Batam Fast', period: { id: 'Berlaku mulai 20 Maret 2026', en: 'Effective from 20 March 2026' } }),
  poster('assetsbaru', 'image5', { title: { id: 'Jadwal Majestic Fast Ferry', en: 'Majestic Fast Ferry schedules' }, description: { id: 'Singapura ↔ Batam dan Tanjung Pinang.', en: 'Singapore ↔ Batam and Tanjung Pinang.' }, countries: ['Indonesia', 'Singapura'], service: 'ferry', provider: 'Majestic Fast Ferry', period: { id: 'Berlaku mulai 15 Mei 2026', en: 'Effective from 15 May 2026' } }),
  poster('playpackage', 'image4', { title: { id: 'Adventure Cove', en: 'Adventure Cove' }, description: { id: 'Tiket atraksi untuk petualangan air di Singapura.', en: 'Attraction tickets for an aquatic adventure in Singapore.' }, countries: ['Singapura'], service: 'package', provider: 'Adventure Cove' }),
  poster('assetsbaru', 'image7', { title: { id: 'Harbour Bay ↔ HarbourFront', en: 'Harbour Bay ↔ HarbourFront' }, description: { id: 'Jadwal Horizon Ferry untuk perjalanan Batam–Singapura.', en: 'Horizon Ferry schedules for travel between Batam and Singapore.' }, countries: ['Indonesia', 'Singapura'], service: 'ferry', provider: 'Horizon Ferry' }),
  poster('assetsbaru', 'image8', { title: { id: 'Harbour Bay ↔ Stulang Laut', en: 'Harbour Bay ↔ Stulang Laut' }, description: { id: 'Jadwal hari kerja dan akhir pekan untuk rute Batam–Johor.', en: 'Weekday and weekend schedules for the Batam–Johor route.' }, countries: ['Indonesia', 'Malaysia'], service: 'ferry', provider: 'Marine Hawk / MV Ocean Dragon' }),
  poster('playpackage', 'image1', { title: { id: 'Universal Studios Singapore', en: 'Universal Studios Singapore' }, description: { id: 'Poster tiket Super Peakseason: Minions & Monsters Summer.', en: 'Super Peakseason ticket poster: Minions & Monsters Summer.' }, countries: ['Singapura'], service: 'package', provider: 'Universal Studios Singapore', period: { id: '29 Mei–11 Agustus · konfirmasi periode promo', en: '29 May–11 August · confirm promotional period' } }),
  poster('assetsbaru', 'image6', { title: { id: 'Gold Coast ↔ Stulang Laut', en: 'Gold Coast ↔ Stulang Laut' }, description: { id: 'Poster Dolphin: jadwal, harga tiket dan promo liburan sekolah.', en: 'Dolphin poster: schedules, fares and school holiday promotion.' }, countries: ['Indonesia', 'Malaysia'], service: 'ferry', provider: 'Dolphin Fast Ferry', validUntil: '2026-07-31', period: { id: 'Promo pada poster hingga 31 Juli 2026', en: 'Poster promotion through 31 July 2026' } }),
];

export const emptyFilters: CatalogFilters = { country: '', service: '', provider: '' };
export function matchesPoster(item: Poster, filters: CatalogFilters) {
  return (!filters.country || item.countries.includes(filters.country as Country))
    && (!filters.service || item.service === filters.service)
    && (!filters.provider || item.provider === filters.provider);
}
export function filterOptions(filters: CatalogFilters, key: keyof CatalogFilters) {
  const compatible = posterCatalog.filter(item => matchesPoster(item, { ...filters, [key]: '' }));
  return [...new Set(compatible.flatMap(item => key === 'country' ? item.countries : [item[key]]))];
}
export function isExpired(item: Poster, now = new Date()) {
  return !!item.validUntil && now.getTime() > new Date(`${item.validUntil}T23:59:59+07:00`).getTime();
}
