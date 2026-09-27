import type { EvidenceBand, GenusEvaluation } from './genus-engine'

/**
 * Stage 3 concept reconciliation.
 *
 * Historical Lucid candidates remain first-class results. Crosswalk routes
 * create scoped concept hypotheses; they never rewrite or duplicate matrix
 * cells. Names are presentation only and are never used as joins.
 */

export type CrosswalkRelationship = 'equivalent_to' | 'partially_overlaps' | 'split_into' | 'unresolved'
export type TargetRelationship =
  | 'equivalent_to'
  | 'partially_overlaps'
  | 'contains_some'
  | 'new_combination'
  | 'probably_corresponds_to'
  | 'not_equivalent'

export interface ContemporaryConcept {
  id: string
  packetId: string
  label: string
  qualifier: string | null
  rank: string
  biologicalStatus: string
  nomenclaturalStatus: string
}

export interface CrosswalkTarget {
  conceptId: string
  relationship: TargetRelationship
  isPositiveRoute: boolean
}

export interface CrosswalkComponent {
  id: string
  conceptId: string | null
  relationship: string
  confidence: string
  sourceComponent: unknown
}

export interface CrosswalkMapping {
  id: string
  packetId: string
  sourceEntityId: string
  relationship: CrosswalkRelationship
  confidence: string
  basis: string
  targets: CrosswalkTarget[]
  components: CrosswalkComponent[]
  unresolvedResidue: boolean
  rationale: string
  notes: string
  provenance: string[]
}

export interface ReconciliationDataset {
  packageVersion: string
  version: string
  concepts: ContemporaryConcept[]
  mappings: CrosswalkMapping[]
}

export type HistoricalReconciliationStatus = 'mapped' | 'reviewed_unresolved' | 'unreviewed'

export interface HistoricalReconciliation {
  sourceEntityId: string
  sourcePacketId: string
  sourceLabel: string
  evidenceBand: EvidenceBand
  status: HistoricalReconciliationStatus
  mappingId: string | null
  possibleConceptIds: string[]
  nonEquivalentConceptIds: string[]
  unresolvedResidue: boolean
  explanation: string
  provenance: string[]
}

export type IndependentConceptOutcome = 'support' | 'tentative_support' | 'strong_contradiction' | 'tentative_contradiction' | 'unscored'

export interface IndependentConceptEvidence {
  id: string
  conceptId: string
  outcome: IndependentConceptOutcome
  evidenceGroupId: string
  explanation: string
  provenance: string[]
}

export interface HistoricalConceptRoute {
  mappingId: string
  sourceEntityId: string
  sourcePacketId: string
  sourceEvidenceBand: EvidenceBand
  mappingRelationship: CrosswalkRelationship
  targetRelationship: TargetRelationship
  transferScope: 'scoped_equivalence' | 'possible_destination'
  provenance: string[]
}

export type ConceptAssessment =
  | 'independently_strong'
  | 'independently_compatible'
  | 'historically_compatible'
  | 'possible_destination'
  | 'unassessed'
  | 'contradicted'

export interface ConceptCandidate {
  concept: ContemporaryConcept
  assessment: ConceptAssessment
  historicalRoutes: HistoricalConceptRoute[]
  independentEvidence: IndependentConceptEvidence[]
  independentSupportGroups: number
  independentContradictionGroups: number
  mappingUncertainty: string[]
  explanation: string
}

export interface ReconciledGenusEvaluation {
  historical: HistoricalReconciliation[]
  concepts: ConceptCandidate[]
  unresolved: {
    reviewedSourceEntityIds: string[]
    unreviewedSourceEntityIds: string[]
    hasOutsideCoverage: boolean
  }
  trace: {
    scientificPackageVersion: string
    reconciliationVersion: string
    sourceEnginePolicyVersion: string
  }
}

type UnknownRecord = Record<string, unknown>

