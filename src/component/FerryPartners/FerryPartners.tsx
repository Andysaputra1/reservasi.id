import { useLanguage } from '../../i18n/LanguageContext';
import React, { useState, useMemo, useEffect } from 'react';
import FerryCard from './FerryCard';
import './FerryPartners.css';
import { ferrySchedules, type TicketClasses } from '../../data/FerryData';
 
import PortDropdown from '../ui/PortDropdown';

// Keep the filters ready while departure results await the new data source.
const SHOW_SCHEDULE_RESULTS = false;

const FerryPartners: React.FC = () => {
  const { t } = useLanguage();
  // Default State
  const [filterOrigin, setFilterOrigin] = useState("Batam Centre");
  const [filterDest, setFilterDest] = useState("HarbourFront"); 
  const [visibleCount, setVisibleCount] = useState(6);
  const [sortBy, setSortBy] = useState("time"); 
  const [selectedOperator, setSelectedOperator] = useState('All'); 

  const handleSwapPorts = () => {
    setFilterOrigin(filterDest);
    setFilterDest(filterOrigin);
  };

  // --- HELPER 1: Ambil Nilai Waktu Murni ---
  // Mengubah "08:15 SGT" menjadi angka 815 agar mudah diurutkan
  const parseTime = (timeStr: string) => {
    // Ambil 5 karakter pertama (jam:menit), buang titik dua
    const cleanTime = timeStr.substring(0, 5).replace(':', ''); 
    return parseInt(cleanTime); 
  };

  // --- HELPER 2: Ambil Harga Termurah ---
  // Mencari harga paling rendah dari semua kategori (Dewasa/Anak/WNI)
  const getLowestPrice = (prices: TicketClasses) => {
    const allPrices = [
      prices.adult.oneWay,
      prices.child.oneWay,
      prices.wniAdult?.oneWay, // Pakai optional chaining
      prices.vipAdult?.oneWay
    ].filter((p): p is number => p !== undefined && p > 0); // Hapus yang kosong

    return Math.min(...allPrices); // Ambil yang paling kecil
  };

  // 1. Generate Tombol Operator
  const availableOperators = useMemo(() => {
    const schedulesOnRoute = ferrySchedules.filter(item => {
        const matchOrigin = item.fromPort === filterOrigin || item.from === filterOrigin; 
        const matchDest = item.toPort === filterDest || item.to === filterDest || (filterDest === "HarbourFront" && item.toPort.includes("HarbourFront")); 
        return matchOrigin && matchDest;
    });
    const operators = schedulesOnRoute.map(sch => sch.ferry);
    return ['All', ...new Set(operators)];
  }, [filterOrigin, filterDest]); 

  useEffect(() => {
    if (!availableOperators.includes(selectedOperator)) {
      setSelectedOperator('All');
    }
  }, [filterOrigin, filterDest, availableOperators, selectedOperator]);


  // 2. Logic Filtering & Sorting (UPDATED)
  const filteredData = ferrySchedules
    .filter(item => {
        // Filter Rute
        const matchOrigin = item.fromPort === filterOrigin || item.from === filterOrigin; 
        const matchDest = item.toPort === filterDest || item.to === filterDest || (filterDest === "HarbourFront" && item.toPort.includes("HarbourFront")); 
        return matchOrigin && matchDest;
    })
    .filter(item => {
        // Filter Operator
        return selectedOperator === 'All' || item.ferry === selectedOperator;
    })
    .sort((a, b) => {
      if (sortBy === 'price') {
        // Sort berdasarkan harga termurah yang ditemukan
        return getLowestPrice(a.prices) - getLowestPrice(b.prices);
      }
      // Sort berdasarkan waktu (parse dulu stringnya)
      return parseTime(a.time) - parseTime(b.time);
    });

  useEffect(() => { setVisibleCount(6); }, [filterOrigin, filterDest, sortBy, selectedOperator]);

  return (
    <section id="schedule" className="schedule-section">
      <div className="container">
        
        <div className="schedule-header">
          <div>
            <p className="sub-title">{t("RENCANAKAN KEBERANGKATAN")}</p><h2 className="section-title">{t("Jadwal Kapal & Harga")}</h2>
            <p className="section-desc">{t("Cari jadwal berdasarkan pelabuhan asal dan tujuan.")}</p>
          </div>

          <div className="filter-controls">
            <div className="select-group-custom">
                <PortDropdown 
                    label={t("Dari Pelabuhan")}
                    value={filterOrigin}
                    onChange={setFilterOrigin}
                />
            </div>
            
            <button aria-label={t("Tukar asal dan tujuan")} className="swap-btn" onClick={handleSwapPorts}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 3 21 3 21 8"></polyline><line x1="21" y1="3" x2="14" y2="10"></line>
                <polyline points="8 21 3 21 3 16"></polyline><line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            </button>

            <div className="select-group-custom">
                <PortDropdown 
                    label={t("Ke Pelabuhan")}
                    value={filterDest}
                    onChange={setFilterDest}
                />
            </div>
          </div>
        </div>

        <div className="filter-sort-bar">
             <div className="sort-tabs">
                {/* Tambahkan onClick untuk mengubah state sortBy */}
                <button 
                    aria-pressed={sortBy === 'time'} className={`tab-btn ${sortBy === 'time' ? 'active' : ''}`} 
                    onClick={() => setSortBy('time')}
                >{t("\ud83d\udd52 Waktu Paling Pagi")}</button>
                <button aria-pressed={sortBy === 'price'}
                    className={`tab-btn ${sortBy === 'price' ? 'active' : ''}`} 
                    onClick={() => setSortBy('price')}
                >{t("\ud83d\udcb2 Harga Termurah")}</button>
             </div>
             
             <div className="operator-pills">
                {availableOperators.map(op => (
                <button key={op} aria-pressed={selectedOperator === op} className={`op-pill ${selectedOperator === op ? 'active' : ''}`} onClick={() => setSelectedOperator(op)}>
                    {op === 'All' ? t('Semua Kapal') : op}
                </button>
                ))}
             </div>
        </div>

        {SHOW_SCHEDULE_RESULTS && <>
        <p className="results-summary" role="status">{filteredData.length} jadwal ditemukan <span>Harga estimasi, per orang. Jam mengikuti zona waktu keberangkatan.</span></p>
        <div className="schedule-list">
          {filteredData.length > 0 ? (
            filteredData.slice(0, visibleCount).map(item => (
              <FerryCard 
                key={`${item.id}-${item.ferry}-${item.fromPort}-${item.toPort}-${item.time}`}
                name={item.ferry}
                image={item.logo}
                origin={item.from}
                destination={item.to}
                time={item.time}
                prices={item.prices}
                note={item.note}
                fromPort={item.fromPort}
                toPort={item.toPort}
              />
            ))
          ) : (
            <div className="empty-state">
              <h3>Tidak ada jadwal ditemukan 😔</h3>
              <p>
                Tidak ada jadwal langsung dari <strong>{filterOrigin}</strong>{t("ke")}<strong>{filterDest}</strong>.
                <br/>Coba ganti pelabuhan atau cek rute transit.
              </p>
            </div>
          )}
        </div>
        {visibleCount < filteredData.length && <div className="load-more"><button onClick={() => setVisibleCount(count => count + 6)}>Tampilkan {Math.min(6, filteredData.length - visibleCount)} jadwal berikutnya</button><span>{Math.min(visibleCount, filteredData.length)} dari {filteredData.length} jadwal</span></div>}
        </>}

      </div>
    </section>
  );
};

export default FerryPartners;
