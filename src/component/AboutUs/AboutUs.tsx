import { useLanguage } from '../../i18n/LanguageContext';
import React from 'react';
import './AboutUs.css';

const AboutUs: React.FC = () => {
  const { t } = useLanguage();
  return (
    <footer id="about" className="footer-section">
      <div className="container">
        <div className="footer-content">
          
          {/* Kolom 1: Brand & Deskripsi */}
          <div className="footer-brand">
            <div className="brand-logo">
              <img src="/logo.svg" alt="Reservasi.id" />
              <h2>Reservasi.id</h2>
            </div>
            <p>{t("Partner perjalanan laut terpercaya Anda. Kami menyediakan layanan pemesanan tiket ferry termudah untuk rute Indonesia, Singapura, dan Malaysia.")}</p>
          </div>

          {/* Kolom 2: Quick Links (Navigasi Cepat) */}
          <div className="footer-links">
            <h3>Menu</h3>
            <ul>
              <li><a href="#home">{t("Beranda")}</a></li>
              <li><a href="#destinations">{t("Destinasi")}</a></li>
              <li><a href="#schedule">{t("Jadwal Kapal")}</a></li>
              <li><a href="https://wa.me/6285265182020" target="_blank" rel="noreferrer">{t("Bantuan")}</a></li>
            </ul>
          </div>

          {/* Kolom 3: Kontak & Sosmed */}
          <div className="footer-contact">
            <h3>{t("Hubungi Kami")}</h3>
            <ul className="contact-list">
              <li>
                <span className="icon">📍</span>
                <span>Harbour Bay Terminal, Batam, Indonesia</span>
              </li>
              <li>
                <span className="icon">📞</span>
                <a href="https://wa.me/6285265182020" target="_blank" rel="noreferrer">
                  +62 852 6518 2020 (WhatsApp)
                </a>
              </li>
              <li>
                <span className="icon">✉️</span>
                <a href="mailto:cs@reservasi.id">cs@reservasi.id</a>
              </li>
            </ul>

            {/* Social Media Icons */}

          </div>

        </div>

        {/* Copyright Bar */}
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Reservasi.id. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default AboutUs;