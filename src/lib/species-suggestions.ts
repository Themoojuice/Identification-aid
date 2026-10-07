import type { ConceptAssessment, ConceptCandidate } from './concept-reconciliation'
import type { ObservationCertainty, SpecimenContext } from './genus-engine'
import type { ScientificRuntimePackage } from './scientific-contract'
import type { WorkMode } from './types'

export const SPECIES_POLICY_VERSION = 'selective-species-conservative@2'

export type SpeciesSuggestionOutcome = 'none' | 'possible' | 'plausible' | 'strong_candidate' | 'diagnostic_if_confirmed'
export type SpeciesHintResponse = 'matches' | 'does_not_match' | 'not_sure' | 'cannot_see'

export interface SpeciesHint {
  id: string
  speciesId: string
  label: string
  description: string
  sex: Array<'male' | 'female'>
  confidence: 'diagnostic_in_source' | 'supportive' | 'uncertain'
  requiresGenitalia: boolean
  requiresMicroscopy: boolean
  sourcePage: number
  provenance: string[]
}

export interface SpeciesProfile {
  id: string
  packetId: string
  name: string
  genusConceptId: string
  genusConceptPacketId: string
  nomenclaturalStatus: string
  sexesDescribed: Array<'male' | 'female'>
  hints: SpeciesHint[]
  limitations: string
  fieldFeasible: string
  macroPhotoFeasible: string
  microscopyLikelyRequired: boolean
  genitalicConfirmationRecommended: boolean
  localities: string[]
  sourcePages: number[]
}

export interface SpeciesDataset {
  version: string
  profiles: SpeciesProfile[]
  selectiveProfileCount: 32
  otherPlacementCount: 195
  comprehensive: false
}

export interface SpeciesObservation {
  id: string
  specimenId: string
  speciesId: string
  hintId: string
  response: SpeciesHintResponse
  certainty: ObservationCertainty
}

export interface SpeciesSuggestionResult {
  species: SpeciesProfile
  outcome: SpeciesSuggestionOutcome
  genusAssessment: ConceptAssessment | null
  applicableHints: SpeciesHint[]
  supportedHintIds: string[]
  contradictedHintIds: string[]
  missingDiagnosticHintIds: string[]
  constraints: string[]
  explanation: string
  comparisonCoverage: {
    profiledSpeciesInGenus: number
    selectiveProfiles: 32
    otherPlacementsUnscored: 195
    comprehensive: false
  }
  provenance: string[]
}

export interface SpeciesSuggestionEvaluation {
  enabled: boolean
  policyVersion: string
  results: SpeciesSuggestionResult[]
  visibleResults: SpeciesSuggestionResult[]
  coverageNotice: string
  genusInputFingerprint: string
  localityUsedForScoring: false
}

export interface SpeciesSuggestionInput {
  enabled: boolean
  context: SpecimenContext
  workMode: WorkMode
  conceptCandidates: Array<Pick<ConceptCandidate, 'concept' | 'assessment'>>
  observations: SpeciesObservation[]
  localityContext?: string[]
}

type RecordValue = Record<string, unknown>
const record = (value: unknown, label: string): RecordValue => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} is not an object`)
  return value as RecordValue
}
const list = (value: unknown, label: string) => {
  if (!Array.isArray(value)) throw new Error(`${label} is not an array`)
  return value
}
const text = (value: unknown, label: string) => {
  if (typeof value !== 'string') throw new Error(`${label} is not text`)
  return value
}
const boolean = (value: unknown, label: string) => {
  if (typeof value !== 'boolean') throw new Error(`${label} is not boolean`)
  return value
}

function packetLookup(scientific: ScientificRuntimePackage) {
  const result = new Map<string, string>()
  for (const [id, aliases] of Object.entries(scientific.identities.aliases)) {
    const packet = aliases.find((alias) => alias.scheme === 'packet_id')
    if (packet) result.set(packet.value, id)
  }
  return result
}

function provenanceId(scientific: ScientificRuntimePackage, pointer: string) {
  const item = scientific.provenance.find((entry) => entry.locator.packetFile === '07_species_hints.json' && entry.locator.jsonPointer === pointer)
  if (!item) throw new Error(`No provenance identity for 07_species_hints.json#${pointer}`)
  return item.subjectId
}

