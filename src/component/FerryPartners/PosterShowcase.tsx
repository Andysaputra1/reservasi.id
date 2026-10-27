import { useCatalog } from '../../lib/catalog';
import { useContent, useContact, useSetting } from '../../lib/content';
import CustomDropdown from '../ui/CustomDropdown';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import useDialog from '../ui/useDialog';
import { emptyFilters, filterOptions, isExpired, matchesPoster } from '../../data/posterCatalog';
import type { CatalogFilters, Country, Poster } from '../../data/posterCatalog';
import './PosterShowcase.css';

export default function PosterShowcase({ countryRequest = null }: { countryRequest?: { country: Country } | null }) {
  const { t, language } = useLanguage();
  const posterCatalog = useCatalog();
  const {rows} = useContent();
  const contact = useContact();
  const carousel = useSetting('carousel', {autoplay:true,interval_ms:5500,initial_delay_ms:1800,direction:'left'});
  const [filters, setFilters] = useState<CatalogFilters>(emptyFilters);
  const [selected, setSelected] = useState<Poster | null>(null);
  const [zoom, setZoom] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [interacting, setInteracting] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [position, setPosition] = useState({ index: 0, atStart: true, atEnd: false, scrollable: true });
  const trackRef = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geometry = useRef({ cycle: 0, step: 1 });
  const sectionRef = useRef<HTMLElement>(null);
  const dialogRef = useDialog(!!selected, () => setSelected(null));
  const items = posterCatalog.filter(item => matchesPoster(item, filters));
  const activeFilters = Object.values(filters).filter(Boolean).length;
  const isMoving = playing && !interacting && !keyboardFocus && visible && pageVisible && !selected && !reducedMotion && position.scrollable;
  const serviceLabel = (service: string) => rows?.service_types.find(r=>r.slug===service)?.[`name_${language}`] || t(service === 'ferry' ? 'Tiket Ferry' : 'Paket Wisata');
  const countryLabel = (country: string) => rows?.countries.find(r=>r.name_id===country)?.[`name_${language}`] || t(country);
  useEffect(() => { setPlaying(carousel.autoplay && !reducedMotion); }, [carousel.autoplay, reducedMotion]);

  useEffect(() => {
    if (!countryRequest) return;
    setFilters({ ...emptyFilters, country: countryRequest.country });
    setPlaying(true);
    setSelected(null);
    const field = document.getElementById('poster-country');
    field?.focus({ preventScroll: true });
    sectionRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }, [countryRequest]);

  useEffect(() => { if(selected && !posterCatalog.some(p=>p.id===selected.id)) setSelected(null); }, [posterCatalog,selected]);

  function pauseBriefly() {
    setInteracting(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setInteracting(false), 4500);
  }

  useEffect(() => () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { setReducedMotion(media.matches); if (media.matches) setPlaying(false); };
    update();
    setPlaying(!media.matches);
    media.addEventListener('change', update);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0 });
    if (sectionRef.current) observer.observe(sectionRef.current);
    const visibility = () => setPageVisible(!document.hidden);
    visibility();
    document.addEventListener('visibilitychange', visibility);
    return () => { media.removeEventListener('change', update); observer.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, []);

  function updatePosition() {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>('.poster-card');
    const step = card ? card.getBoundingClientRect().width + 24 : 1;
    const cycle = step * items.length;
    const scrollable = cycle - 24 > track.clientWidth + 4;
    geometry.current = { cycle: scrollable ? cycle : 0, step };
    const index = ((Math.round((track.scrollLeft - cycle) / step) % items.length) + items.length) % items.length;
    setPosition({ index: scrollable ? index : 0, atStart: false, atEnd: false, scrollable });
  }

  function handleScroll() {
    updatePosition();
    if (settleTimer.current) clearTimeout(settleTimer.current);
    // Recenter identical copies only once the gesture/animation has settled.
    // The same posters remain on screen, so looping has no visible jump.
    settleTimer.current = setTimeout(() => {
      const track = trackRef.current;
      const { cycle } = geometry.current;
      if (!track || !cycle) return;
      if (track.scrollLeft < cycle - 2) track.scrollTo({ left: track.scrollLeft + cycle, behavior: 'instant' });
      else if (track.scrollLeft >= cycle * 2 - 2) track.scrollTo({ left: track.scrollLeft - cycle, behavior: 'instant' });
    }, 180);
  }

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    function resetPosition() {
      if (!track) return;
      updatePosition();
      track.scrollTo({ left: geometry.current.cycle, behavior: 'instant' });
      updatePosition();
    }
    resetPosition();
    const observer = new ResizeObserver(resetPosition);
    observer.observe(track);
    return () => { observer.disconnect(); if (settleTimer.current) clearTimeout(settleTimer.current); };
  }, [filters, position.scrollable, posterCatalog]);

  useEffect(() => {
    if (!isMoving) return;
    let timer: ReturnType<typeof setTimeout>;
    function advance() {
      const track = trackRef.current;
      const card = track?.querySelector<HTMLElement>('.poster-card');
      if (!track || !card) return;
      // Advance toward the next poster, matching the right navigation arrow.
      track.scrollBy({ left: (carousel.direction === 'right' ? -1 : 1) * (card.getBoundingClientRect().width + 24), behavior: 'smooth' });
      timer = setTimeout(advance, Math.max(2000, Number(carousel.interval_ms) || 5500));
    }
    // Show movement soon after the catalogue enters the viewport, then let it rest.
    timer = setTimeout(advance, Math.max(500, Number(carousel.initial_delay_ms) || 1800));
    return () => clearTimeout(timer);
  }, [isMoving, carousel.direction, carousel.interval_ms, carousel.initial_delay_ms]);

  function changeFilter(key: keyof CatalogFilters, value: string) {
    pauseBriefly();
    setFilters(current => ({ ...current, [key]: value }));
  }
  function move(direction: number) {
    pauseBriefly();
    const track = trackRef.current;
    const card = track?.querySelector<HTMLElement>('.poster-card');
    if (track && card) track.scrollBy({ left: direction * (card.getBoundingClientRect().width + 24), behavior: reducedMotion ? 'instant' : 'smooth' });
  }
  function openPoster(item: Poster) { setZoom(1); setSelected(item); }
  function reset() { setFilters(emptyFilters); pauseBriefly(); }
  function whatsapp(item: Poster) {
    const message = language === 'en'
      ? `Hello ${contact.brand}! I'm interested in ${item.title.en} (${item.provider}). Please confirm the current schedule, price and availability. Poster reference: ${item.id}. Thank you.`
      : `Halo ${contact.brand}! Saya tertarik dengan ${item.title.id} (${item.provider}). Mohon konfirmasi jadwal, harga terbaru dan ketersediaannya. Referensi poster: ${item.id}. Terima kasih.`;
    return `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`;
  }

  return (
    <section id="schedule" className="poster-section" ref={sectionRef} aria-labelledby="poster-heading">
      <div className="container">
        <div className="poster-heading-row" data-reveal>
          <div><p className="sub-title">{t('TEMUKAN PERJALANAN ANDA')}</p><h2 id="poster-heading">{t('Tiket & cerita perjalanan baru.')}</h2><p className="poster-intro">{t('Jelajahi tiket ferry dan wisata pilihan. Pilih yang menarik, kami bantu rencana berikutnya.')}</p></div>
          <span className="poster-collection-label">{posterCatalog.length} {t('pilihan untuk dijelajahi')}</span>
        </div>

        <div className="poster-filter-panel" data-reveal data-reveal-delay="80">
          <div className="poster-filters">
            <CustomDropdown id="poster-country" label={t('Negara tujuan')} value={filters.country} onChange={value => changeFilter('country', value)} options={[{ value: '', city: t('Semua negara') }, ...filterOptions(filters, 'country', posterCatalog).map(option => ({ value: option, city: countryLabel(option) }))]} />
            <CustomDropdown id="poster-service" label={t('Jenis layanan')} value={filters.service} onChange={value => changeFilter('service', value)} options={[{ value: '', city: t('Semua layanan') }, ...filterOptions(filters, 'service', posterCatalog).map(option => ({ value: option, city: serviceLabel(option) }))]} />
            <CustomDropdown id="poster-provider" label={t('Provider')} value={filters.provider} onChange={value => changeFilter('provider', value)} options={[{ value: '', city: t('Semua provider') }, ...filterOptions(filters, 'provider', posterCatalog).map(option => ({ value: option, city: option }))]} />
          </div>
          <div className="poster-filter-note"><span>{t('Bebas pilih filter, atau jelajahi semuanya.')}</span>{activeFilters > 0 && <button onClick={reset}>{t('Reset filter')} <span aria-hidden="true">×</span></button>}</div>
        </div>

        <div className="poster-toolbar" data-reveal data-reveal-delay="120">
          <p role="status">{activeFilters ? `${items.length} ${t('pilihan sesuai filter')}` : t('Semua inspirasi perjalanan')}<span>{t('Klik poster untuk melihat detail')}</span></p>
          <div className="poster-controls">
            <button className="poster-play" disabled={reducedMotion || !position.scrollable} onClick={() => setPlaying(value => !value)} aria-pressed={playing} aria-label={t(playing ? 'Jeda pergeseran otomatis' : 'Putar pergeseran otomatis')}><span aria-hidden="true">{playing ? 'Ⅱ' : '▷'}</span><span>{t(playing ? 'Jeda' : 'Putar')}</span></button>
          </div>
        </div>

        {items.length > 0 ? <div data-reveal data-reveal-delay="160" className={`poster-carousel ${position.scrollable ? '' : 'poster-carousel-static'}`}>
          <div ref={trackRef} id="poster-track" className="poster-track" role="region" aria-roledescription={t('Karusel')} aria-label={t('Katalog tiket dan wisata')} onScroll={handleScroll} onPointerDown={pauseBriefly} onWheel={event => { if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey) pauseBriefly(); }} onFocusCapture={event => { if (event.target.matches(':focus-visible')) setKeyboardFocus(true); }} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setKeyboardFocus(false); }}>
          {(position.scrollable ? [-1, 0, 1] : [0]).flatMap(copy => items.map((item, index) => <article className="poster-card" key={`${copy}-${item.id}`} data-copy={copy} aria-hidden={copy !== 0 || undefined} aria-label={`${index + 1} / ${items.length}: ${item.title[language]}`}>
            <button tabIndex={copy === 0 ? 0 : -1} className="poster-preview" onClick={() => openPoster(item)} aria-label={`${t('Perbesar poster')}: ${item.title[language]}`}>
              <img src={item.thumbnail} alt={item.title[language]} loading="lazy" decoding="async" width="720" height="900" />
              <span className="poster-zoom-label"><span aria-hidden="true">⤢</span> {t('Lihat poster')}</span>
            </button>
            <div className="poster-card-body"><div className="poster-tags">{item.kind === 'promo' && <span className="poster-tag-tour">Promo</span>}<span className={item.service === 'package' ? 'poster-tag-tour' : ''}>{serviceLabel(item.service)}</span><span>{item.countries.map(countryLabel).join(' · ')}</span></div><p className="poster-provider">{item.provider}</p><h3><button tabIndex={copy === 0 ? 0 : -1} onClick={() => openPoster(item)}>{item.title[language]}</button></h3><p className="poster-description">{item.description[language]}</p><p className={isExpired(item) ? 'poster-expired' : 'poster-validity'}>{isExpired(item) ? (language === 'en' ? 'Offer has ended' : 'Sudah berakhir') : item.validUntil ? `${language === 'en' ? 'Valid through' : 'Berlaku sampai'} ${new Date(`${item.validUntil}T00:00:00+07:00`).toLocaleDateString(language === 'en' ? 'en-GB' : 'id-ID', {timeZone:'Asia/Jakarta',day:'numeric',month:'short',year:'numeric'})}` : (language === 'en' ? 'Valid until updated' : 'Berlaku sampai diperbarui')}</p><button tabIndex={copy === 0 ? 0 : -1} className="poster-detail-link" onClick={() => openPoster(item)}>{t('Lihat detail')}</button></div>
          </article>))}
          </div>
          <button className="poster-side-arrow poster-side-arrow-left" disabled={!position.scrollable} onClick={() => move(-1)} aria-controls="poster-track" aria-label={t('Poster sebelumnya')}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg></button>
          <button className="poster-side-arrow poster-side-arrow-right" disabled={!position.scrollable} onClick={() => move(1)} aria-controls="poster-track" aria-label={t('Poster berikutnya')}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m10 6 6 6-6 6" /></svg></button>
        </div> : <div className="poster-empty"><h3>{t('Belum ada poster yang sesuai')}</h3><p>{t('Coba pilihan lain untuk menemukan perjalanan Anda.')}</p><button onClick={reset}>{t('Tampilkan semua poster')}</button></div>}

        <div className="poster-bottom"><p>{t('Harga, jadwal, dan periode promo mengikuti poster. Konfirmasi kembali sebelum memesan.')}</p><span aria-live={isMoving ? 'off' : 'polite'}>{items.length > 0 ? `${Math.min(position.index + 1, items.length)} / ${items.length}` : '0 / 0'}</span></div>
      </div>

      {selected && createPortal(<div className="poster-overlay" onClick={() => setSelected(null)}><div className="poster-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="poster-dialog-title" tabIndex={-1} onClick={event => event.stopPropagation()}>
        <header className="poster-dialog-header"><div><p>{selected.provider}</p><h2 id="poster-dialog-title">{selected.title[language]}</h2></div><button onClick={() => setSelected(null)} aria-label={t('Tutup poster')}>×</button></header>
        <div className="poster-dialog-tools"><span>{t('Geser gambar setelah diperbesar')}</span><div><button disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, value - .5))} aria-label={t('Perkecil gambar')}>−</button><button onClick={() => setZoom(1)} aria-label={t('Reset ukuran gambar')}>{Math.round(zoom * 100)}%</button><button disabled={zoom >= 3} onClick={() => setZoom(value => Math.min(3, value + .5))} aria-label={t('Perbesar gambar')}>+</button></div></div>
        <div className="poster-viewer" tabIndex={0} role="region" aria-label={t('Gambar poster')}><img src={selected.image} alt={`${selected.title[language]}. ${selected.description[language]}`} style={{ width: `${zoom * 100}%` }} /></div>
        <footer className="poster-dialog-footer"><div><p>{language === 'en' ? 'Validity' : 'Masa berlaku'}: {selected.validFrom || '?'} ? {selected.validUntil || (language === 'en' ? 'Until updated' : 'Sampai diperbarui')}</p>{selected.period && <p className={isExpired(selected) ? 'poster-expired' : ''}>{selected.period[language]}</p>}<p>{t(isExpired(selected) ? 'Penawaran ini sudah berakhir. Tanyakan informasi terbaru kepada admin.' : 'Konfirmasi harga dan ketersediaan dengan admin.')}</p><small>{t('Tulisan pada poster mengikuti bahasa aslinya.')}</small></div><a href={whatsapp(selected)} target="_blank" rel="noreferrer">{t('Tanyakan via WhatsApp')}</a></footer>
      </div></div>, document.body)}
    </section>
  );
}