function record(value: unknown, label: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} is not an object`)
  return value as UnknownRecord
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} is not an array`)
  return value
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`${label} is not a string`)
  return value
}

function nullableText(value: unknown, label: string): string | null {
  if (value === null) return null
  return text(value, label)
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${label} is not a boolean`)
  return value
}

function packetAlias(aliases: unknown, label: string): string {
  const match = array(aliases, `${label} aliases`).map((value) => record(value, `${label} alias`))
    .find((alias) => alias.scheme === 'packet_id')
  if (!match) throw new Error(`${label} has no packet identity alias`)
  return text(match.value, `${label} packet alias`)
}

const CROSSWALK_RELATIONSHIPS = new Set<CrosswalkRelationship>(['equivalent_to', 'partially_overlaps', 'split_into', 'unresolved'])
const TARGET_RELATIONSHIPS = new Set<TargetRelationship>(['equivalent_to', 'partially_overlaps', 'contains_some', 'new_combination', 'probably_corresponds_to', 'not_equivalent'])

/** Parse typed concepts and crosswalks from the normalized scientific contract. */
export function createReconciliationDatasetFromScientificPackage(input: unknown): ReconciliationDataset {
  const scientific = record(input, 'scientific package')
  const model = record(scientific.model, 'scientific package model')
  const interpretations = record(model.interpretations, 'scientific interpretations')
  const policy = record(interpretations.conceptReconciliation, 'concept reconciliation policy')
  const positiveTargetRelationships = new Set(array(policy.positiveTargetRelationships, 'positive target relationships').map((value) => text(value, 'positive target relationship')))
  const nonPositiveTargetRelationships = new Set(array(policy.nonPositiveTargetRelationships, 'non-positive target relationships').map((value) => text(value, 'non-positive target relationship')))
  if (!nonPositiveTargetRelationships.has('not_equivalent')) throw new Error('Non-equivalence must remain a non-positive route')
  for (const relationship of positiveTargetRelationships) if (nonPositiveTargetRelationships.has(relationship)) throw new Error(`Target relationship ${relationship} cannot be both positive and non-positive`)
  if (boolean(policy.splitCopiesSourceEvidence, 'split evidence-copy policy') !== false) throw new Error('Split mappings must not copy source evidence')
  if (boolean(policy.partialOverlapTransfersUniversalAbsence, 'partial-overlap absence policy') !== false) throw new Error('Partial overlaps must not transfer universal absence')
  if (text(policy.unmappedSourcePolicy, 'unmapped source policy') !== 'retain_historical_unreviewed') throw new Error('Unsupported unmapped source policy')
  const usages = new Map(array(model.nameUsages, 'name usages').map((value) => {
    const usage = record(value, 'name usage')
    return [text(usage.id, 'name usage ID'), usage] as const
  }))

  const concepts: ContemporaryConcept[] = array(model.taxonConcepts, 'taxon concepts').map((value) => {
    const concept = record(value, 'taxon concept')
    const id = text(concept.id, 'concept ID')
    const preferredUsageId = text(concept.preferredNameUsageId, 'preferred name usage ID')
    const usage = usages.get(preferredUsageId)
    if (!usage) throw new Error(`Concept ${id} has no preferred name usage ${preferredUsageId}`)
    return {
      id,
      packetId: packetAlias(concept.aliases, `concept ${id}`),
      label: text(usage.exactSpelling, 'preferred name spelling'),
      qualifier: nullableText(usage.qualifier, 'preferred name qualifier'),
      rank: text(concept.rank, 'concept rank'),
      biologicalStatus: text(concept.biologicalStatus, 'concept biological status'),
      nomenclaturalStatus: text(concept.nomenclaturalStatus, 'concept nomenclatural status'),
    }
  })
  const conceptIds = new Set(concepts.map((concept) => concept.id))

  const mappings: CrosswalkMapping[] = array(model.conceptRelations, 'concept relations').map((value) => {
    const mapping = record(value, 'concept relation')
    const id = text(mapping.id, 'mapping ID')
    const relationship = text(mapping.relationship, 'mapping relationship') as CrosswalkRelationship
    if (!CROSSWALK_RELATIONSHIPS.has(relationship)) throw new Error(`Unsupported mapping relationship ${relationship}`)
    const targets: CrosswalkTarget[] = array(mapping.targetRelations, 'mapping target relations').map((targetValue) => {
      const target = record(targetValue, 'mapping target')
      const conceptId = text(target.targetConceptId, 'mapping target concept ID')
      if (!conceptIds.has(conceptId)) throw new Error(`Mapping ${id} references unknown concept ${conceptId}`)
      const targetRelationship = text(target.relationship, 'target relationship') as TargetRelationship
      if (!TARGET_RELATIONSHIPS.has(targetRelationship)) throw new Error(`Unsupported target relationship ${targetRelationship}`)
      if (!positiveTargetRelationships.has(targetRelationship) && !nonPositiveTargetRelationships.has(targetRelationship)) throw new Error(`Target relationship ${targetRelationship} has no reconciliation policy`)
      return { conceptId, relationship: targetRelationship, isPositiveRoute: positiveTargetRelationships.has(targetRelationship) }
    })
    const components: CrosswalkComponent[] = array(mapping.componentRelations, 'mapping components').map((componentValue) => {
      const component = record(componentValue, 'mapping component')
      const conceptId = component.targetConceptId === null ? null : text(component.targetConceptId, 'component target concept ID')
      if (conceptId && !conceptIds.has(conceptId)) throw new Error(`Mapping component references unknown concept ${conceptId}`)
      return {
        id: text(component.id, 'mapping component ID'),
        conceptId,
        relationship: text(component.relationship, 'component relationship'),
        confidence: text(component.confidence, 'component confidence'),
        sourceComponent: component.sourceComponent,
      }
    })
    const packetId = packetAlias((record(record(scientific.identities, 'identities').aliases, 'identity aliases'))[id], `mapping ${id}`)
    const locator = record(mapping.locator, 'mapping locator')
    const unresolvedResidue = relationship === 'unresolved'
      || relationship === 'split_into'
      || components.some((component) => component.conceptId === null || component.relationship === 'unresolved' || component.relationship === 'incertae_sedis')
    return {
      id,
      packetId,
      sourceEntityId: text(mapping.sourceEntityId, 'mapping source entity ID'),
      relationship,
      confidence: text(mapping.mappingUncertainty, 'mapping confidence'),
      basis: text(mapping.basis, 'mapping basis'),
      targets,
      components,
      unresolvedResidue,
      rationale: text(mapping.rationale, 'mapping rationale'),
      notes: text(mapping.notes, 'mapping notes'),
      provenance: [`${text(locator.packetFile, 'mapping packet file')}#${text(locator.jsonPointer, 'mapping JSON pointer')}`, `sha256:${text(locator.packetSha256, 'mapping packet checksum')}`],
    }
  })

  const duplicateSources = mappings.map((mapping) => mapping.sourceEntityId).filter((id, index, values) => values.indexOf(id) !== index)
  if (duplicateSources.length) throw new Error(`Multiple crosswalk records for source entity ${duplicateSources[0]}`)
  return {
    packageVersion: text(scientific.packageVersion, 'scientific package version'),
    version: text(policy.policyVersion, 'concept reconciliation policy version'),
    concepts,
    mappings,
  }
}