export function createSpeciesDatasetFromScientificPackage(scientific: ScientificRuntimePackage): SpeciesDataset {
  const raw = record(scientific.rawSnapshots['07_species_hints.json'], 'species packet')
  const lookup = packetLookup(scientific)
  const profiles = list(raw.species, 'species profiles').map((value, speciesIndex): SpeciesProfile => {
    const item = record(value, 'species profile')
    const packetId = text(item.species_id, 'species ID')
    const conceptPacketId = text(item.genus_concept_id, 'genus concept ID')
    const conceptId = lookup.get(conceptPacketId)
    if (!conceptId) throw new Error(`No persistent concept identity for ${conceptPacketId}`)
    const identification = record(item.species_level_identification, `${packetId} feasibility`)
    const source = record(item.source, `${packetId} source`)
    const hints = list(item.diagnostic_hints, `${packetId} hints`).map((hintValue, hintIndex): SpeciesHint => {
      const hint = record(hintValue, `${packetId} hint`)
      const pointer = `/species/${speciesIndex}/diagnostic_hints/${hintIndex}`
      return {
        id: provenanceId(scientific, pointer),
        speciesId: provenanceId(scientific, `/species/${speciesIndex}`),
        label: text(hint.character, 'hint character'),
        description: text(hint.description, 'hint description'),
        sex: list(hint.sex, 'hint sex').map((sex) => text(sex, 'hint sex')) as Array<'male' | 'female'>,
        confidence: text(hint.confidence, 'hint confidence') as SpeciesHint['confidence'],
        requiresGenitalia: boolean(hint.requires_genitalia, 'requires genitalia'),
        requiresMicroscopy: boolean(hint.requires_microscopy, 'requires microscopy'),
        sourcePage: Number(hint.source_page),
        provenance: [`07_species_hints.json#${pointer}`, `Schubert thesis p. ${String(hint.source_page)}`],
      }
    })
    return {
      id: provenanceId(scientific, `/species/${speciesIndex}`),
      packetId,
      name: text(item.name, 'species name'),
      genusConceptId: conceptId,
      genusConceptPacketId: conceptPacketId,
      nomenclaturalStatus: text(item.status, 'species status'),
      sexesDescribed: list(item.sexes_described, 'described sexes').map((sex) => text(sex, 'described sex')) as Array<'male' | 'female'>,
      hints,
      limitations: text(identification.limitations, 'identification limitations'),
      fieldFeasible: text(identification.field_feasible, 'field feasibility'),
      macroPhotoFeasible: text(identification.macro_photo_feasible, 'photo feasibility'),
      microscopyLikelyRequired: boolean(identification.microscopy_likely_required, 'microscopy requirement'),
      genitalicConfirmationRecommended: boolean(identification.genitalic_confirmation_recommended, 'genitalic recommendation'),
      localities: list(item.distribution, 'distribution').map((entry) => text(record(entry, 'distribution entry').locality, 'locality')),
      sourcePages: list(source.pages, 'source pages').map(Number),
    }
  })
  if (profiles.length !== 32) throw new Error(`Unexpected selective species profile count: ${profiles.length}`)
  if (profiles.some((profile) => !profile.hints.length)) throw new Error('Every selective species profile must retain at least one source hint')
  return { version: SPECIES_POLICY_VERSION, profiles, selectiveProfileCount: 32, otherPlacementCount: 195, comprehensive: false }
}

const genusEligible = new Set<ConceptAssessment>(['independently_strong', 'independently_compatible', 'historically_compatible'])
const outcomeOrder: Record<SpeciesSuggestionOutcome, number> = { strong_candidate: 0, plausible: 1, diagnostic_if_confirmed: 2, possible: 3, none: 4 }

