import { useEffect, useId, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import './CountryDropdown.css';

export type SelectOption = { value: string; city: string; country?: string; code?: string };

export default function CustomDropdown({ label, value, onChange, options: locations, id: providedId }: {
  label: string; value: string; onChange: (value: string) => void; options: SelectOption[]; id?: string;
}) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const options = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = locations.find(location => location.value === value) || { value, city: value || t(label) };
  useEffect(() => {
    if (!open) return;
    options.current[Math.max(0, locations.findIndex(option => option.value === value))]?.focus();
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);
  function close() { setOpen(false); trigger.current?.focus(); }
  return <div className="location-picker" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); close(); }
  }}>
    <label htmlFor={id} className="dropdown-label">{t(label)}</label>
    <button ref={trigger} id={id} type="button" className="location-trigger" aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-list`} onClick={() => setOpen(!open)} onKeyDown={event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); }
    }}>
      {selected.code && <span className="location-code" aria-hidden="true">{selected.code}</span>}
      <span className="location-text"><strong>{t(selected.city)}</strong>{selected.country && <small>{t(selected.country)}</small>}</span>
      <svg className={open ? 'location-chevron is-open' : 'location-chevron'} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    {open && <div id={`${id}-list`} role="listbox" aria-label={t(label)} className="location-menu">
      {locations.map((location, index) => <button key={location.value} ref={element => { options.current[index] = element; }} type="button" role="option" aria-selected={value === location.value} className="location-option" tabIndex={value === location.value ? 0 : -1} onKeyDown={event => {
        let next = index;
        if (event.key === 'ArrowDown') next = (index + 1) % locations.length;
        else if (event.key === 'ArrowUp') next = (index + locations.length - 1) % locations.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = locations.length - 1;
        else return;
        event.preventDefault(); options.current[next]?.focus();
      }} onClick={() => { onChange(location.value); close(); }}>
        {location.code && <span className="location-code" aria-hidden="true">{location.code}</span>}
        <span className="location-text"><strong>{t(location.city)}</strong>{location.country && <small>{t(location.country)}</small>}</span>
        {value === location.value && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m5 12 4 4 10-10" /></svg>}
      </button>)}
    </div>}
  </div>;
}
