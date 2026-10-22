import type { ComboboxOption } from "../ui/combobox";
import type { EscoItem } from "../../dto/experiment";
import { searchCountries } from "../../services/countries";
import { searchCities, searchInstitutions, suggestEscoOccupations, suggestEscoSkills } from "../../services/experiment-api";

/** Avisa al asistente cuando ESCO no responde, para mostrar un aviso sin bloquear. */
export type DegradedHandler = (degraded: boolean) => void;

const escoOption = (item: EscoItem): ComboboxOption => ({
  // En ocupaciones, search_hit es la etiqueta que coincidió con lo escrito (respeta el género elegido).
  value: item.search_hit || item.title,
  label: item.search_hit && item.search_hit !== item.title ? item.search_hit : item.title,
  description: item.search_hit && item.search_hit !== item.title ? `ESCO: ${item.title}` : undefined,
  uri: item.uri,
  badge: "ESCO",
});

export function occupationFetcher(onDegraded: DegradedHandler) {
  return async (query: string, signal: AbortSignal) => {
    const result = await suggestEscoOccupations(query, signal);
    onDegraded(result.degraded);
    return result.items.map(escoOption);
  };
}

export function skillFetcher(onDegraded: DegradedHandler) {
  return async (query: string, signal: AbortSignal) => {
    const result = await suggestEscoSkills(query, signal);
    onDegraded(result.degraded);
    return result.items.map((item) => ({ ...escoOption(item), value: item.title, label: item.title, description: undefined }));
  };
}

export const countryFetcher = async (query: string): Promise<ComboboxOption[]> =>
  searchCountries(query).map((country) => ({ value: country.name, label: country.name, uri: country.code }));

export function cityFetcher(countryCode: string) {
  return async (query: string, signal: AbortSignal): Promise<ComboboxOption[]> => {
    if (countryCode !== "CO") return [];
    const cities = await searchCities(query, countryCode, signal);
    return cities.map((city) => ({ value: city.name, label: city.name, description: city.department }));
  };
}

export const institutionFetcher = async (query: string, signal: AbortSignal): Promise<ComboboxOption[]> =>
  (await searchInstitutions(query, signal)).map((item) => ({ value: item.name, label: item.name, description: item.city }));
