import type {
  CandidateResult, CharacterState, CharacterSuggestion, Confidence, CuratedMetadata, DifferentialRow,
  Evidence, Feature, KeyData, Observation, Taxon, WorkMode,
} from './types'

const confidenceWeights: Record<Confidence, number> = { certain: 1, fairly_sure: 0.65, unsure: 0.35 }
const scoreContributions: Record<number, number> = {
  0: -0.85,
  1: 1,
  2: 0.6,
  3: 0.12,
  4: 0.35,
  5: 0.18,
}

export function genusName(name: string) {
  return name.split(' ')[0]
}

export function buildIndexes(key: KeyData) {
  return {
    taxonById: new Map(key.taxa.map((item) => [item.id, item])),
    taxonOffset: new Map(key.taxa.map((item, index) => [item.id, index])),
    featureById: new Map(key.features.map((item) => [item.id, item])),
    stateById: new Map(key.states.map((item) => [item.id, item])),
  }
}

export function scoreCode(key: KeyData, stateId: number, taxonId: number): number {
  const offset = key.taxa.findIndex((taxon) => taxon.id === taxonId)
  if (offset < 0) return 0
  return Number(key.score_vectors[String(stateId)]?.[offset] ?? 0)
}

function descendantsOf(featureId: number, features: Feature[]) {
  const descendants = new Set<number>([featureId])
  let changed = true
  while (changed) {
    changed = false
    for (const feature of features) {
      if (!descendants.has(feature.id) && descendants.has(feature.parent)) {
        descendants.add(feature.id)
        changed = true
      }
    }
  }
  return descendants
}

export function availableFeatureIds(key: KeyData, controllingStateIds: number[]): Set<number> {
  const chosen = new Set(controllingStateIds)
  const positiveTargets = new Set(key.dependencies.filter((d) => d.dependency_type === 'positive').map((d) => d.dependent_feature_id))
  const enabledPositiveTargets = new Set(
    key.dependencies
      .filter((d) => d.dependency_type === 'positive' && chosen.has(d.controlling_state_id))
      .map((d) => d.dependent_feature_id),
  )
  const disabledRoots = new Set(
    key.dependencies
      .filter((d) => d.dependency_type === 'negative' && chosen.has(d.controlling_state_id))
      .map((d) => d.dependent_feature_id),
  )
  for (const target of positiveTargets) if (!enabledPositiveTargets.has(target)) disabledRoots.add(target)

  const disabled = new Set<number>()
  for (const root of disabledRoots) for (const id of descendantsOf(root, key.features)) disabled.add(id)
  return new Set(key.features.filter((feature) => !disabled.has(feature.id)).map((feature) => feature.id))
}

function evidenceForObservation(key: KeyData, taxon: Taxon, observation: Observation): Evidence {
  const indexes = buildIndexes(key)
  const states = observation.stateIds.map((id) => indexes.stateById.get(id)).filter(Boolean) as CharacterState[]
  const codes = states.map((state) => scoreCode(key, state.id, taxon.id))
  const feature = indexes.featureById.get(observation.featureId)
  const assessed = (feature?.states ?? []).some((stateId) => scoreCode(key, stateId, taxon.id) !== 0)
  if (!assessed) {
    return {
      featureId: observation.featureId,
      featureName: feature?.name ?? `Feature ${observation.featureId}`,
      stateNames: states.map((state) => state.name),
      sourceCodes: codes,
      outcome: 'uncertain',
      contribution: 0,
      assessed: false,
    }
  }
  const bestCode = [...codes].sort((a, b) => scoreContributions[b] - scoreContributions[a])[0] ?? 0
  const contribution = scoreContributions[bestCode] * confidenceWeights[observation.confidence]
  const outcome = bestCode === 0 ? 'conflict' : bestCode === 3 ? 'uncertain' : 'support'
  return {
    featureId: observation.featureId,
    featureName: indexes.featureById.get(observation.featureId)?.name ?? `Feature ${observation.featureId}`,
    stateNames: states.map((state) => state.name),
    sourceCodes: codes,
    outcome,
    contribution,
    assessed: true,
  }
}

export function rankCandidates(key: KeyData, observations: Observation[]): CandidateResult[] {
  const candidates = key.taxa.filter((taxon) => taxon.parent !== 0)

  return candidates.map((taxon) => {
    const evidence = observations.map((observation) => evidenceForObservation(key, taxon, observation))
    const assessedFeatureIds = new Set(evidence.filter((item) => item.assessed).map((item) => item.featureId))
    const totalWeight = observations
      .filter((observation) => assessedFeatureIds.has(observation.featureId))
      .reduce((sum, item) => sum + confidenceWeights[item.confidence], 0)
    const minimum = totalWeight * scoreContributions[0]
    const maximum = totalWeight
    const rawScore = evidence.reduce((sum, item) => sum + item.contribution, 0)
    const compatibility = observations.length === 0 || totalWeight === 0
      ? 100
      : Math.max(0, Math.min(100, ((rawScore - minimum) / (maximum - minimum)) * 100))
    const label = observations.length === 0 || totalWeight === 0 ? 'Not assessed'
      : compatibility >= 85 ? 'Strong match'
        : compatibility >= 65 ? 'Good match'
          : compatibility >= 45 ? 'Possible' : 'Weak match'
    return {
      taxon,
      compatibility,
      rawScore,
      supports: evidence.filter((item) => item.outcome === 'support'),
      conflicts: evidence.filter((item) => item.outcome === 'conflict'),
      uncertain: evidence.filter((item) => item.outcome === 'uncertain'),
      label,
    } as CandidateResult
  }).sort((a, b) => b.compatibility - a.compatibility || b.supports.length - a.supports.length || a.conflicts.length - b.conflicts.length || a.taxon.name.localeCompare(b.taxon.name))
}

