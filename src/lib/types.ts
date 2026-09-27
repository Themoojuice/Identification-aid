export type Confidence = 'certain' | 'fairly_sure' | 'unsure'
export type SpecimenSex = 'male' | 'female' | 'unknown' | null
export type WorkMode = 'field' | 'microscope'

export interface MediaItem {
  caption?: string
  comments?: string
  path: string
  thumb_path?: string
  type: number
  curated?: boolean
  source_taxon_id?: number
}

export interface Taxon {
  id: number
  uid: string
  name: string
  parent: number
  source_index: number
  images?: MediaItem[]
  text?: MediaItem[]
}

export interface Feature {
  id: number
  uid: string
  name: string
  parent: number
  kind: 'group' | 'multistate' | 'numeric'
  source_index: number
  states?: number[]
  weight?: number
  images?: MediaItem[]
  text?: MediaItem[]
}

export interface CharacterState {
  id: number
  uid: string
  name: string
  feature: number
  source_index: number
  images?: MediaItem[]
  text?: MediaItem[]
}

export interface Dependency {
  controlling_state_id: number
  dependent_feature_id: number
  dependency_type: 'positive' | 'negative'
}

export interface KeyData {
  format: string
  generated_from: string
  source_sha256: string
  metadata: { title: string; counts: Record<string, number> }
  taxa: Taxon[]
  features: Feature[]
  states: CharacterState[]
  dependencies: Dependency[]
  score_vectors: Record<string, string>
  curated_state_media?: {
    version: string
    status: string
    notes: string
    records: Record<string, MediaItem[]>
  }
}

export interface FactSection { id: string; heading: string; text: string; html: string }
export interface FactSheet {
  entity_id: number
  entity_uid: string
  entity_name: string
  title: string
  source_path: string
  local_path: string
  copyright_notice?: string
  sections: FactSection[]
}
export interface FactSheetData { format: string; generated_at: string; sheets: FactSheet[] }

export interface GroupMetadata {
  label: string
  difficulty: number
  reliability: number
  methods: string[]
}
export interface FeatureMetadata {
  difficulty?: number
  required_views?: string[]
}
export interface CuratedMetadata {
  version: string
  status: string
  group_defaults: Record<string, GroupMetadata>
  feature_overrides: Record<string, FeatureMetadata>
}

export interface Observation {
  featureId: number
  stateIds: number[]
  confidence: Confidence
}

export type EvidenceOutcome = 'support' | 'conflict' | 'uncertain'
export interface Evidence {
  featureId: number
  featureName: string
  stateNames: string[]
  sourceCodes: number[]
  outcome: EvidenceOutcome
  contribution: number
  assessed: boolean
}

export interface CandidateResult {
  taxon: Taxon
  compatibility: number
  rawScore: number
  supports: Evidence[]
  conflicts: Evidence[]
  uncertain: Evidence[]
  label: 'Not assessed' | 'Strong match' | 'Good match' | 'Possible' | 'Weak match'
}

export interface CharacterSuggestion {
  feature: Feature
  utility: number
  separation: number
  coverage: number
  difficulty: number
  method: string
}

export interface DifferentialRow {
  feature: Feature
  values: Record<number, string>
  utility: number
}
