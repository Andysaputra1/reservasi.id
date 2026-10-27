import { useLanguage } from './i18n/LanguageContext';
import { useState } from 'react';
import type { Country } from './data/posterCatalog';
import Navbar from './component/Navbar/Navbar'
import Hero from './component/Hero/Hero'
import TopDestinations from './component/TopDestination/TopDestinations'
import PosterShowcase from './component/FerryPartners/PosterShowcase'
import AboutUs from './component/AboutUs/AboutUs'
import useScrollReveal from './component/ui/useScrollReveal';

import './App.css'
import { useContent, useSetting } from './lib/content';
import { configured } from './lib/supabase';

export default function App() {
  const { rows, loading, error, refresh } = useContent();
  if (configured && !rows) return <main className="content-loading"><img src="/logo.svg" alt="Reservasi.id" width="48"/><p role={error?'alert':'status'}>{loading?'Menyiapkan perjalanan Anda…':error}</p>{error&&<button onClick={refresh}>Coba lagi</button>}</main>;
  return <Website />;
}
function Website() {
  useScrollReveal();
  const sections = useSetting('sections');
  const { t } = useLanguage();
  const [catalogRequest, setCatalogRequest] = useState<{ country: Country } | null>(null);
  return (
    <>
      <a className="skip-link" href="#main">{t("Lewati ke konten utama")}</a>
      <Navbar onExplore={sections.catalog !== false ? country => setCatalogRequest({ country }) : undefined}/>
      <main id="main">
      {sections.hero !== false && <Hero/>}
      {sections.destinations !== false && <TopDestinations onExplore={country => setCatalogRequest({ country })}/>}
      {sections.catalog !== false && <PosterShowcase countryRequest={catalogRequest}/>}
      </main>
      {sections.about !== false && <AboutUs/>}
    </>
  )
}