export function plausibleCandidates(candidates: CandidateResult[], observationCount: number) {
  if (observationCount === 0) return candidates
  const best = candidates[0]?.compatibility ?? 0
  const fewestConflicts = Math.min(...candidates.map((candidate) => candidate.conflicts.length))
  return candidates.filter((candidate) => candidate.compatibility >= Math.max(38, best - 18) && candidate.conflicts.length <= fewestConflicts + 1)
}

export function metadataFor(feature: Feature, curated: CuratedMetadata) {
  const group = curated.group_defaults[String(feature.parent)] ?? {
    label: 'Other', difficulty: 3, reliability: 0.75, methods: ['inspection'],
  }
  return { ...group, ...(curated.feature_overrides[String(feature.id)] ?? {}) }
}

function signatureForTaxon(key: KeyData, feature: Feature, taxon: Taxon) {
  const primary = (feature.states ?? []).filter((stateId) => [1, 2].includes(scoreCode(key, stateId, taxon.id)))
  return primary.length ? primary.join('|') : 'unknown'
}

function entropy(values: string[]) {
  const counts = new Map<string, number>()
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1))
  return [...counts.values()].reduce((sum, count) => {
    const p = count / values.length
    return sum - p * Math.log2(p)
  }, 0)
}

export function suggestCharacters(
  key: KeyData,
  candidates: CandidateResult[],
  observations: Observation[],
  available: Set<number>,
  curated: CuratedMetadata,
  mode: WorkMode,
  limit = 3,
  excludedFeatureIds: Set<number> = new Set(),
): CharacterSuggestion[] {
  const observed = new Set(observations.map((item) => item.featureId))
  const pool = candidates.slice(0, 24).map((candidate) => candidate.taxon)
  if (pool.length < 2) return []
  return key.features
    .filter((feature) => feature.kind === 'multistate' && feature.id > 17 && available.has(feature.id) && !observed.has(feature.id) && !excludedFeatureIds.has(feature.id))
    .map((feature) => {
      const meta = metadataFor(feature, curated)
      const signatures = pool.map((taxon) => signatureForTaxon(key, feature, taxon))
      const covered = signatures.filter((value) => value !== 'unknown').length
      const coverage = covered / pool.length
      const separation = entropy(signatures)
      const effort = Math.max(1, meta.difficulty)
      const modeFactor = mode === 'field' ? (meta.difficulty <= 2 ? 1.45 : meta.difficulty === 3 ? 0.65 : 0.12) : 1
      return {
        feature, separation, coverage, difficulty: meta.difficulty,
        method: meta.methods[0] ?? 'inspection',
        utility: separation * coverage * meta.reliability * modeFactor / effort,
      }
    })
    .filter((item) => item.coverage > 0.2 && item.separation > 0.05)
    .sort((a, b) => b.utility - a.utility)
    .slice(0, limit)
}

export function comparisonIsUseful(candidates: CandidateResult[], observationCount: number) {
  return observationCount > 0 && candidates.length >= 2 && candidates.length <= 5
}

export function differentialRows(
  key: KeyData,
  taxa: Taxon[],
  observations: Observation[],
  available: Set<number>,
  curated: CuratedMetadata,
  limit = 8,
): DifferentialRow[] {
  if (taxa.length < 2 || taxa.length > 5) return []
  const stateById = new Map(key.states.map((state) => [state.id, state]))
  const observed = new Set(observations.map((item) => item.featureId))
  return key.features
    .filter((feature) => feature.kind === 'multistate' && feature.id > 17 && available.has(feature.id) && !observed.has(feature.id))
    .map((feature) => {
      const values: Record<number, string> = {}
      const signatures: string[] = []
      for (const taxon of taxa) {
        const scored = (feature.states ?? []).filter((stateId) => [1, 2].includes(scoreCode(key, stateId, taxon.id)))
        const label = scored.length ? scored.map((id) => stateById.get(id)?.name).filter(Boolean).join(' / ') : 'Not scored'
        values[taxon.id] = label
        signatures.push(label)
      }
      const meta = metadataFor(feature, curated)
      return { feature, values, utility: new Set(signatures).size / meta.difficulty }
    })
    .filter((row) => new Set(Object.values(row.values)).size > 1)
    .sort((a, b) => b.utility - a.utility)
    .slice(0, limit)
}

export function controlStateIds(sex: 'male' | 'female' | 'unknown' | null, epigyneCleared: boolean) {
  if (sex === 'male') return [1]
  if (sex === 'unknown') return [4]
  if (sex === 'female') return [2, epigyneCleared ? 6 : 5]
  return []
}
