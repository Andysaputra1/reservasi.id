import CustomDropdown from './CustomDropdown';
export const cityOptions = [
  { value: 'Batam, Indonesia', city: 'Batam', country: 'Indonesia', code: 'ID' },
  { value: 'Tanjung Pinang, Indonesia', city: 'Tanjung Pinang', country: 'Indonesia', code: 'ID' },
  { value: 'Tanjung Balai Karimun, Indonesia', city: 'Tanjung Balai Karimun', country: 'Indonesia', code: 'ID' },
  { value: 'Singapura', city: 'Singapura', country: 'Singapura', code: 'SG' },
  { value: 'Johor Bahru, Malaysia', city: 'Johor Bahru', country: 'Malaysia', code: 'MY' },
];
export default function CountryDropdown(props: { label: string; value: string; onChange: (value: string) => void }) {
  return <CustomDropdown {...props} options={cityOptions} />;
}
