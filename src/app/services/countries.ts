// Códigos ISO 3166-1 alfa-2. Los nombres en español los pone el navegador con Intl.DisplayNames.
const ISO_CODES =
  "AD AE AF AG AI AL AM AO AR AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CW CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PR PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VN VU WS YE ZA ZM ZW".split(" ");

export interface CountryOption {
  code: string;
  name: string;
}

export interface DialCode {
  code: string;
  dial: string;
  label: string;
}

const fold = (value: string) =>
  value.toLocaleLowerCase("es").normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

let cache: CountryOption[] | null = null;

export function allCountries(): CountryOption[] {
  if (cache) return cache;
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames(["es"], { type: "region" });
  } catch {
    names = null;
  }
  const list = ISO_CODES.map((code) => ({ code, name: names?.of(code) ?? code }));
  list.sort((a, b) => a.name.localeCompare(b.name, "es"));
  // Colombia primero: la mayoría de participantes del estudio son colombianos.
  cache = [...list.filter((item) => item.code === "CO"), ...list.filter((item) => item.code !== "CO")];
  return cache;
}

export function searchCountries(text: string): CountryOption[] {
  const query = fold(text);
  if (!query) return allCountries().slice(0, 10);
  const starts = allCountries().filter((item) => fold(item.name).startsWith(query));
  const contains = allCountries().filter((item) => !fold(item.name).startsWith(query) && fold(item.name).includes(query));
  return [...starts, ...contains].slice(0, 10);
}

export function countryName(code: string): string {
  return allCountries().find((item) => item.code === code)?.name ?? code;
}

const DIAL_CODES: [string, string][] = [
  ["CO", "57"], ["AR", "54"], ["BO", "591"], ["BR", "55"], ["CL", "56"], ["CR", "506"], ["CU", "53"],
  ["DO", "1"], ["EC", "593"], ["SV", "503"], ["ES", "34"], ["US", "1"], ["GT", "502"], ["HN", "504"],
  ["MX", "52"], ["NI", "505"], ["PA", "507"], ["PY", "595"], ["PE", "51"], ["PR", "1"], ["UY", "598"],
  ["VE", "58"],
];

export function dialCodes(): DialCode[] {
  return DIAL_CODES.map(([code, dial]) => ({ code, dial, label: `${countryName(code)} (+${dial})` }));
}

export { fold };
