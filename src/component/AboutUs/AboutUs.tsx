import { useContent, useContact, useSetting } from '../../lib/content';
import { useLanguage } from '../../i18n/LanguageContext';
import React from 'react';
import { mediaUrl } from '../../lib/supabase';
import './AboutUs.css';

const AboutUs: React.FC = () => {
  const { t } = useLanguage();
  const contact=useContact();
  const {rows}=useContent();
  const sections=useSetting('sections');
  return (
    <footer id="about" className="footer-section">
      <div className="container">
        <div className="footer-content">
          
          {/* Kolom 1: Brand & Deskripsi */}
          <div className="footer-brand">
            <div className="brand-logo">
              <img src={mediaUrl(rows?.media_assets.find(m=>m.id===contact.logo_id)) || "/logo.svg"} alt="Reservasi.id" />
              <h2>{contact.brand}</h2>
            </div>
            <p>{t("Partner perjalanan laut terpercaya Anda. Kami menyediakan layanan pemesanan tiket ferry termudah untuk rute Indonesia, Singapura, dan Malaysia.")}</p>
          </div>

          {/* Kolom 2: Quick Links (Navigasi Cepat) */}
          <div className="footer-links">
            <h3>Menu</h3>
            <ul>
              {sections.hero !== false && <li><a href="#home">{t("Beranda")}</a></li>}
              {sections.destinations !== false && <li><a href="#destinations">{t("Destinasi")}</a></li>}
              {sections.catalog !== false && <li><a href="#schedule">{t("Jadwal Kapal")}</a></li>}
              <li><a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noreferrer">{t("Bantuan")}</a></li>
            </ul>
          </div>

          {/* Kolom 3: Kontak & Sosmed */}
          <div className="footer-contact">
            <h3>{t("Hubungi Kami")}</h3>
            <ul className="contact-list">
              <li>
                <span className="icon">📍</span>
                <span>{contact.address}</span>
              </li>
              <li>
                <span className="icon">📞</span>
                <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noreferrer">
                  +{contact.whatsapp} (WhatsApp)
                </a>
              </li>
        
            </ul>

            {/* Social Media Icons */}

          </div>

        </div>

        {/* Copyright Bar */}
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} {contact.brand}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default AboutUs;