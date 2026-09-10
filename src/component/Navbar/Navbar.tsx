import { useLanguage } from '../../i18n/LanguageContext';
import React, { useState, useEffect, useMemo } from 'react';
import './Navbar.css';
import useDialog from '../ui/useDialog';
import imgSingapore from '../../assets/Singapore.webp';
import imgBatam from '../../assets/Batam.webp';
import imgMalaysia from '../../assets/Malaysia.webp';
import PortDropdown from '../ui/PortDropdown';
import OperatorDropdown from '../ui/OperatorDropdown';
import { ferrySchedules, type FerrySchedule } from '../../data/FerryData';

// Data Dummy Search (Tetap)
const searchData = [
  { id: 1, name: "Singapura", type: "Destinasi", image: imgSingapore },
  { id: 2, name: "Batam", type: "Destinasi", image: imgBatam },
  { id: 3, name: "Johor Bahru", type: "Destinasi", image: imgMalaysia },
];

const Navbar: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // --- STATE MODAL BOOKING ---
  const [showModal, setShowModal] = useState(false);
  const dialogRef = useDialog(showModal, () => setShowModal(false));
  const [step, setStep] = useState(1); 

  // Step 1 Data
  const [origin, setOrigin] = useState('Batam Centre');
  const [destination, setDestination] = useState('HarbourFront');
  const [selectedFerry, setSelectedFerry] = useState('All');
  
  // Step 2 Data (Detail)
  const [selectedSchedule, setSelectedSchedule] = useState<FerrySchedule | null>(null); // Data jadwal yg dipilih
  const [tripType, setTripType] = useState<'oneWay' | 'twoWay'>('twoWay');
  const [ticketClass, setTicketClass] = useState<'standard' | 'wni' | 'vip'>('standard');
  const [pax, setPax] = useState({ adult: 1, child: 0 });

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const filteredSearch = searchData.filter(item => 
    `${item.name} ${t(item.name)}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- LOGIC PENCARIAN JADWAL ---
  // 1. Cari semua jadwal di rute ini
  const schedulesOnRoute = useMemo(() => {
    return ferrySchedules.filter(item => {
        const matchOrigin = item.fromPort === origin || item.from === origin;
        const matchDest = item.toPort === destination || item.to === destination || (destination === "HarbourFront" && item.toPort.includes("HarbourFront"));
        return matchOrigin && matchDest;
    }).sort((a, b) => a.time.localeCompare(b.time)); // Urutkan berdasarkan jam
  }, [origin, destination]);

  // 2. Ambil daftar operator yang tersedia di rute ini
  const availableFerries = useMemo(() => {
    const ops = schedulesOnRoute.map(s => s.ferry);
    return ['All', ...new Set(ops)];
  }, [schedulesOnRoute]);

  // 3. Filter jadwal berdasarkan operator yang dipilih user
  const displayedSchedules = useMemo(() => {
      return schedulesOnRoute.filter(item => selectedFerry === 'All' || item.ferry === selectedFerry);
  }, [schedulesOnRoute, selectedFerry]);

  // Reset Ferry jika rute berubah
  useEffect(() => {
    if (!availableFerries.includes(selectedFerry)) {
        setSelectedFerry('All');
    }
  }, [origin, destination, availableFerries, selectedFerry]);


  // --- KLIK TOMBOL "PESAN" PADA LIST JADWAL ---
  const handleSelectSchedule = (schedule: FerrySchedule) => {
      setSelectedSchedule(schedule);
      // Reset detail form
      setTicketClass('standard');
      setTripType('twoWay');
      setPax({ adult: 1, child: 0 });
      setStep(2); // Pindah ke Step 2
  };

  // --- HELPER HITUNG HARGA ---
  const calculateTotal = () => {
    if (!selectedSchedule) return 0;
    const prices = selectedSchedule.prices;
    
    let adultPrice = 0;
    let childPrice = 0;

    if (ticketClass === 'vip') {
        adultPrice = prices.vipAdult ? prices.vipAdult[tripType] : 0;
        childPrice = prices.vipChild ? prices.vipChild[tripType] : adultPrice;
    } else if (ticketClass === 'wni') {
        adultPrice = prices.wniAdult ? prices.wniAdult[tripType] : 0;
        childPrice = prices.wniChild ? prices.wniChild[tripType] : adultPrice;
    } else {
        adultPrice = prices.adult[tripType];
        childPrice = prices.child[tripType];
    }
    return (pax.adult * adultPrice) + (pax.child * childPrice);
  };

  // --- KIRIM WA ---
  const handleSendToWA = () => {
    if (!selectedSchedule) return;
    const total = calculateTotal();
    const classNameMap = { standard: 'Reguler / Foreigner', wni: 'WNI (Paspor Indonesia)', vip: 'VIP Class' };
    const tripNameMap = { oneWay: 'Sekali Jalan', twoWay: 'Pulang Pergi (PP)' };

    const message = language === 'en' ? `Hello Reservasi.id! I'd like to book a ferry ticket.
Ferry: ${selectedSchedule.ferry}
Route: ${t(selectedSchedule.fromPort)} to ${t(selectedSchedule.toPort)}
Departure: ${selectedSchedule.time}
Trip: ${tripType === 'twoWay' ? 'Round trip' : 'One way'}
Category: ${ticketClass === 'wni' ? 'Indonesian passport' : ticketClass === 'vip' ? 'VIP' : 'Regular / Foreign passport'}
Adults: ${pax.adult}
Children: ${pax.child}
Estimated total: IDR ${total > 0 ? total.toLocaleString('en-GB') : 'Please confirm'}
Please confirm availability. Thank you.` : `
Halo Admin Reservasi.id! 👋
Saya ingin memesan via Quick Book:

🚢 *Kapal:* ${selectedSchedule.ferry}
📍 *Rute:* ${selectedSchedule.fromPort} ➝ ${selectedSchedule.toPort}
⏰ *Jam:* ${selectedSchedule.time}

📋 *Detail:*
• Tipe: ${tripNameMap[tripType]}
• Kelas: ${classNameMap[ticketClass]}
• Dewasa: ${pax.adult}
• Anak: ${pax.child}

💰 *Estimasi:* IDR ${total > 0 ? total.toLocaleString(language === 'en' ? 'en-GB' : 'id-ID') : 'Hubungi Admin'}

Mohon infonya. Terima kasih!`.trim();

    window.open(`https://wa.me/6285265182020?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    setShowModal(false);
  };

  return (
    <>
      <nav aria-label={t("Navigasi utama")} className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="container navbar-content">
          <div className="brand-wrapper">
            <a href="#home" className="navbar-brand" aria-label={t("Reservasi.id, beranda")}>
              <img src="/logo.svg" alt="Logo" className="brand-logo" />
              <span className="brand-name">Reservasi<span>.id</span></span>
            </a>
            <button aria-label={t(isMobileMenuOpen ? "Tutup menu" : "Buka menu")} aria-expanded={isMobileMenuOpen} aria-controls="nav-menu" className="hamburger-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>

          <div id="nav-menu" className={`navbar-menu-wrapper ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
            <ul className="navbar-links">
              <li><a href="#home" onClick={() => setIsMobileMenuOpen(false)}>{t("Beranda")}</a></li>
              <li><a href="#destinations" onClick={() => setIsMobileMenuOpen(false)}>{t("Destinasi")}</a></li>
              <li><a href="#schedule" onClick={() => setIsMobileMenuOpen(false)}>{t("Jadwal kapal")}</a></li>
              <li><a href="#about" onClick={() => setIsMobileMenuOpen(false)}>{t("Tentang kami")}</a></li>
            </ul>

            <div className="navbar-actions">
               <div className="search-container">
                  <div className="search-wrapper">
                    <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input 
                        aria-label={t("Cari destinasi")} type="search" placeholder={t("Cari destinasi...")} value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(true); }}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    />
                  </div>
                  {showSuggestions && searchTerm && (
                  <div className="search-dropdown">
                    {filteredSearch.length > 0 ? (
                      filteredSearch.map(item => (
                        <a key={item.id} href="#destinations" className="search-item" onClick={() => { setIsMobileMenuOpen(false); setShowSuggestions(false); }}>
                          <img src={item.image} alt={t(item.name)} />
                          <div><span className="item-name">{t(item.name)}</span><span className="item-type">{t(item.type)}</span></div>
                        </a>
                      ))
                    ) : (<div className="search-empty">{t("Tidak ditemukan")}</div>)}
                  </div>
                )}
              </div>
              
              <button className="btn-primary" onClick={() => { setShowModal(true); setStep(1); setIsMobileMenuOpen(false); }}>{t("Pesan tiket")}</button>
            </div>
          </div>
          <div className="language-switch" role="group" aria-label={t('Pilih bahasa')}>
            <button type="button" lang="id" aria-label="Bahasa Indonesia" aria-pressed={language === 'id'} onClick={() => setLanguage('id')}>ID</button>
            <span aria-hidden="true">/</span>
            <button type="button" lang="en" aria-label="English" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button>
          </div>
        </div>
      </nav>

      {/* --- MULTI-STEP MODAL --- */}
      {showModal && (
        <div className="booking-overlay" onClick={() => setShowModal(false)}>
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={t("Pemesanan tiket ferry")} tabIndex={-1} className="booking-card" onClick={(e) => e.stopPropagation()}>
            <button aria-label={t("Tutup pemesanan")} className="btn-close-booking" onClick={() => setShowModal(false)}>✕</button>
            
            {/* === STEP 1: PILIH RUTE & LIHAT JADWAL === */}
            {step === 1 && (
                <>
                    <div className="booking-header">
                        <h3>{t("Cari Jadwal")}</h3>
                        <p>{t("Pilih rute dan kapal Anda")}</p>
                    </div>
                    <div className="booking-body">
                        <div className="form-group">
                            <PortDropdown label={t("Dari Pelabuhan")} value={origin} onChange={setOrigin} />
                        </div>
                        <div className="form-group">
                            <PortDropdown label={t("Ke Pelabuhan")} value={destination} onChange={setDestination} />
                        </div>
                        <div className="form-group">
                           <OperatorDropdown 
                              label={t("Pilih Operator Kapal")}
                              value={selectedFerry}
                              options={availableFerries}
                              onChange={setSelectedFerry}
                           />
                        </div>

                        {/* DAFTAR JADWAL YANG MUNCUL */}
                        <div className="modal-schedule-list-label">{t("Jadwal Tersedia:")}</div>
                        <div className="modal-schedule-list">
                            {displayedSchedules.length > 0 ? (
                                displayedSchedules.map((sch) => (
                                    <div key={`${sch.id}-${sch.ferry}-${sch.fromPort}-${sch.toPort}-${sch.time}`} className="modal-sch-item">
                                        <div className="sch-info-left">
                                            <span className="sch-time">{sch.time}</span>
                                            <span className="sch-name">{sch.ferry}</span>
                                        </div>
                                        <button className="btn-sch-book" onClick={() => handleSelectSchedule(sch)}>{t("Pesan")}</button>
                                    </div>
                                ))
                            ) : (
                                <div className="search-empty">{t("Tidak ada jadwal ditemukan.")}</div>
                            )}
                        </div>

                    </div>
                </>
            )}

            {/* === STEP 2: CALCULATOR HARGA === */}
            {step === 2 && selectedSchedule && (
                <>
                    <div className="booking-header-row">
                        <button className="btn-back-text" onClick={() => setStep(1)}>{t("\u2190 Kembali")}</button>
                        <h3>{t("Konfirmasi")}</h3>
                        <div style={{width: 20}}></div>
                    </div>

                    <div className="booking-summary-compact">
                         <span>{selectedSchedule.ferry}</span>
                         <span>{selectedSchedule.time}</span>
                    </div>

                    <div className="booking-section">
                        <label className="section-label">{t("Tipe Perjalanan")}</label>
                        <div className="toggle-container">
                            <button aria-pressed={tripType === 'oneWay'} className={`toggle-btn ${tripType === 'oneWay' ? 'active' : ''}`} onClick={() => setTripType('oneWay')}>{t("Sekali Jalan")}</button>
                            <button aria-pressed={tripType === 'twoWay'} className={`toggle-btn ${tripType === 'twoWay' ? 'active' : ''}`} onClick={() => setTripType('twoWay')}>{t("Pulang Pergi")}</button>
                        </div>
                    </div>

                    <div className="booking-section">
                        <label className="section-label">{t("Kategori Tiket")}</label>
                        <div className="custom-select-wrapper">
                            <select aria-label={t("Kategori tiket")} className="navbar-ferry-select" value={ticketClass} onChange={(e) => setTicketClass(e.target.value as 'standard' | 'wni' | 'vip')}>
                                <option value="standard">{t("Paspor Asing / Umum")}</option>
                                {selectedSchedule.prices.wniAdult && <option value="wni">{t("Paspor Indonesia (WNI)")}</option>}
                                {selectedSchedule.prices.vipAdult && <option value="vip">{t("Kelas VIP")}</option>}
                            </select>
                        </div>
                    </div>

                    <div className="booking-section">
                        <label className="section-label">{t("Jumlah Penumpang")}</label>
                        <div className="counter-row">
                            <div className="counter-info">
                                <span className="c-title">{t("Dewasa")}</span>
                                <span className="c-price">IDR {(ticketClass==='vip'? selectedSchedule.prices.vipAdult?.[tripType] : ticketClass==='wni'? selectedSchedule.prices.wniAdult?.[tripType] : selectedSchedule.prices.adult[tripType])?.toLocaleString(language === 'en' ? 'en-GB' : 'id-ID')} / {t('orang')}</span>
                            </div>
                            <div className="pax-stepper small">
                                <button aria-label={t("Kurangi penumpang dewasa")} disabled={pax.adult <= 1} className="step-btn" onClick={() => setPax({...pax, adult: Math.max(1, pax.adult - 1)})}>−</button>
                                <span className="pax-number">{pax.adult}</span>
                                <button aria-label={t("Tambah penumpang dewasa")} className="step-btn" onClick={() => setPax({...pax, adult: pax.adult + 1})}>+</button>
                            </div>
                        </div>
                        <div className="counter-row">
                            <div className="counter-info">
                                <span className="c-title">{t("Anak-anak")}</span>
                                <span className="c-price">{t("Usia 2-11 Tahun")}</span>
                            </div>
                            <div className="pax-stepper small">
                                <button aria-label={t("Kurangi penumpang anak")} disabled={pax.child <= 0} className="step-btn" onClick={() => setPax({...pax, child: Math.max(0, pax.child - 1)})}>−</button>
                                <span className="pax-number">{pax.child}</span>
                                <button aria-label={t("Tambah penumpang anak")} className="step-btn" onClick={() => setPax({...pax, child: pax.child + 1})}>+</button>
                            </div>
                        </div>
                    </div>

                    <div className="booking-footer"><p className="booking-note">{t("Harga dan jadwal dikonfirmasi kembali oleh admin sebelum pembayaran.")}</p>
                        <div className="total-section">
                            <span className="total-label">{t('Estimasi')} ({t(tripType === 'twoWay' ? 'Pulang Pergi' : 'Sekali Jalan')})</span>
                            <span aria-live="polite" className="total-amount">IDR {calculateTotal().toLocaleString(language === 'en' ? 'en-GB' : 'id-ID')}</span>
                        </div>
                        <button className="btn-wa-premium" onClick={handleSendToWA}>{t("Lanjut ke WhatsApp \u279d")}</button>
                    </div>
                </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
