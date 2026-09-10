import { useLanguage } from '../../i18n/LanguageContext';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import './Hero.css';
import img1 from '../../assets/herophotos/image1.webp';
import img2 from '../../assets/herophotos/image2.webp';
import img3 from '../../assets/herophotos/image3.webp';
import CountryDropdown from '../ui/CountryDropdown';
const images = [img1, img2, img3];
export default function Hero() {
  const { t, language } = useLanguage();
  const [slide, setSlide] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [origin, setOrigin] = useState('Batam, Indonesia');
  const [destination, setDestination] = useState('Singapura');
  const [error, setError] = useState('');
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPlaying(!preference.matches);
    const update = () => setPlaying(!preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setSlide(current => (current + 1) % images.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [playing]);
  function enquire(event: FormEvent) {
    event.preventDefault();
    if (origin === destination) { setError('Lokasi asal dan tujuan harus berbeda.'); return; }
    setError('');
    const message = language === 'en'
      ? `Hello Reservasi.id! I'd like to check ferry schedules and fares from ${t(origin)} to ${t(destination)}. Please let me know about availability. Thank you.`
      : `Halo Admin Reservasi.id! Saya ingin cek jadwal dan harga tiket ferry dari ${origin} ke ${destination}. Mohon info ketersediaannya. Terima kasih.`;
    window.open(`https://wa.me/6285265182020?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }
  return (
    <section id="home" className="hero-section" aria-label={t("Rencanakan perjalanan ferry")}>
      <div className="hero-photos" aria-hidden="true">{images.map((src, index) => <img key={src} src={src} alt="" className={`hero-bg ${index === slide ? 'active' : ''}`} fetchPriority={index === 0 ? 'high' : 'auto'} />)}</div>
      <div className="hero-overlay" />
      <div className="container hero-content">
        <div className="hero-text">
          <span className="hero-eyebrow">{t("INDONESIA \u00b7 SINGAPURA \u00b7 MALAYSIA")}</span>
          <h1>{t("Perjalanan seru")}<br />{t("dimulai dari")}<br /><em>{t("seberang laut.")}</em></h1>
          <p>{t("Temukan tiket ferry untuk perjalanan berikutnya. Pilih rute Anda, kami bantu urusan jadwal dan pemesanannya.")}</p>
          <a className="hero-explore" href="#destinations">{t("Temukan destinasi")}<span aria-hidden="true">↗</span></a>
          <div className="hero-stats"><div className="stat-item"><span>{t("3 negara")}</span>{t("Satu perjalanan baru")}</div><div className="stat-item"><span>{t("Via WhatsApp")}</span>{t("Dibantu langsung oleh admin")}</div></div>
        </div>
        <form className="reservation-card" onSubmit={enquire}>
          <div className="booking-kicker"><span aria-hidden="true">↗</span>{t("MULAI PERJALANAN ANDA")}</div>
          <div className="card-header"><h2>{t("Mau berlayar ke mana?")}</h2><p>{t("Pilih rute, lalu tanyakan jadwal & harga.")}</p></div>
          <div className="hero-route-fields">
            <CountryDropdown label="Dari" value={origin} onChange={value => { setOrigin(value); setError(''); }} />
            <button type="button" className="hero-swap" aria-label={t("Tukar lokasi asal dan tujuan")} onClick={() => { setOrigin(destination); setDestination(origin); setError(''); }}>⇅</button>
            <CountryDropdown label="Ke" value={destination} onChange={value => { setDestination(value); setError(''); }} />
          </div>
          {error && <p className="form-error" role="alert">{t(error)}</p>}
          <button type="submit" className="btn-search">{t("Tanyakan tiket via WhatsApp")}<span aria-hidden="true">↗</span></button>
          <p className="helper-text">{t("Anda akan diarahkan ke WhatsApp admin.")}<br />{t("Belum ada pembayaran pada tahap ini.")}</p>
          <a className="hero-schedule-link" href="#schedule">{t("Ingin membandingkan? Lihat jadwal kapal \u2192")}</a>
        </form>
      </div>
      <div className="container hero-bottom"><span>{t("DESTINASI DEKAT, CERITA BARU.")}</span><div className="slide-controls" aria-label={t("Kontrol foto latar")}>
        {images.map((_, index) => <button key={index} type="button" aria-label={`${t('Tampilkan foto')} ${index + 1}`} aria-pressed={slide === index} onClick={() => { setSlide(index); setPlaying(false); }} className={slide === index ? 'active' : ''} />)}
        <button type="button" className="slide-pause" aria-label={t(playing ? 'Jeda pergantian foto' : 'Putar pergantian foto')} onClick={() => setPlaying(!playing)}>{playing ? 'Ⅱ' : '▷'}</button>
      </div></div>
    </section>
  );
}