function genusFingerprint(candidates: SpeciesSuggestionInput['conceptCandidates']) {
  return candidates.map((candidate) => `${candidate.concept.id}:${candidate.assessment}`).sort().join('|')
}

export function evaluateSpeciesSuggestions(dataset: SpeciesDataset, input: SpeciesSuggestionInput): SpeciesSuggestionEvaluation {
  const fingerprint = genusFingerprint(input.conceptCandidates)
  if (!input.enabled) return {
    enabled: false, policyVersion: dataset.version, results: [], visibleResults: [], genusInputFingerprint: fingerprint,
    coverageNotice: 'Species suggestions are switched off. Genus evaluation is unchanged.', localityUsedForScoring: false,
  }
  const conceptAssessment = new Map(input.conceptCandidates.map((candidate) => [candidate.concept.id, candidate.assessment]))
  const observations = new Map(input.observations.filter((item) => item.specimenId === input.context.specimenId).map((item) => [`${item.speciesId}|${item.hintId}`, item]))
  const profileCount = new Map<string, number>()
  for (const profile of dataset.profiles) profileCount.set(profile.genusConceptId, (profileCount.get(profile.genusConceptId) ?? 0) + 1)

  const results = dataset.profiles.map((species): SpeciesSuggestionResult => {
    const assessment = conceptAssessment.get(species.genusConceptId) ?? null
    const constraints: string[] = []
    const coverage = { profiledSpeciesInGenus: profileCount.get(species.genusConceptId) ?? 0, selectiveProfiles: 32 as const, otherPlacementsUnscored: 195 as const, comprehensive: false as const }
    const base = { species, genusAssessment: assessment, comparisonCoverage: coverage, provenance: [`07_species_hints.json#${species.packetId}`, `policy:${dataset.version}`] }
    if (!assessment || !genusEligible.has(assessment)) return { ...base, outcome: 'none' as const, applicableHints: [], supportedHintIds: [], contradictedHintIds: [], missingDiagnosticHintIds: [], constraints: ['No sufficiently supported contemporary genus concept activates this profile.'], explanation: 'This selective profile is inactive because its genus concept is not currently supported.' }
    if (input.context.lifeStage === 'juvenile') return { ...base, outcome: 'none' as const, applicableHints: [], supportedHintIds: [], contradictedHintIds: [], missingDiagnosticHintIds: [], constraints: ['The source profile is adult diagnostic evidence; juvenile identity is not supported.'], explanation: 'No species suggestion is made for a juvenile from these adult diagnoses.' }
    if (input.context.sex === 'female' && !species.sexesDescribed.includes('female')) return { ...base, outcome: 'none' as const, applicableHints: [], supportedHintIds: [], contradictedHintIds: [], missingDiagnosticHintIds: [], constraints: ['Female not described or diagnosed in the selective source profile.'], explanation: 'This male-only profile cannot be suggested for a female specimen.' }

    // Preserve observations, but never infer that adult/sex-specific scope is
    // satisfied merely because the user previously answered a hint.
    const applicableHints = input.context.sex === 'unknown' || input.context.lifeStage !== 'adult' ? []
      : species.hints.filter((hint) => hint.sex.includes(input.context.sex as 'male' | 'female') && hint.confidence !== 'uncertain')
    if (input.context.sex === 'unknown') constraints.push('Resolve sex before using sex-specific diagnostic evidence.')
    if (input.context.lifeStage === 'unknown') constraints.push('Confirm adult life stage before using species diagnostic evidence; saved answers are paused.')
    if (input.workMode === 'field' && applicableHints.some((hint) => hint.requiresMicroscopy)) constraints.push('One or more diagnostic comparisons require microscopy.')
    if (input.context.sex === 'female' && applicableHints.some((hint) => hint.requiresGenitalia) && input.context.preparation.epigyneCleared !== 'yes') constraints.push('Female confirmation requires an appropriately prepared epigyne.')
    if (species.packetId === 'SP0008') constraints.push('Silvery-blue iridescence is angle- and lighting-sensitive; confirm the entire dorsal abdomen under useful light.')
    constraints.push('Only 32 thesis profiles are represented; 195 other placements are unscored, not rejected competitors.')
    constraints.push('Strong species status is withheld: the number of profiles is not a reviewed comparison against all relevant alternatives.')
    for (const hint of species.hints.filter((hint) => hint.confidence === 'uncertain' && (input.context.sex === 'unknown' || hint.sex.includes(input.context.sex)))) constraints.push(`Source limitation (not identifying evidence): ${hint.description}`)

    const usable = (hint: SpeciesHint) => (!hint.requiresMicroscopy || input.workMode === 'microscope')
      && (!(input.context.sex === 'female' && hint.requiresGenitalia) || input.context.preparation.epigyneCleared === 'yes')
    const supported = applicableHints.filter((hint) => usable(hint) && observations.get(`${species.id}|${hint.id}`)?.response === 'matches')
    const contradicted = applicableHints.filter((hint) => usable(hint) && observations.get(`${species.id}|${hint.id}`)?.response === 'does_not_match')
    const diagnosticHints = applicableHints.filter((hint) => hint.confidence === 'diagnostic_in_source')
    const missingDiagnostic = diagnosticHints.filter((hint) => !usable(hint) || !observations.has(`${species.id}|${hint.id}`) || ['not_sure', 'cannot_see'].includes(observations.get(`${species.id}|${hint.id}`)!.response))
    const diagnosticContradiction = contradicted.some((hint) => hint.confidence === 'diagnostic_in_source' && observations.get(`${species.id}|${hint.id}`)?.certainty === 'certain')
    let outcome: SpeciesSuggestionOutcome
    let explanation: string

    if (diagnosticContradiction) {
      outcome = 'none'
      explanation = 'A certain observation conflicts with an applicable source-diagnostic hint.'
    } else if (supported.length > 0) {
      outcome = supported.every((hint) => observations.get(`${species.id}|${hint.id}`)?.certainty === 'tentative') || contradicted.length > 0 ? 'possible' : 'plausible'
      explanation = species.packetId === 'SP0008'
        ? 'The source pattern supports this male candidate, but angle- and lighting-sensitive iridescence prevents a strong result.'
        : 'At least one applicable source hint supports this candidate, but confirmation or comparison coverage remains incomplete.'
      if (outcome === 'possible') explanation = 'Support is tentative or accompanied by disagreement. Recheck the observations before strengthening this suggestion.'
    } else if (diagnosticHints.length > 0 && missingDiagnostic.length > 0 && input.context.sex !== 'unknown') {
      outcome = 'diagnostic_if_confirmed'
      explanation = 'The supported genus makes this profile relevant; confirming the listed diagnostic character could materially strengthen it.'
    } else {
      outcome = 'possible'
      explanation = 'The supported genus and specimen scope keep this profile possible, but no diagnostic species evidence has been confirmed.'
    }
    return {
      ...base, outcome, applicableHints, supportedHintIds: supported.map((hint) => hint.id), contradictedHintIds: contradicted.map((hint) => hint.id),
      missingDiagnosticHintIds: missingDiagnostic.map((hint) => hint.id), constraints, explanation,
    }
  }).sort((a, b) => outcomeOrder[a.outcome] - outcomeOrder[b.outcome] || a.species.name.localeCompare(b.species.name))

  return {
    enabled: true,
    policyVersion: dataset.version,
    results,
    visibleResults: results.filter((result) => result.outcome !== 'none'),
    coverageNotice: 'Selective downstream guidance: 32 thesis profiles are represented; 195 other placements remain unscored. Locality and habitat are context only.',
    genusInputFingerprint: fingerprint,
    localityUsedForScoring: false,
  }
}
