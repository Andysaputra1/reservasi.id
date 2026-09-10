import CustomDropdown from './CustomDropdown';
import { useContent } from '../../lib/content';
import { useLanguage } from '../../i18n/LanguageContext';
export const cityOptions = [
  { value: 'Batam, Indonesia', city: 'Batam', country: 'Indonesia', code: 'ID' },
  { value: 'Tanjung Pinang, Indonesia', city: 'Tanjung Pinang', country: 'Indonesia', code: 'ID' },
  { value: 'Tanjung Balai Karimun, Indonesia', city: 'Tanjung Balai Karimun', country: 'Indonesia', code: 'ID' },
  { value: 'Singapura', city: 'Singapura', country: 'Singapura', code: 'SG' },
  { value: 'Johor Bahru, Malaysia', city: 'Johor Bahru', country: 'Malaysia', code: 'MY' },
];
export default function CountryDropdown(props: { label: string; value: string; onChange: (value: string) => void }) {
  const options = useCityOptions();
  return <CustomDropdown {...props} options={options} />;
}
export function useCityOptions() {
  const {rows}=useContent(); const {language}=useLanguage();
  return rows ? rows.cities.filter(city=>rows.countries.some(c=>c.id===city.country_id)).map(city=>{
    const country=rows.countries.find(c=>c.id===city.country_id);
    return {value:city.id,city:city[`name_${language}`],country:country[`name_${language}`],code:country.code};
  }) : cityOptions;
}
