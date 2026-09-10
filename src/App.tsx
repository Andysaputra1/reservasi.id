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

export default function App() {
  useScrollReveal();
  const { t } = useLanguage();
  const [catalogRequest, setCatalogRequest] = useState<{ country: Country } | null>(null);
  return (
    <>
      <a className="skip-link" href="#main">{t("Lewati ke konten utama")}</a>
      <Navbar/>
      <main id="main">
      <Hero/>
      <TopDestinations onExplore={country => setCatalogRequest({ country })}/>
      <PosterShowcase countryRequest={catalogRequest}/>
      </main>
      <AboutUs/>
    </>
  )
}
