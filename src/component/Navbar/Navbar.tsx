import { useLanguage } from '../../i18n/LanguageContext';
import { useEffect, useState } from 'react';
import { useContent, useContact, useSetting } from '../../lib/content';
import { mediaUrl } from '../../lib/supabase';
import type { Country } from '../../data/posterCatalog';
import './Navbar.css';
import imgSingapore from '../../assets/Singapore.webp';
import imgBatam from '../../assets/Batam.webp';
import imgMalaysia from '../../assets/Malaysia.webp';
const fallbackSearch = [
 {id:'singapore',name:'Singapura',type:'Destinasi',image:imgSingapore,country:'Singapura'},
 {id:'batam',name:'Batam',type:'Destinasi',image:imgBatam,country:'Indonesia'},
 {id:'malaysia',name:'Malaysia',type:'Destinasi',image:imgMalaysia,country:'Malaysia'},
];
const Navbar = ({ onExplore }: { onExplore?: (country: Country) => void }) => {
 const { t, language, setLanguage } = useLanguage();
 const { rows } = useContent(); const contact = useContact(); const sections=useSetting('sections');
 const [isScrolled,setIsScrolled]=useState(false);
 const [isMobileMenuOpen,setIsMobileMenuOpen]=useState(false);
 const [searchTerm,setSearchTerm]=useState('');
 const [showSuggestions,setShowSuggestions]=useState(false);
 const searchData=sections.destinations===false?[]:rows?rows.destinations.map(d=>({id:d.id,name:d[`title_${language}`],type:t('Destinasi'),image:mediaUrl(rows.media_assets.find(m=>m.id===d.image_id)),country:rows.countries.find(c=>c.id===d.country_id)?.name_id})):fallbackSearch;
 const filteredSearch=searchData.filter(item=>`${item.name} ${t(item.name)}`.toLowerCase().includes(searchTerm.toLowerCase()));
 const pickSearch=(item:typeof searchData[number])=>{
  if(onExplore&&item.country) onExplore(item.country);
  else document.getElementById('destinations')?.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  setSearchTerm(''); setIsMobileMenuOpen(false); setShowSuggestions(false);
  (document.activeElement as HTMLElement | null)?.blur();
 };
 useEffect(()=>{const update=()=>setIsScrolled(window.scrollY>20);update();window.addEventListener('scroll',update,{passive:true});return()=>window.removeEventListener('scroll',update);},[]);
  return (
    <>
      <nav aria-label={t("Navigasi utama")} className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="container navbar-content">
          <div className="brand-wrapper">
            <a href="#home" className="navbar-brand" aria-label={t("Reservasi.id, beranda")}>
              <img src={mediaUrl(rows?.media_assets.find(m=>m.id===contact.logo_id)) || "/logo.svg"} alt="Logo" className="brand-logo" />
              <span className="brand-name">{contact.brand}</span>
            </a>
            <button aria-label={t(isMobileMenuOpen ? "Tutup menu" : "Buka menu")} aria-expanded={isMobileMenuOpen} aria-controls="nav-menu" className="hamburger-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>

          <div id="nav-menu" className={`navbar-menu-wrapper ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
            <ul className="navbar-links">
              {sections.hero !== false && <li><a href="#home" onClick={() => setIsMobileMenuOpen(false)}>{t("Beranda")}</a></li>}
              {sections.destinations !== false && <li><a href="#destinations" onClick={() => setIsMobileMenuOpen(false)}>{t("Destinasi")}</a></li>}
              {sections.catalog !== false && <li><a href="#schedule" onClick={() => setIsMobileMenuOpen(false)}>{t("Jadwal kapal")}</a></li>}
              {sections.about !== false && <li><a href="#about" onClick={() => setIsMobileMenuOpen(false)}>{t("Tentang kami")}</a></li>}
            </ul>

            <div className="navbar-actions">
               <div className="search-container">
                  <div className="search-wrapper">
                    <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input 
                        aria-label={t("Cari destinasi")} type="search" placeholder={t("Cari destinasi...")} value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(true); }}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && searchTerm && filteredSearch[0]) { e.preventDefault(); pickSearch(filteredSearch[0]); } }}
                    />
                  </div>
                  {showSuggestions && searchTerm && (
                  // Keep focus in the input while pressing a result, so a slow click isn't lost to the blur timeout
                  <div className="search-dropdown" onMouseDown={event => event.preventDefault()}>
                    {filteredSearch.length > 0 ? (
                      filteredSearch.map(item => (
                        <a key={item.id} href={onExplore && item.country ? '#schedule' : '#destinations'} className="search-item" onClick={event => { event.preventDefault(); pickSearch(item); }}>
                          <img src={item.image} alt={t(item.name)} />
                          <div><span className="item-name">{t(item.name)}</span><span className="item-type">{t(item.type)}</span></div>
                        </a>
                      ))
                    ) : (<div className="search-empty">{t("Tidak ditemukan")}</div>)}
                  </div>
                )}
              </div>
              
              <button className="btn-primary" onClick={() => { document.getElementById(sections.catalog === false ? 'home' : 'schedule')?.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'}); setIsMobileMenuOpen(false); }}>{t("Pesan tiket")}</button>
            </div>
          </div>
          <div className="language-switch" role="group" aria-label={t('Pilih bahasa')}>
            <button type="button" lang="id" aria-label="Bahasa Indonesia" aria-pressed={language === 'id'} onClick={() => setLanguage('id')}>ID</button>
            <span aria-hidden="true">/</span>
            <button type="button" lang="en" aria-label="English" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button>
          </div>
        </div>
      </nav>

    </>
  );
};
export default Navbar;