function groupCount(evidence: IndependentConceptEvidence[], outcomes: IndependentConceptOutcome[]) {
  return new Set(evidence.filter((item) => outcomes.includes(item.outcome)).map((item) => item.evidenceGroupId)).size
}

const ASSESSMENT_ORDER: Record<ConceptAssessment, number> = {
  independently_strong: 0,
  independently_compatible: 1,
  historically_compatible: 2,
  possible_destination: 3,
  unassessed: 4,
  contradicted: 5,
}

/** Reconcile a historical genus evaluation without mutating or cloning its evidence. */
export function reconcileGenusEvaluation(
  dataset: ReconciliationDataset,
  evaluation: GenusEvaluation,
  independentEvidence: IndependentConceptEvidence[] = [],
): ReconciledGenusEvaluation {
  const mappingsBySource = new Map(dataset.mappings.map((mapping) => [mapping.sourceEntityId, mapping]))
  const evidenceByConcept = new Map<string, IndependentConceptEvidence[]>()
  for (const evidence of independentEvidence) {
    if (!dataset.concepts.some((concept) => concept.id === evidence.conceptId)) throw new Error(`Independent evidence ${evidence.id} references unknown concept ${evidence.conceptId}`)
    evidenceByConcept.set(evidence.conceptId, [...(evidenceByConcept.get(evidence.conceptId) || []), evidence])
  }

  const historical: HistoricalReconciliation[] = evaluation.candidates.map((candidate) => {
    const mapping = mappingsBySource.get(candidate.taxon.id)
    if (!mapping) return {
      sourceEntityId: candidate.taxon.id,
      sourcePacketId: candidate.taxon.packetId,
      sourceLabel: candidate.taxon.label,
      evidenceBand: candidate.band,
      status: 'unreviewed' as const,
      mappingId: null,
      possibleConceptIds: [],
      nonEquivalentConceptIds: [],
      unresolvedResidue: true,
      explanation: 'No reviewed crosswalk is supplied for this historical Lucid entity; it remains a labelled historical result, not a claimed contemporary equivalent.',
      provenance: [],
    }
    const possibleConceptIds = mapping.targets.filter((target) => target.isPositiveRoute).map((target) => target.conceptId)
    const nonEquivalentConceptIds = mapping.targets.filter((target) => !target.isPositiveRoute).map((target) => target.conceptId)
    const reviewedUnresolved = mapping.relationship === 'unresolved' && possibleConceptIds.length === 0
    return {
      sourceEntityId: candidate.taxon.id,
      sourcePacketId: candidate.taxon.packetId,
      sourceLabel: candidate.taxon.label,
      evidenceBand: candidate.band,
      status: reviewedUnresolved ? 'reviewed_unresolved' as const : 'mapped' as const,
      mappingId: mapping.id,
      possibleConceptIds,
      nonEquivalentConceptIds,
      unresolvedResidue: mapping.unresolvedResidue,
      explanation: reviewedUnresolved
        ? 'This historical result was reviewed, but no defensible contemporary destination was established.'
        : `${possibleConceptIds.length} positive concept route(s) are recorded; ${nonEquivalentConceptIds.length} explicit non-equivalence edge(s) are excluded from positive routing.${mapping.unresolvedResidue ? ' Unresolved source residue remains.' : ''}`,
      provenance: mapping.provenance,
    }
  })

  const routesByConcept = new Map<string, HistoricalConceptRoute[]>()
  for (const sourceCandidate of evaluation.candidates) {
    const mapping = mappingsBySource.get(sourceCandidate.taxon.id)
    if (!mapping) continue
    for (const target of mapping.targets.filter((item) => item.isPositiveRoute)) {
      const route: HistoricalConceptRoute = {
        mappingId: mapping.id,
        sourceEntityId: sourceCandidate.taxon.id,
        sourcePacketId: sourceCandidate.taxon.packetId,
        sourceEvidenceBand: sourceCandidate.band,
        mappingRelationship: mapping.relationship,
        targetRelationship: target.relationship,
        transferScope: mapping.relationship === 'equivalent_to' && target.relationship === 'equivalent_to' ? 'scoped_equivalence' : 'possible_destination',
        provenance: mapping.provenance,
      }
      routesByConcept.set(target.conceptId, [...(routesByConcept.get(target.conceptId) || []), route])
    }
  }

  const concepts: ConceptCandidate[] = dataset.concepts.flatMap((concept) => {
    const historicalRoutes = routesByConcept.get(concept.id) || []
    const conceptEvidence = [...(evidenceByConcept.get(concept.id) || [])].sort((a, b) => a.id.localeCompare(b.id))
    if (!historicalRoutes.length && !conceptEvidence.length) return []
    const supportGroups = groupCount(conceptEvidence, ['support', 'tentative_support'])
    const strongSupportGroups = groupCount(conceptEvidence, ['support'])
    const contradictionGroups = groupCount(conceptEvidence, ['strong_contradiction'])
    const equivalentRoutes = historicalRoutes.filter((route) => route.transferScope === 'scoped_equivalence')
    const equivalentContradiction = equivalentRoutes.some((route) => route.sourceEvidenceBand === 'contradicted')
    const equivalentCompatibility = equivalentRoutes.some((route) => route.sourceEvidenceBand === 'strong' || route.sourceEvidenceBand === 'compatible' || route.sourceEvidenceBand === 'possible')
    const possibleRoute = historicalRoutes.some((route) => route.transferScope === 'possible_destination' && route.sourceEvidenceBand !== 'contradicted')
    const assessment: ConceptAssessment = contradictionGroups > 0 || (equivalentContradiction && supportGroups === 0) ? 'contradicted'
      : strongSupportGroups >= 3 ? 'independently_strong'
        : supportGroups > 0 ? 'independently_compatible'
          : equivalentCompatibility ? 'historically_compatible'
            : possibleRoute ? 'possible_destination' : 'unassessed'
    const uncertainties = [...new Set(historicalRoutes.map((route) => dataset.mappings.find((mapping) => mapping.id === route.mappingId)!.confidence))].sort()
    const explanation = assessment === 'possible_destination'
      ? 'A reviewed split or partial-overlap route makes this a possible destination, but no Lucid score row was copied to the concept.'
      : assessment === 'historically_compatible'
        ? 'A scoped equivalence route carries the historical compatibility result; this is not independent contemporary evidence.'
        : assessment === 'unassessed'
          ? 'The concept has no assessed independent evidence and no transferable equivalence result.'
          : assessment === 'contradicted'
            ? 'Independent concept evidence, or a scoped equivalent historical route, contains a strong contradiction.'
            : `${supportGroups} independent evidence group(s) support this concept; historical routes were not counted as duplicate support.`
    return [{
      concept,
      assessment,
      historicalRoutes: [...historicalRoutes].sort((a, b) => a.mappingId.localeCompare(b.mappingId) || a.sourceEntityId.localeCompare(b.sourceEntityId)),
      independentEvidence: conceptEvidence,
      independentSupportGroups: supportGroups,
      independentContradictionGroups: contradictionGroups,
      mappingUncertainty: uncertainties,
      explanation,
    }]
  }).sort((a, b) => ASSESSMENT_ORDER[a.assessment] - ASSESSMENT_ORDER[b.assessment] || a.concept.label.localeCompare(b.concept.label))

  const reviewedSourceEntityIds = historical.filter((item) => item.status === 'reviewed_unresolved' || item.unresolvedResidue).map((item) => item.sourceEntityId).sort()
  const unreviewedSourceEntityIds = historical.filter((item) => item.status === 'unreviewed').map((item) => item.sourceEntityId).sort()
  return {
    historical,
    concepts,
    unresolved: {
      reviewedSourceEntityIds,
      unreviewedSourceEntityIds,
      hasOutsideCoverage: reviewedSourceEntityIds.length > 0 || unreviewedSourceEntityIds.length > 0,
    },
    trace: {
      scientificPackageVersion: dataset.packageVersion,
      reconciliationVersion: dataset.version,
      sourceEnginePolicyVersion: evaluation.policy.version,
    },
  }
}
