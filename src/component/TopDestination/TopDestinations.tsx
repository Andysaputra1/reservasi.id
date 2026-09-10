import { useContent } from '../../lib/content';
import { mediaUrl } from '../../lib/supabase';
import { useLanguage } from '../../i18n/LanguageContext';
import type { Country } from '../../data/posterCatalog';
import './TopDestinations.css';

import imgBatam from "../../assets/Batam.webp" 
import imgMalay from "../../assets/Malaysia.webp" 
import imgSingapore from "../../assets/Singapore.webp" 


const fallbackDestinations = [
  {
    id: 1, name: "Singapura", location: "HarbourFront Centre", highlight: "Kota & Atraksi",
    image: imgSingapore,
    desc: "Nikmati wisata belanja dan hiburan kelas dunia di Singapura.",
  },
  {
    id: 2, name: "Batam", location: "Batam Centre", highlight: "Seafood & Belanja",
    image: imgBatam,
    desc: "Gerbang wisata bahari dengan pantai indah dan kuliner lezat.",
  },
  {
    id: 3, name: "Malaysia", location: "Stulang Laut, Johor Bahru", highlight: "Budaya & Kuliner",
    image: imgMalay,
    desc: "Jelajahi budaya Melayu dan wisata sejarah di Malaysia.",
  },
];

const TopDestinations = ({ onExplore }: { onExplore: (country: Country) => void }) => {
  const { t, language } = useLanguage();
  const {rows} = useContent();
  const destinations = rows ? rows.destinations.filter(d=>rows.countries.some(c=>c.id===d.country_id)).map(d=>({id:d.id,name:d[`title_${language}`],location:rows.cities.find(c=>c.id===d.city_id)?.[`name_${language}`] || rows.countries.find(c=>c.id===d.country_id)?.[`name_${language}`],highlight:d[`badge_${language}`],image:mediaUrl(rows.media_assets.find(m=>m.id===d.image_id)),desc:d[`description_${language}`],country:rows.countries.find(c=>c.id===d.country_id)?.name_id})) : fallbackDestinations.map(d=>({...d,country:d.name === 'Batam' ? 'Indonesia' : d.name}));
  return (
    <section id="destinations" className="dest-section">
      <div className="container">
        
        <div className="dest-header" data-reveal>
          <div>
            <h4 className="sub-title">{t("PILIHAN FAVORIT")}</h4>
            <h2 className="main-title">{t("Destinasi Populer")}</h2>
          </div>
          <p className="dest-desc">{t("Dari akhir pekan singkat hingga petualangan baru. Pilih tempat yang ingin Anda tuju.")}</p>
        </div>

        <div className="dest-grid">
          {destinations.map((item, index) => (
            <div key={item.id} className="dest-card" data-reveal data-reveal-delay={index * 90}>
              <div className="card-image-wrapper">
                {item.image && <img loading="lazy" decoding="async" src={item.image} alt={t(item.name)} />}
                <div className="destination-country-tag">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18Z"/></svg>
                  <span>{t(item.highlight)}</span>
                </div>
              </div>

              <div className="card-content">
                <div className="location-info">
                  <span className="location-icon">📍</span>{item.location}
                </div>
                <h3>{t(item.name)}</h3>
                <p>{t(item.desc)}</p>
                
                <button className="btn-detail" onClick={() => onExplore(item.country)}>{t("Jelajahi pilihan")}<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
};

export default TopDestinations;
