/**
 * Stage 1 scientific contract.
 *
 * These records deliberately keep identity, labels, evidence, interpretation,
 * taxonomy, provenance, applicability, media and uncertainty separate. Runtime
 * code must join records by persistent IDs or explicit aliases, never by names.
 */

export type PersistentId = string
export type SourceId = 'lucid_richardson_whyte_zabka' | 'schubert_2025_thesis' | string
export type ReviewStatus = 'open' | 'resolved' | 'superseded'
export type BiologicalStatus = string
export type NomenclaturalStatus = string

export interface SourceAlias {
  scheme: 'packet_id' | 'original_numeric_id' | 'original_uid' | 'source_path' | 'source_reference'
  value: string
}

export interface SourceLocator {
  packetFile: string
  jsonPointer?: string
  sourceId?: SourceId
  page?: number
  sourceReference?: string
  packetSha256: string
}

export interface ProvenanceRecord {
  id: PersistentId
  subjectId: PersistentId
  locator: SourceLocator
  aliases: SourceAlias[]
  rawRecordSha256: string
  evidenceClass: 'source_fact' | 'curator_interpretation' | 'synthetic_guidance'
}

export interface TaxonConcept {
  id: PersistentId
  rank: string
  accordingToSourceId: SourceId
  preferredNameUsageId: PersistentId
  biologicalStatus: BiologicalStatus
  nomenclaturalStatus: NomenclaturalStatus
  aliases: SourceAlias[]
}

export interface TaxonomicName {
  id: PersistentId
  canonicalSpelling: string
  authorship: string | null
  year: number | null
  aliases: SourceAlias[]
}

export interface NameUsage {
  id: PersistentId
  exactSpelling: string
  qualifier: string | null
  taxonomicNameId: PersistentId | null
  taxonConceptId: PersistentId | null
  locator: SourceLocator
}

export interface PlacementAssertion {
  id: PersistentId
  subjectNameUsageId: PersistentId
  objectConceptId: PersistentId
  placementStatus: string
  relationship: string | null
  uncertainty: string | null
  locator: SourceLocator
}

export interface NomenclaturalActAssertion {
  id: PersistentId
  affectedUsageIds: PersistentId[]
  actKind: string
  status: NomenclaturalStatus
  qualifyingEvidence: string | null
  locator: SourceLocator
}

export interface PhylogeneticAssertion {
  id: PersistentId
  subjectConceptId: PersistentId
  predicate: string
  objectConceptId: PersistentId
  supportMetric: string
  supportValue: number | null
  qualification: string | null
  locator: SourceLocator
}

export type LucidScoreClass =
  | 'absent'
  | 'common'
  | 'rare'
  | 'uncertain'
  | 'common_misinterpreted'
  | 'rare_misinterpreted'

export interface MatrixSnapshot {
  id: PersistentId
  taxonIds: PersistentId[]
  stateIds: PersistentId[]
  rootTaxonId: PersistentId
  genusLeafTaxonIds: PersistentId[]
  scoreLegend: Record<LucidScoreClass, { originalCode: number; meaning: string; observed: boolean }>
  encoding: 'row_major_uint8_base64'
  cellsBase64: string
  cellCount: number
  cellsSha256: string
}

export interface CharacterDefinition {
  id: PersistentId
  label: string
  sourceId: SourceId
  stateIds: PersistentId[]
  sourceWording: unknown
}

export interface CharacterAssertion {
  id: PersistentId
  subjectConceptId: PersistentId
  stateId: PersistentId
  assertionType: string
  sex: string[]
  lifeStage: string[]
  variation: string
  locator: SourceLocator
  reviewedLocator: SourceLocator | null
}

export interface ProvenanceCorrection {
  id: string
  interpretationVersion: string
  target: {
    packetFile: '05_schubert_genus_characters.json'
    jsonPointer: string
    taxonConceptPacketId: string
    characterPacketId: string
    statePacketId: string
  }
  originalLocator: { page: number; section: string }
  reviewedLocator: { page: number; section: string }
  reason: string
  evidence: {
    sourceId: SourceId
    sourcePath: string
    sourceSha256: string
    method: string
    reviewedOn: string
    correctionRecord: string
  }
}

export interface ConceptRelation {
  id: PersistentId
  sourceEntityId: PersistentId
  targetConceptIds: PersistentId[]
  targetRelations: Array<{
    targetConceptId: PersistentId
    relationship: string
  }>
  relationship: string
  componentRelations: Array<{
    id: PersistentId
    targetConceptId: PersistentId | null
    relationship: string
    confidence: string
    sourceComponent: unknown
  }>
  mappingUncertainty: string
  basis: string
  rationale: string
  notes: string
  locator: SourceLocator
}

export interface ReviewIssue {
  id: `VR${string}` | `AU${string}`
  status: ReviewStatus
  kind: string
  sourceFile: string
  sourceLocator: string
  sourceText: string
  interimPolicy: string
}

export interface ApplicabilityInterpretation {
  id: string
  evidenceClass: 'curator_interpretation'
  characterPacketIds?: string[]
  groupPacketIds?: string[]
  sex?: 'male' | 'female'
  adultOnly?: boolean
  preparation?: 'epigyne_cleared'
  provenance: string[]
  interpretationVersion: string
}

export interface GenusEngineInterpretations {
  policyVersion: string
  uncertaintyAddsSupport: false
  allZeroProtection: {
    issueId: 'AU01'
    interpretationVersion: string
    sourceCodesRemainUnmodified: true
  }
  applicabilityOverlays: ApplicabilityInterpretation[]
}

export interface ScientificRuntimePackage {
  format: 'australian-salticidae-scientific-package@1'
  packageVersion: string
  inputDigest: string
  sourceManifest: unknown
  compatibility: {
    rawPacketFieldsPreserved: true
    unknownFieldPolicy: 'preserve_in_raw_snapshot_and_inventory'
    unresolvedReferencePolicy: 'compile_error'
  }
  identities: {
    aliases: Record<PersistentId, SourceAlias[]>
  }
  model: {
    taxonConcepts: TaxonConcept[]
    taxonomicNames: TaxonomicName[]
    nameUsages: NameUsage[]
    placementAssertions: PlacementAssertion[]
    nomenclaturalActAssertions: NomenclaturalActAssertion[]
    phylogeneticAssertions: PhylogeneticAssertion[]
    matrix: MatrixSnapshot
    characterDefinitions: CharacterDefinition[]
    characterAssertions: CharacterAssertion[]
    conceptRelations: ConceptRelation[]
    reviewIssues: ReviewIssue[]
    interpretations: {
      allZeroProfiles: Array<{ taxonId: PersistentId; featureId: PersistentId; issueId: 'AU01' }>
      provenanceCorrections: ProvenanceCorrection[]
      provenanceCorrectionSource: {
        path: string
        sha256: string
        version: string
        sourceFactsRemainUnmodified: true
      }
      quarantinedIssueIds: string[]
      sourceFactsRemainUnmodified: true
      genusEngine: GenusEngineInterpretations
      conceptReconciliation: {
        policyVersion: string
        positiveTargetRelationships: string[]
        nonPositiveTargetRelationships: ['not_equivalent']
        splitCopiesSourceEvidence: false
        partialOverlapTransfersUniversalAbsence: false
        unmappedSourcePolicy: 'retain_historical_unreviewed'
      }
    }
  }
  provenance: ProvenanceRecord[]
  rawSnapshots: Record<string, unknown>
  losslessness: unknown
}
