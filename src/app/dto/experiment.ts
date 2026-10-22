export type ExperimentGroup = "A" | "B";
export type SectionName = "personal" | "education" | "experience" | "skills" | "export";
export type FormSection = Exclude<SectionName, "export">;
export type ClientEventType = "section_enter" | "section_complete" | "field_edit";
export type SkillSource = "manual" | "esco_suggestion" | "occupation";

export const FORM_SECTIONS: FormSection[] = ["personal", "education", "experience", "skills"];

export const SURVEY_ITEMS = [
  "El CV final representa bien mi perfil",
  "El proceso fue fácil de completar",
  "Usaría la herramienta para postularme",
  "Confío en que el CV pasa filtros ATS",
] as const;

export interface ExperimentSession {
  id: string;
  group: ExperimentGroup;
  started_at: string;
  consent_given_at: string;
}

export interface SessionState {
  id: string;
  group: ExperimentGroup;
  started_at: string;
  exported_at: string | null;
  ended_at: string | null;
  section_times: Partial<Record<FormSection, number>>;
  survey_done: boolean;
}

export interface StartSessionRequest {
  consent: true;
  group?: ExperimentGroup;
  participant_code?: string;
  user_agent?: string;
  a11y_prefs?: Record<string, unknown>;
}

export interface EventMetadata {
  section?: SectionName;
  field?: string;
  [key: string]: unknown;
}

export interface SkillRecord {
  id: number;
  input_label: string;
  esco_uri: string | null;
  preferred_label: string | null;
  source: SkillSource;
}

export interface SkillCreate {
  input_label: string;
  esco_uri?: string;
  preferred_label?: string;
  source: SkillSource;
}

export interface CvSnapshot {
  name: string;
  email: string;
  phone: string;
  summary: string;
  education: { degree: string; institution: string; period: string }[];
  experience: { position: string; company: string; period: string }[];
  skills: string[];
}

export interface AtsBreakdown {
  S: number;
  P: number;
  H: number;
  E: number;
  C: number;
  F: number;
}

export interface AtsResult {
  ats_score: number;
  ats_breakdown: AtsBreakdown;
}

export interface ExportResult {
  time_to_cv_min: number | null;
  esco_coverage_pct: number | null;
  ats_score: number | null;
  ats_breakdown: AtsBreakdown | null;
  section_times: Partial<Record<FormSection, number>>;
  repeat: boolean;
}

export interface SessionLiveMetrics {
  elapsed_min: number;
  section_times: Partial<Record<FormSection, number>>;
  esco_coverage_pct: number | null;
  skills_count: number;
  edits: number;
}

export interface GroupMetrics {
  n: number;
  time_to_cv_avg: number | null;
  time_to_cv_sd: number | null;
  esco_coverage_avg: number | null;
  ats_score_avg: number | null;
  satisfaction_avg: number | null;
  edits_avg: number | null;
  section_seconds_avg: Record<FormSection, number | null>;
}

export interface ExperimentMetrics {
  sessions_started: number;
  sessions_completed: number;
  events: number;
  by_group: Record<ExperimentGroup, GroupMetrics>;
  targets: {
    time_to_cv_b_max: number;
    esco_coverage_b_min: number;
    ats_min: number;
    satisfaction_min: number;
  };
}

export interface SessionRow {
  id: string;
  group: ExperimentGroup;
  started_at: string;
  exported_at: string | null;
  ended_at: string | null;
  time_to_cv_min: number | null;
  esco_coverage_pct: number | null;
  ats_score: number | null;
  satisfaction: number | null;
  edits: number;
  section_times: Partial<Record<FormSection, number>>;
}

export interface EventRow {
  id: number;
  session_id: string;
  group: ExperimentGroup;
  event_type: string;
  detail: string | null;
  ts: string;
  metadata: Record<string, unknown> | null;
}

export interface EscoItem {
  uri: string;
  title: string;
  alternative_labels: string[];
  search_hit?: string | null;
}

export interface EscoList<T> {
  items: T[];
  degraded: boolean;
}

export interface OccupationSkills {
  occupation: EscoItem;
  essential_skills: EscoItem[];
  optional_skills: EscoItem[];
}

export interface CityOption {
  name: string;
  department: string;
}

export interface InstitutionOption {
  name: string;
  city: string;
}
