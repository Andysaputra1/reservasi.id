import useDialog from '../ui/useDialog';
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import './FerryCard.css';
import type { TicketClasses } from '../../data/FerryData'; 

interface FerryProps {
  name: string; 
  image: string; 
  origin: string; 
  destination: string;
  time: string; 
  prices: TicketClasses; 
  note?: string; 
  fromPort: string; 
  toPort: string;
}

type TicketCategory = 'regular' | 'wni' | 'vip';

const FerryCard: React.FC<FerryProps> = ({ name, image, origin, destination, time, prices, note, fromPort, toPort }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const dialogRef = useDialog(showBooking, () => setShowBooking(false));
  
  const [tripType, setTripType] = useState<'oneWay' | 'twoWay'>('twoWay');
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory>('regular');
  const [pax, setPax] = useState({ adult: 1, child: 0 });

  // --- 1. LOGIC DETEKSI KATEGORI (LABEL UTAMA) ---
  const availableCategories = useMemo(() => {
    const hasWni = !!prices.wniAdult;
    let mainLabel = "Paspor Asing (Foreigner)"; 

    if (!hasWni) {
        mainLabel = "Tiket Reguler (All Passport)";
    }
    if (name.includes("Putri")) {
        mainLabel = "Tiket Reguler";
    }

    const cats: { value: TicketCategory; label: string }[] = [
        { value: 'regular', label: mainLabel }
    ];

    if (prices.wniAdult) {
        cats.push({ value: 'wni', label: "Paspor Indonesia (WNI)" });
    }
    if (prices.vipAdult) {
        cats.push({ value: 'vip', label: "Kelas VIP" });
    }
    return cats;
  }, [prices, name]);

  // --- 2. LOGIC AMBIL HARGA (PERBAIKAN LOGIC WNI) ---
  const getPrice = (type: 'adult' | 'child') => {
    const key = tripType; 

    if (selectedCategory === 'vip') {
        if (type === 'adult') return prices.vipAdult?.[key] || 0;
        return prices.vipChild?.[key] || prices.child[key]; 
    }
    
    if (selectedCategory === 'wni') {
        if (type === 'adult') return prices.wniAdult?.[key] || 0;
        
        // PERBAIKAN DI SINI:
        // Jika wniChild ADA, pakai harga wniChild.
        // Jika TIDAK ADA, berarti harga WNI berlaku Flat (Sama dengan Dewasa)
        return prices.wniChild?.[key] || prices.wniAdult?.[key] || 0;
    }

    // Default Regular
    return prices[type][key];
  };

  const currentAdultPrice = getPrice('adult');
  const currentChildPrice = getPrice('child');
  const totalEstimation = (pax.adult * currentAdultPrice) + (pax.child * currentChildPrice);
  const totalPax = pax.adult + pax.child;

  const handleOpenBooking = (category: TicketCategory) => {
    setSelectedCategory(category);
    setTripType('twoWay'); 
    setPax({ adult: 1, child: 0 }); 
    setShowBooking(true);
  };

  const getTimeDisclaimer = (timeStr: string) => {
    if (timeStr.includes('SGT')) return 'Singapore Time';
    if (timeStr.includes('MYT')) return 'Malaysia Time';
    return 'WIB (Indonesia Time)';
  };

  const handleSendToWA = () => {
    if (totalPax === 0) return;

    const tripLabel = tripType === 'twoWay' ? 'Pulang Pergi (Two Way)' : 'Sekali Jalan (One Way)';
    const categoryLabel = availableCategories.find(c => c.value === selectedCategory)?.label || 'Reguler';

    const message = `
Halo Admin Reservasi.id! 👋
Saya ingin memesan tiket ferry:

🚢 *Kapal:* ${name}
📍 *Rute:* ${fromPort} ➝ ${toPort}
⏰ *Jam:* ${time}

📋 *Detail Pesanan:*
• Tipe: ${tripLabel}
• Kategori: ${categoryLabel}
• Dewasa: ${pax.adult} Org
• Anak: ${pax.child} Org

💰 *Total Estimasi:* IDR ${totalEstimation.toLocaleString('id-ID')}

Mohon info ketersediaannya. Terima kasih!
    `.trim();

    window.open(`https://wa.me/6285265182020?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    setShowBooking(false);
  };

  // --- RENDER TABLE HARGA (PERBAIKAN LABEL WNI) ---
  const renderPriceTable = () => {
    const isForeignSame = prices.adult.oneWay === prices.child.oneWay;
    const hasWni = !!prices.wniAdult;

    const getHeaderLabel = () => {
        if (prices.vipAdult) return "Kelas Reguler";
        if (hasWni) return "Paspor Asing (Foreigner)";
        return "Tiket Reguler (All Passport)"; 
    };

    const PriceRow = ({ label, ow, pp, cat = 'regular' }: { label: string; ow: number; pp: number; cat?: TicketCategory }) => {
        let btnClass = '', btnText = 'Pesan';
        if (cat === 'wni') { btnClass = 'wni-promo-btn'; btnText = 'Pesan WNI'; }
        if (cat === 'vip') { btnClass = 'vip'; btnText = 'Pesan VIP'; }

        return (
            <div className={`p-row ${cat === 'wni' ? 'id-promo-row' : ''} ${cat === 'vip' ? 'vip-class-row' : ''}`}>
                <div className="p-col"><strong>{label}</strong></div>
                <div className="p-col" data-label="Sekali jalan">Rp {ow.toLocaleString()}</div>
                <div className="p-col" data-label="Pulang pergi">Rp {pp.toLocaleString()}</div>
                <div className="p-col action">
                    <button className={`btn-book-small ${btnClass}`} onClick={() => handleOpenBooking(cat)}>
                        {btnText}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <>
            {/* 1. REGULAR */}
            <h4 className="table-subtitle">{getHeaderLabel()}</h4>
            {isForeignSame ? 
                <PriceRow label="Tiket All Passport" ow={prices.adult.oneWay} pp={prices.adult.twoWay} /> :
                <>
                    <PriceRow label="Dewasa" ow={prices.adult.oneWay} pp={prices.adult.twoWay} />
                    <PriceRow label="Anak-anak" ow={prices.child.oneWay} pp={prices.child.twoWay} />
                </>
            }

            {/* 2. WNI (LOGIC BARU DI SINI) */}
            {prices.wniAdult && (
                <>
                    <h4 className="table-subtitle promo-subtitle">Paspor Indonesia (WNI)</h4>
                    
                    {/* Cek: Apakah ada harga khusus anak WNI? */}
                    {prices.wniChild ? (
                        /* Jika ADA (Sindo, BatamFast), tampilkan pisah */
                        <>
                            <PriceRow label="Dewasa (WNI)" ow={prices.wniAdult.oneWay} pp={prices.wniAdult.twoWay} cat="wni" />
                            <PriceRow label="Anak (WNI)" ow={prices.wniChild.oneWay} pp={prices.wniChild.twoWay} cat="wni" />
                        </>
                    ) : (
                        /* Jika TIDAK ADA (Majestic, Horizon), tampilkan satu baris saja */
                        <PriceRow label="Tiket WNI (All Ages)" ow={prices.wniAdult.oneWay} pp={prices.wniAdult.twoWay} cat="wni" />
                    )}
                </>
            )}

            {/* 3. VIP */}
            {prices.vipAdult && (
                <>
                    <h4 className="table-subtitle vip-subtitle">Kelas VIP</h4>
                    <PriceRow label="VIP Dewasa" ow={prices.vipAdult.oneWay} pp={prices.vipAdult.twoWay} cat="vip" />
                    {prices.vipChild && (
                        <PriceRow label="VIP Anak" ow={prices.vipChild.oneWay} pp={prices.vipChild.twoWay} cat="vip" />
                    )}
                </>
            )}
        </>
    );
  };

  return (
    <div className={`ticket-card-wrapper ${isOpen ? 'open' : ''}`}>
      
      {/* HEADER KARTU */}
      <div className="ticket-card">
        <div className="ticket-main">
          <div className="carrier-logo"><img loading="lazy" decoding="async" src={image} alt={name} /></div>
          <div className="carrier-info">
            <h4>{name}</h4>
            <span className="route-badge">{fromPort} ➝ {toPort}</span> 
            <span className="route-city-context">{origin} ➝ {destination}</span>
          </div>
        </div>

        <div className="ticket-time">
          <div className="time-display">
            <div className="time-group">
                <span className="departure-time">{time}</span>
                <span className="zone-info">{getTimeDisclaimer(time)}</span>
            </div>
            <span className="time-label">Keberangkatan</span>
          </div>
        </div>

        <div className="ticket-action">
          <div className="price-display">
            <span className="label-start">Mulai dari</span>
            <span className="currency">IDR</span>
            <span className="amount">
                {(prices.wniAdult?.oneWay || prices.child.oneWay || prices.adult.oneWay).toLocaleString('id-ID')}
            </span>
          </div>
          <button aria-expanded={isOpen} className="btn-select" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? 'Tutup detail' : 'Lihat tiket'} <span className={`arrow ${isOpen ? 'up' : 'down'}`}>▼</span>
          </button>
        </div>
      </div>

      {/* DROPDOWN */}
      {isOpen && (
        <div className="ticket-details">
          <div className="price-table-container">
            <div className="p-row p-header table-header-desktop">
                <div className="p-col">Kategori</div><div className="p-col">One Way</div><div className="p-col">Two Way (PP)</div><div className="p-col action">Aksi</div>
            </div>
            {renderPriceTable()}
          </div>
          <div className="detail-footer"><p>{note || "*Harga dapat berubah sewaktu-waktu."}</p></div>
        </div>
      )}

      {/* POPUP MODAL */}
      {showBooking && createPortal(
        <div className="booking-overlay" onClick={() => setShowBooking(false)}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Atur pesanan ferry" tabIndex={-1} className="booking-card" onClick={(e) => e.stopPropagation()}>
                
                <div className="booking-header-row">
                    <h3>Atur Pesanan</h3>
                    <button aria-label="Tutup pemesanan" className="btn-close-booking" onClick={() => setShowBooking(false)}>✕</button>
                </div>

                <div className="booking-section">
                    <label className="section-label">Tipe Perjalanan</label>
                    <div className="toggle-container">
                        <button aria-pressed={tripType === 'oneWay'} className={`toggle-btn ${tripType === 'oneWay' ? 'active' : ''}`} onClick={() => setTripType('oneWay')}>Sekali Jalan</button>
                        <button aria-pressed={tripType === 'twoWay'} className={`toggle-btn ${tripType === 'twoWay' ? 'active' : ''}`} onClick={() => setTripType('twoWay')}>Pulang Pergi (PP)</button>
                    </div>
                </div>

                {availableCategories.length > 1 && (
                    <div className="booking-section">
                        <label className="section-label">Kategori Tiket</label>
                        <select 
                            aria-label="Kategori tiket" className="class-select" 
                            value={selectedCategory} 
                            onChange={(e) => setSelectedCategory(e.target.value as TicketCategory)}
                        >
                            {availableCategories.map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="booking-section">
                    <label className="section-label">Jumlah Penumpang</label>
                    
                    {/* DEWASA */}
                    <div className="counter-row">
                        <div className="counter-info">
                            <span className="c-title">Dewasa</span>
                            <span className="c-price">IDR {currentAdultPrice.toLocaleString()} /pax</span>
                        </div>
                        <div className="pax-stepper small">
                            <button aria-label="Kurangi penumpang dewasa" disabled={pax.adult <= 0} className="step-btn" onClick={() => setPax({...pax, adult: Math.max(0, pax.adult - 1)})}>−</button>
                            <span className="pax-number">{pax.adult}</span>
                            <button aria-label="Tambah penumpang dewasa" className="step-btn" onClick={() => setPax({...pax, adult: pax.adult + 1})}>+</button>
                        </div>
                    </div>

                    {/* ANAK */}
                    <div className="counter-row">
                        <div className="counter-info">
                            <span className="c-title">Anak-anak</span>
                            <span className="c-price">
                                {/* Tampilkan harga atau keterangan jika sama */}
                                {selectedCategory === 'wni' && !prices.wniChild 
                                    ? "(Sama dgn Dewasa)"
                                    : `IDR ${currentChildPrice.toLocaleString()} /pax`
                                }
                            </span>
                        </div>
                        <div className="pax-stepper small">
                            <button aria-label="Kurangi penumpang anak" disabled={pax.child <= 0} className="step-btn" onClick={() => setPax({...pax, child: Math.max(0, pax.child - 1)})}>−</button>
                            <span className="pax-number">{pax.child}</span>
                            <button aria-label="Tambah penumpang anak" className="step-btn" onClick={() => setPax({...pax, child: pax.child + 1})}>+</button>
                        </div>
                    </div>
                </div>

                <div className="booking-footer"><p className="booking-note">Harga dan jadwal dikonfirmasi kembali oleh admin sebelum pembayaran.</p>
                    <div className="total-section">
                        <span className="total-label">Estimasi ({totalPax} orang)</span>
                        <span aria-live="polite" className="total-amount">IDR {totalEstimation.toLocaleString('id-ID')}</span>
                    </div>
                    <button 
                        className={`btn-wa-premium ${totalPax === 0 ? 'disabled' : ''}`} 
                        onClick={handleSendToWA}
                        disabled={totalPax === 0}
                    >
                        {totalPax === 0 ? 'Pilih Penumpang' : 'Lanjut ke WhatsApp ➝'}
                    </button>
                </div>

            </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default FerryCard;