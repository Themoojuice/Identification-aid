import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowLeft, ArrowRight, Beaker, BookOpen, Bug, Check, ChevronDown, ChevronRight,
  CircleAlert, CircleHelp, ClipboardCheck, Download, EyeOff, FlaskConical, Info,
  ListChecks, Microscope, Moon, RotateCcw, Save, Search, Sparkles, Sun, X, Route, Upload, Wifi, WifiOff, HardDrive,
} from 'lucide-react'
import { loadAppData, mediaUrl, plainCaption } from './lib/data'
import { AnatomyReference, StateIllustration } from './components/StateIllustration'
import {
  characterApplicability, createGenusDatasetFromScientificPackage, evaluateGenusIdentification,
  REVIEWED_POLICY,
} from './lib/genus-engine'
import type {
  CandidateEvidence, CandidateResult, GenusCharacter, GenusObservation, GenusState,
  LifeStage, ObservationCertainty, ObservationDisposition, PreparationState, Sex,
} from './lib/genus-engine'
import {
  createReconciliationDatasetFromScientificPackage, reconcileGenusEvaluation,
} from './lib/concept-reconciliation'
import type { HistoricalReconciliation, ReconciledGenusEvaluation } from './lib/concept-reconciliation'
import {
  freshSession, LEGACY_SESSION_STORAGE_KEY, migrateLegacySession, restoreSessionExport,
  PREVIOUS_SESSION_STORAGE_KEYS, SESSION_STORAGE_KEY, sessionExport,
  recoverSavedSessions, sessionReferenceError,
} from './lib/session'
import type { IdentificationSession } from './lib/session'
import { readLocalValue, writeLocalValue } from './lib/browser-storage'
import type { CuratedMetadata, FactSheetData, KeyData, WorkMode } from './lib/types'
import type { ScientificRuntimePackage } from './lib/scientific-contract'
import {
  createSchubertDatasetFromScientificPackage, evaluateSchubertEvidence, followPublishedKeyBranch,
  keyAvailability, keyTerminalEvidence, publishedKeyNode, rankSchubertQuestions, schubertApplicability,
  SCHUBERT_POLICY_VERSION, QUESTION_UTILITY_VERSION,
} from './lib/schubert-engine'
import type { SchubertCharacter, SchubertState } from './lib/schubert-engine'
import { rankLucidQuestions } from './lib/question-ranking'
import { loadIndexedSession, rememberPinnedPackage, requestPersistentStorage, saveIndexedSession, storageEstimate } from './lib/offline-storage'
import { checkForOfflineUpdate, initialOfflineStatus, pinOfflinePackage, rollbackOfflinePackage, subscribeOfflineStatus } from './lib/offline-client'
import type { OfflineStatus } from './lib/offline-client'
import {
  createSpeciesDatasetFromScientificPackage, evaluateSpeciesSuggestions, SPECIES_POLICY_VERSION,
} from './lib/species-suggestions'
import type { SpeciesHintResponse, SpeciesObservation, SpeciesSuggestionEvaluation, SpeciesSuggestionResult } from './lib/species-suggestions'

type AppData = { key: KeyData; facts: FactSheetData; curated: CuratedMetadata; scientific: ScientificRuntimePackage }
type Screen = 'question' | 'evidence' | 'compare' | 'context'

const bandCopy = {
  strong: { label: 'Strongly supported', description: 'Broad source coverage with support from at least three independent character groups.' },
  compatible: { label: 'Compatible', description: 'The observations support this historical genus without a strong conflict.' },
  possible: { label: 'Possible', description: 'Still possible, but support is limited or includes tentative disagreement.' },
  unassessed: { label: 'Not yet assessed', description: 'There is not enough active evidence to assess this genus.' },
  contradicted: { label: 'Conflicting evidence', description: 'At least one certain, applicable observation conflicts with the source profile.' },
} as const

const outcomeCopy: Record<CandidateEvidence['outcome'], string> = {
  support: 'Supports', tentative_support: 'Qualified support', strong_contradiction: 'Conflicts',
  tentative_contradiction: 'Tentative conflict', source_uncertain: 'Source uncertain',
  source_unreported: 'Not reported', apparent_only: 'Apparent only',
}

function App() {
  const [data, setData] = useState<AppData | null>(null)
  const [loadError, setLoadError] = useState('')
  const [session, setSession] = useState<IdentificationSession>(freshSession)
  const [hydrated, setHydrated] = useState(false)
  const [screen, setScreen] = useState<Screen>('question')
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null)
  const [activeQuestionSource, setActiveQuestionSource] = useState<'lucid' | 'schubert' | null>(null)
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
  const [comparisonIds, setComparisonIds] = useState<string[]>([])
  const [candidateSearch, setCandidateSearch] = useState('')
  const [showAllCandidates, setShowAllCandidates] = useState(false)
  const [migrationOpen, setMigrationOpen] = useState(true)
  const [savedPulse, setSavedPulse] = useState(false)
  const [storageWarning, setStorageWarning] = useState('')
  const [importMessage, setImportMessage] = useState('')
  const [offlineStatus, setOfflineStatus] = useState<OfflineStatus>(initialOfflineStatus)
  const [storageUsage, setStorageUsage] = useState<{ usage?: number; quota?: number } | null>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => readLocalValue('salticidae-theme') === 'dark' ? 'dark' : 'light')

  useEffect(() => { loadAppData().then(setData).catch((error: Error) => setLoadError(error.message)) }, [])
  useEffect(() => {
    if (!data || hydrated) return
    let cancelled = false
    void (async () => {
      const indexed = await loadIndexedSession()
      const raws = [indexed ? JSON.stringify(indexed) : null, readLocalValue(SESSION_STORAGE_KEY), ...PREVIOUS_SESSION_STORAGE_KEYS.map(readLocalValue)]
      const legacyRaw = readLocalValue(LEGACY_SESSION_STORAGE_KEY)
      const legacy = migrateLegacySession(legacyRaw, data.scientific, data.key)
      if (legacyRaw && !legacy) raws.push(legacyRaw)
      const restored = recoverSavedSessions(raws, {
        genus: createGenusDatasetFromScientificPackage(data.scientific),
        schubert: createSchubertDatasetFromScientificPackage(data.scientific),
        species: createSpeciesDatasetFromScientificPackage(data.scientific),
      }, legacy)
      if (!cancelled) { setSession(restored); setHydrated(true) }
    })()
    return () => { cancelled = true }
  }, [data, hydrated])
  useEffect(() => {
    if (!hydrated) return
    const saved = { ...session, updatedAt: new Date().toISOString() }
    const backupSaved = writeLocalValue(SESSION_STORAGE_KEY, JSON.stringify(saved))
    let cancelled = false
    void saveIndexedSession(saved).then((result) => { if (!cancelled) setStorageWarning(result.persisted ? '' : backupSaved ? 'Durable storage failed. A browser backup was saved; export this session for safety.' : 'Session not saved: browser storage is unavailable. Export this session now.') })
    return () => { cancelled = true }
  }, [hydrated, session])
  useEffect(() => subscribeOfflineStatus((update) => setOfflineStatus((current) => ({ ...current, ...update }))), [])
  useEffect(() => { void requestPersistentStorage().then((value) => setOfflineStatus((current) => ({ ...current, storagePersistent: value }))); void storageEstimate().then(setStorageUsage) }, [])
  useEffect(() => {
    if (!data || !hydrated || (session.packagePin && (session.packagePin.offlinePackageId || !offlineStatus.activePackageId))) return
    setSession((current) => ({ ...current, packagePin: current.packagePin ? { ...current.packagePin, offlinePackageId: current.packagePin.offlinePackageId ?? offlineStatus.activePackageId } : {
      scientificPackageVersion: data.scientific.packageVersion,
      sourceManifestVersion: data.scientific.packageVersion,
      interpretationVersion: REVIEWED_POLICY.version,
      genusEngineVersion: REVIEWED_POLICY.version,
      schubertPolicyVersion: SCHUBERT_POLICY_VERSION,
      questionUtilityVersion: QUESTION_UTILITY_VERSION,
      speciesPolicyVersion: SPECIES_POLICY_VERSION,
      offlinePackageId: offlineStatus.activePackageId,
    } }))
  }, [data, hydrated, offlineStatus.activePackageId, session.packagePin])
  useEffect(() => {
    const packageId = session.packagePin?.offlinePackageId
    if (!packageId) return
    pinOfflinePackage(packageId)
    void rememberPinnedPackage(packageId)
  }, [session.packagePin?.offlinePackageId])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    writeLocalValue('salticidae-theme', theme)
  }, [theme])

  const domain = useMemo(() => {
    if (!data) return null
    return {
      genus: createGenusDatasetFromScientificPackage(data.scientific),
      reconciliation: createReconciliationDatasetFromScientificPackage(data.scientific),
      schubert: createSchubertDatasetFromScientificPackage(data.scientific),
      species: createSpeciesDatasetFromScientificPackage(data.scientific),
    }
  }, [data])
  const evaluation = useMemo(() => domain
    ? evaluateGenusIdentification(domain.genus, session.specimen, session.observations, REVIEWED_POLICY)
    : null, [domain, session.observations, session.specimen])
  const schubertEvaluation = useMemo(() => domain
    ? evaluateSchubertEvidence(domain.schubert, session.specimen, session.schubertObservations)
    : null, [domain, session.schubertObservations, session.specimen])
  const keyNode = useMemo(() => {
    if (!domain) return null
    let node = publishedKeyNode(domain.schubert.key, domain.schubert.key.rootNodeId)
    for (const step of session.publishedKeyHistory) {
      if (node.kind !== 'question' || node.id !== step.nodeId) break
      node = followPublishedKeyBranch(domain.schubert.key, node.id, step.branchIndex)
    }
    return node
  }, [domain, session.publishedKeyHistory])
  const reconciled = useMemo(() => domain && evaluation
    ? reconcileGenusEvaluation(domain.reconciliation, evaluation, [
      ...(schubertEvaluation?.evidence ?? []),
      ...(keyNode?.kind === 'terminal' && keyAvailability(session.specimen).available ? [keyTerminalEvidence(keyNode)] : []),
    ])
    : null, [domain, evaluation, keyNode, schubertEvaluation])
  const speciesEvaluation = useMemo(() => domain && reconciled
    ? evaluateSpeciesSuggestions(domain.species, {
      enabled: session.speciesSuggestionsEnabled,
      context: session.specimen,
      workMode: session.workMode,
      conceptCandidates: reconciled.concepts,
      observations: session.speciesObservations,
    })
    : null, [domain, reconciled, session.speciesObservations, session.speciesSuggestionsEnabled, session.specimen, session.workMode])
  const ui = useMemo(() => data && domain ? buildUiIndexes(data, domain.genus.characters, domain.genus.states) : null, [data, domain])

  const questionPool = useMemo(() => {
    if (!domain || !ui || !evaluation) return []
    const lucidCharacters = domain.genus.characters
      .filter((character) => !['F001', 'F002'].includes(character.packetId))
      .filter((character) => characterApplicability(domain.genus, session.specimen, character.id).status === 'applicable')
      .filter((character) => session.workMode === 'microscope' || ui.meta(character).difficulty <= 3)
    const viableIds = evaluation.candidates.filter((candidate) => candidate.band !== 'contradicted').map((candidate) => candidate.taxon.id)
    const lucid = rankLucidQuestions(domain.genus, lucidCharacters, viableIds, session.observations, (character) => {
      const meta = ui.meta(character)
      return { effort: meta.difficulty, errorRisk: meta.difficulty >= 4 ? 'high' : meta.difficulty >= 2 ? 'moderate' : 'low', usable: true, rationale: `${meta.methods.join(' or ')}; effort ${meta.difficulty}/5 (curator/product judgment).` }
    })
    const routedConceptIds = evaluation.activeObservationIds.length
      ? [...new Set(evaluation.candidates.filter((candidate) => candidate.band !== 'contradicted').slice(0, 20).flatMap((candidate) => domain.reconciliation.mappings.find((mapping) => mapping.sourceEntityId === candidate.taxon.id)?.targets.filter((target) => target.isPositiveRoute).map((target) => target.conceptId) ?? []))]
      : []
    const hasSchubertRoute = routedConceptIds.some((id) => domain.schubert.conceptIds.includes(id))
    // Routes prioritize questions, but cannot make independent concepts
    // permanently unreachable. All applicable Schubert questions stay selectable.
    const schubert = rankSchubertQuestions(domain.schubert, session.specimen, session.schubertObservations, session.workMode)
      .map((question) => hasSchubertRoute ? question : { ...question, utility: 0,
        explanation: `${question.explanation} Available for manual selection; current historical routes do not prioritize it.` })
    return [...lucid, ...schubert].sort((a, b) => b.utility - a.utility || a.effort - b.effort || a.characterId.localeCompare(b.characterId))
  }, [domain, evaluation, session.observations, session.schubertObservations, session.specimen, session.workMode, ui])

  const activeManualQuestion: RankedQuestion | undefined = activeCharacterId && activeQuestionSource ? {
    source: activeQuestionSource, characterId: activeCharacterId, utility: 0, effort: 1,
    explanation: 'You selected this recorded observation for revision; changing it will immediately re-evaluate the evidence.',
  } : undefined
  const selectedQuestion = questionPool.find((item) => item.characterId === activeCharacterId && item.source === activeQuestionSource) ?? activeManualQuestion ?? questionPool[0]
  const currentCharacter = selectedQuestion?.source === 'lucid' ? domain?.genus.characters.find((item) => item.id === selectedQuestion.characterId) : undefined
  const currentSchubertCharacter = selectedQuestion?.source === 'schubert' ? domain?.schubert.characters.find((item) => item.id === selectedQuestion.characterId) : undefined
  const currentObservation = currentCharacter ? session.observations.find((item) => item.characterId === currentCharacter.id) : undefined
  const currentSchubertObservation = currentSchubertCharacter ? session.schubertObservations.find((item) => item.characterId === currentSchubertCharacter.id) : undefined
  const selectedCandidate = evaluation?.candidates.find((item) => item.taxon.id === selectedCandidateId)

  function updateContext(field: 'sex' | 'lifeStage' | 'preparation', value: Sex | LifeStage | PreparationState) {
    setSession((current) => ({
      ...current,
      contextStarted: true,
      specimen: field === 'sex' ? { ...current.specimen, sex: value as Sex }
        : field === 'lifeStage' ? { ...current.specimen, lifeStage: value as LifeStage }
          : { ...current.specimen, preparation: { epigyneCleared: value as PreparationState } },
    }))
  }

  function recordStates(character: GenusCharacter, stateId: string) {
    setActiveCharacterId(character.id)
    setActiveQuestionSource('lucid')
    setSession((current) => {
      const existing = current.observations.find((item) => item.characterId === character.id)
      const currentStates = existing?.disposition === 'observed' ? existing.stateIds : []
      const stateIds = currentStates.includes(stateId) ? currentStates.filter((item) => item !== stateId) : [...currentStates, stateId]
      const observations = current.observations.filter((item) => item.characterId !== character.id)
      if (stateIds.length) observations.push({
        id: existing?.id ?? `obs:${character.id}`,
        specimenId: current.specimen.specimenId,
        characterId: character.id,
        disposition: 'observed',
        expression: stateIds.length === 1 ? 'single' : 'alternatives',
        stateIds,
        certainty: existing?.disposition === 'observed' ? existing.certainty : 'certain',
        evidenceGroupId: character.groupPacketId,
      })
      return { ...current, observations }
    })
  }

  function recordSchubertStates(character: SchubertCharacter, stateId: string) {
    setActiveCharacterId(character.id)
    setActiveQuestionSource('schubert')
    setSession((current) => {
      const existing = current.schubertObservations.find((item) => item.characterId === character.id)
      const currentStates = existing?.disposition === 'observed' ? existing.stateIds : []
      const stateIds = currentStates.includes(stateId) ? currentStates.filter((item) => item !== stateId) : [...currentStates, stateId]
      const schubertObservations = current.schubertObservations.filter((item) => item.characterId !== character.id)
      if (stateIds.length) schubertObservations.push({
        id: existing?.id ?? `schubert-obs:${character.id}`, specimenId: current.specimen.specimenId,
        characterId: character.id, disposition: 'observed', expression: stateIds.length === 1 ? 'single' : 'alternatives', stateIds,
        certainty: existing?.disposition === 'observed' ? existing.certainty : 'certain', evidenceGroupId: character.evidenceGroupId,
      })
      return { ...current, schubertObservations }
    })
  }

  function recordDisposition(character: GenusCharacter, disposition: Exclude<ObservationDisposition, 'observed' | 'inapplicable'>) {
    setSession((current) => ({
      ...current,
      observations: [
        ...current.observations.filter((item) => item.characterId !== character.id),
        { id: `obs:${character.id}`, specimenId: current.specimen.specimenId, characterId: character.id, disposition, evidenceGroupId: character.groupPacketId },
      ],
    }))
    setActiveCharacterId(null)
  }

  function recordSchubertDisposition(character: SchubertCharacter, disposition: Exclude<ObservationDisposition, 'observed' | 'inapplicable'>) {
    setSession((current) => ({ ...current, schubertObservations: [
      ...current.schubertObservations.filter((item) => item.characterId !== character.id),
      { id: `schubert-obs:${character.id}`, specimenId: current.specimen.specimenId, characterId: character.id, disposition, evidenceGroupId: character.evidenceGroupId },
    ] }))
    setActiveCharacterId(null); setActiveQuestionSource(null)
  }

  function changeCertainty(characterId: string, certainty: ObservationCertainty) {
    setSession((current) => ({ ...current, observations: current.observations.map((item) => item.characterId === characterId && item.disposition === 'observed' ? { ...item, certainty } : item) }))
  }

  function changeSchubertCertainty(characterId: string, certainty: ObservationCertainty) {
    setSession((current) => ({ ...current, schubertObservations: current.schubertObservations.map((item) => item.characterId === characterId && item.disposition === 'observed' ? { ...item, certainty } : item) }))
  }

  function removeObservation(characterId: string) {
    setSession((current) => ({ ...current, observations: current.observations.filter((item) => item.characterId !== characterId) }))
    setActiveCharacterId(characterId)
    setActiveQuestionSource('lucid')
    setScreen('question')
  }

  function removeSchubertObservation(characterId: string) {
    setSession((current) => ({ ...current, schubertObservations: current.schubertObservations.filter((item) => item.characterId !== characterId) }))
    setActiveQuestionSource('schubert'); setActiveCharacterId(characterId); setScreen('question')
  }

  function recordSpeciesHint(speciesId: string, hintId: string, response: SpeciesHintResponse) {
    setSession((current) => ({
      ...current,
      speciesObservations: [
        ...current.speciesObservations.filter((item) => !(item.speciesId === speciesId && item.hintId === hintId)),
        {
          id: `species-observation:${speciesId}:${hintId}`,
          specimenId: current.specimen.specimenId,
          speciesId,
          hintId,
          response,
          certainty: response === 'matches' || response === 'does_not_match' ? 'certain' : 'tentative',
        },
      ],
    }))
  }

  function changeSpeciesCertainty(speciesId: string, hintId: string, certainty: ObservationCertainty) {
    setSession((current) => ({ ...current, speciesObservations: current.speciesObservations.map((item) => item.speciesId === speciesId && item.hintId === hintId ? { ...item, certainty } : item) }))
  }

  function removeSpeciesObservation(speciesId: string, hintId: string) {
    setSession((current) => ({ ...current, speciesObservations: current.speciesObservations.filter((item) => !(item.speciesId === speciesId && item.hintId === hintId)) }))
  }

  function nextQuestion() {
    setActiveCharacterId(null)
    setActiveQuestionSource(null)
    setScreen('question')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function chooseQuestion(value: string) {
    const [source, characterId] = value.split('|') as ['lucid' | 'schubert', string]
    setActiveQuestionSource(source); setActiveCharacterId(characterId)
  }

  function followKey(branchIndex: number) {
    if (!keyNode || keyNode.kind !== 'question') return
    setSession((current) => ({ ...current, publishedKeyHistory: [...current.publishedKeyHistory, { nodeId: keyNode.id, branchIndex }] }))
  }

  function saveNow() {
    const saved = { ...session, updatedAt: new Date().toISOString() }
    const backupSaved = writeLocalValue(SESSION_STORAGE_KEY, JSON.stringify(saved))
    void saveIndexedSession(saved).then((result) => {
      setStorageWarning(result.persisted ? '' : backupSaved ? 'Durable storage failed. A browser backup was saved; export this session for safety.' : 'Session not saved: browser storage is unavailable. Export this session now.')
      setSavedPulse(result.persisted || backupSaved)
      window.setTimeout(() => setSavedPulse(false), 1600)
    })
  }

  function restart() {
    if (!window.confirm('Start a new identification? Your current session can be exported first.')) return
    setSession(freshSession())
    setActiveCharacterId(null); setActiveQuestionSource(null); setSelectedCandidateId(null); setComparisonIds([]); setScreen('question')
  }

  function exportSession() {
    if (!data) return
    const blob = new Blob([sessionExport(session, data.scientific.packageVersion)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `salticidae-identification-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function importSession(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const restored = restoreSessionExport(await file.text())
      if (!restored) throw new Error('This is not a supported Salticidae session export.')
      if (!domain) throw new Error('The scientific package is not ready yet.')
      const referenceError = sessionReferenceError(restored, domain)
      if (referenceError) throw new Error(`${referenceError} Your current session has not been replaced.`)
      setSession(restored)
      setActiveCharacterId(null); setActiveQuestionSource(null); setSelectedCandidateId(null); setComparisonIds([])
      setImportMessage('Observations restored and checked against the loaded package. Results are evaluated using the currently loaded rules; the original version record is retained, not automatically replayed.')
    } catch (error) { setImportMessage(error instanceof Error ? error.message : 'Session import failed.') }
  }

  function toggleComparison(id: string) {
    const adding = !comparisonIds.includes(id)
    setComparisonIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 4 ? [...current, id] : current)
    if (adding && comparisonIds.length < 4) setScreen('compare')
  }

  if (loadError) return <StatusScreen title="The identification tool could not open" detail={loadError} error />
  if (!data || !domain || !evaluation || !schubertEvaluation || !reconciled || !speciesEvaluation || !ui || !hydrated) return <StatusScreen title="Opening the genus guide…" detail="Preparing the scientific package and your saved work." />
  if (new URLSearchParams(window.location.search).get('illustration-audit') === 'schubert') return <SchubertIllustrationAudit characters={domain.schubert.characters} states={domain.schubert.states} />
  if (!session.contextStarted) return <ContextStart onStart={(sex) => { updateContext('sex', sex); setScreen('question') }} />

  const activeCount = evaluation.activeObservationIds.length + schubertEvaluation.activeObservationIds.length
  const viable = evaluation.candidates.filter((candidate) => candidate.band !== 'contradicted')
  const candidateResults = evaluation.candidates.filter((candidate) => candidate.taxon.label.toLowerCase().includes(candidateSearch.toLowerCase()))
  const shownCandidates = showAllCandidates ? candidateResults : candidateResults.filter((candidate) => candidate.band !== 'contradicted').slice(0, 16)

  return <div className="app-shell">
    <header className="app-header">
      <button className="brand" onClick={() => setScreen('question')}><span className="brand-mark"><Bug size={20} /></span><span><b>Australian Salticidae</b><small>Genus identification</small></span></button>
      <div className="header-actions"><span className={`offline-indicator ${offlineStatus.coreReady ? 'ready' : ''}`} title={offlineStatus.message}>{offlineStatus.online ? <Wifi /> : <WifiOff />}<span>{offlineStatus.coreReady ? 'Offline ready' : 'Online only'}</span></span><span className={`save-state ${savedPulse ? 'saved' : ''}`} aria-live="polite">{storageWarning ? <CircleAlert size={14} /> : <Check size={14} />} {storageWarning ? 'Export recommended' : savedPulse ? 'Saved now' : 'Saved locally'}</span><button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={`Use ${theme === 'light' ? 'dark' : 'light'} theme`}>{theme === 'light' ? <Moon /> : <Sun />}</button></div>
    </header>

    {(session.migration.source === 'legacy-v1' || session.legacyHistory.length > 0) && migrationOpen && <MigrationNotice session={session} onClose={() => setMigrationOpen(false)} onExport={exportSession} />}
    {storageWarning && <aside className="migration-notice" role="alert"><CircleAlert /><p>{storageWarning}</p><button onClick={exportSession}><Download /> Export recovery file</button></aside>}
    {session.packagePin && (session.packagePin.scientificPackageVersion !== data.scientific.packageVersion || session.packagePin.genusEngineVersion !== REVIEWED_POLICY.version || session.packagePin.schubertPolicyVersion !== SCHUBERT_POLICY_VERSION || session.packagePin.speciesPolicyVersion !== SPECIES_POLICY_VERSION) && <aside className="migration-notice" role="status"><Info /><p>This session records an older scientific package or rule version. These results use the currently loaded rules, not a reproduction of the original result. Export preserves the original version record.</p><button onClick={exportSession}><Download /> Export record</button></aside>}

    <nav className="mobile-nav" aria-label="Identification sections">
      <NavButton active={screen === 'question'} icon={<Sparkles />} label="Question" onClick={() => setScreen('question')} />
      <NavButton active={screen === 'evidence'} icon={<ListChecks />} label="Evidence" count={session.observations.length + session.schubertObservations.length} onClick={() => setScreen('evidence')} />
      <NavButton active={screen === 'compare'} icon={<FlaskConical />} label="Results" count={viable.length} onClick={() => setScreen('compare')} />
      <NavButton active={screen === 'context'} icon={<Beaker />} label="Specimen" onClick={() => setScreen('context')} />
    </nav>

    <main className="workspace">
      <aside className="side-panel">
        <ProgressSummary active={activeCount} suspended={evaluation.suspended.length} viable={viable.length} total={evaluation.candidates.length} />
        <ContextSummary session={session} onOpen={() => setScreen('context')} />
        <ObservationList session={session} domain={domain.genus} schubert={{ characters: domain.schubert.characters, states: domain.schubert.states }} onEdit={(id) => { setActiveQuestionSource('lucid'); setActiveCharacterId(id); setScreen('question') }} onEditSchubert={(id) => { setActiveQuestionSource('schubert'); setActiveCharacterId(id); setScreen('question') }} onRemove={removeObservation} onRemoveSchubert={removeSchubertObservation} />
        <div className="session-actions"><button onClick={saveNow}><Save /> Save progress</button><button onClick={exportSession}><Download /> Export</button><button onClick={() => importRef.current?.click()}><Upload /> Import</button><button className="quiet" onClick={restart}><RotateCcw /> New ID</button><input ref={importRef} type="file" accept="application/json,.json" hidden onChange={importSession} /></div>
      </aside>

      <section className="main-panel">
        {screen === 'question' && <>
          <QuestionPicker questions={questionPool} selected={selectedQuestion} genus={domain.genus} schubert={domain.schubert} onChoose={chooseQuestion} />
          {selectedQuestion?.source === 'lucid' && <QuestionFlow character={currentCharacter} observation={currentObservation} states={domain.genus.states} meta={currentCharacter ? ui.meta(currentCharacter) : null} utility={selectedQuestion} stateIllustration={ui.stateIllustration} candidateCount={viable.length} workMode={session.workMode} expertMode={session.expertMode} onMode={(workMode) => setSession((current) => ({ ...current, workMode }))} onExpert={(expertMode) => setSession((current) => ({ ...current, expertMode }))} onToggleState={recordStates} onCertainty={changeCertainty} onDisposition={recordDisposition} onNext={nextQuestion} onEvidence={() => setScreen('evidence')} />}
          {selectedQuestion?.source === 'schubert' && <SchubertQuestionFlow character={currentSchubertCharacter} observation={currentSchubertObservation} states={domain.schubert.states} utility={selectedQuestion} candidateCount={viable.length} onToggleState={recordSchubertStates} onCertainty={changeSchubertCertainty} onDisposition={recordSchubertDisposition} onNext={nextQuestion} />}
          {!selectedQuestion && <ContextOrStop session={session} onContext={() => setScreen('context')} onEvidence={() => setScreen('evidence')} />}
          {session.expertMode && <PublishedKeyResolver node={keyNode} available={keyAvailability(session.specimen)} onBranch={followKey} onReset={() => setSession((current) => ({ ...current, publishedKeyHistory: [] }))} />}
        </>}
        {screen === 'evidence' && <EvidenceReview session={session} evaluation={evaluation} domain={domain.genus} schubert={{ characters: domain.schubert.characters, states: domain.schubert.states }} schubertEvaluation={schubertEvaluation!} onEdit={(id) => { setActiveQuestionSource('lucid'); setActiveCharacterId(id); setScreen('question') }} onEditSchubert={(id) => { setActiveQuestionSource('schubert'); setActiveCharacterId(id); setScreen('question') }} onRemove={removeObservation} onRemoveSchubert={removeSchubertObservation} />}
        {screen === 'compare' && <><ComparisonPanel candidates={evaluation.candidates} selectedIds={comparisonIds} reconciled={reconciled} onToggle={toggleComparison} onOpen={setSelectedCandidateId} /><SpeciesSuggestionPanel evaluation={speciesEvaluation} observations={session.speciesObservations} enabled={session.speciesSuggestionsEnabled} sex={session.specimen.sex} workMode={session.workMode} onToggle={(enabled) => setSession((current) => ({ ...current, speciesSuggestionsEnabled: enabled }))} onRecord={recordSpeciesHint} onCertainty={changeSpeciesCertainty} onRemove={removeSpeciesObservation} /></>}
        {screen === 'context' && <ContextPanel session={session} evaluation={evaluation} offlineStatus={offlineStatus} storageUsage={storageUsage} storageWarning={storageWarning} importMessage={importMessage} onCheckUpdate={checkForOfflineUpdate} onRollback={rollbackOfflinePackage} onExport={exportSession} onImport={() => importRef.current?.click()} onContext={updateContext} onMode={(workMode) => setSession((current) => ({ ...current, workMode }))} onBack={() => setScreen('question')} />}
      </section>

      <aside className={`results-panel screen-${screen}`}>
        <header><div><span className="eyebrow">Historical genus results</span><h2>{activeCount ? `${viable.length} without a strong conflict` : 'Ready for observations'}</h2></div><label className="search"><Search /><input aria-label="Find genus" value={candidateSearch} onChange={(event) => setCandidateSearch(event.target.value)} placeholder="Find genus" /></label></header>
        <p className="results-note"><Info /> Results describe compatibility with represented historical Lucid genus evidence. They are not probabilities, and missing or undescribed taxa may be outside this source.</p>
        <div className="candidate-stack">{shownCandidates.map((candidate) => <CandidateCard key={candidate.taxon.id} candidate={candidate} rank={evaluation.candidates.indexOf(candidate) + 1} reconciliation={historicalFor(reconciled, candidate.taxon.id)} concepts={conceptsFor(reconciled, candidate.taxon.id)} selected={comparisonIds.includes(candidate.taxon.id)} onCompare={() => toggleComparison(candidate.taxon.id)} onOpen={() => setSelectedCandidateId(candidate.taxon.id)} />)}</div>
        <button className="show-all" onClick={() => setShowAllCandidates(!showAllCandidates)}>{showAllCandidates ? 'Show leading candidates' : `Browse all ${evaluation.candidates.length} historical genera`} <ChevronDown /></button>
      </aside>
    </main>

    <footer><span>Genus first · source uncertainty stays visible</span><span>Scientific package {data.scientific.packageVersion}</span></footer>
    {selectedCandidate && <CandidateDetail candidate={selectedCandidate} reconciliation={historicalFor(reconciled, selectedCandidate.taxon.id)} concepts={conceptsFor(reconciled, selectedCandidate.taxon.id)} ui={ui} facts={data.facts} onClose={() => setSelectedCandidateId(null)} />}
  </div>
}

function SchubertIllustrationAudit({ characters, states }: { characters: SchubertCharacter[]; states: SchubertState[] }) {
  return <main className="illustration-audit"><header><span className="eyebrow">Private visual QA view</span><h1>Schubert discriminator illustrations</h1><p>All 44 characters and 139 states. These are comparative explanatory schematics, not specimen images.</p></header>{characters.map((character) => <section key={character.id}><h2>{character.packetId} · {character.label}</h2><p>{character.description}</p><div className="state-choices">{character.stateIds.map((stateId) => { const state = states.find((item) => item.id === stateId)!; return <article className="state-choice" key={stateId}><StateIllustration characterId={character.packetId} stateId={state.packetId} characterLabel={character.label} stateLabel={state.label} anatomicalRegion={character.anatomicalRegion} /><span className="choice-label"><b>{state.packetId} · {state.label}</b></span></article> })}</div></section>)}</main>
}

function buildUiIndexes(data: AppData, characters: GenusCharacter[], states: GenusState[]) {
  type SchemaRecord = { id: string; original_id: number; name: string; group_id?: string }
  const snapshots = data.scientific.rawSnapshots as Record<string, { features: SchemaRecord[]; states: SchemaRecord[]; taxa: SchemaRecord[]; feature_groups: SchemaRecord[] }>
  const schema = snapshots['01_lucid_schema.json']
  const featureOriginal = new Map(schema.features.map((item) => [item.id, item.original_id]))
  const stateOriginal = new Map(schema.states.map((item) => [item.id, item.original_id]))
  const taxonOriginal = new Map(schema.taxa.map((item) => [item.id, item.original_id]))
  const groupOriginal = new Map(schema.feature_groups.map((item) => [item.id, item.original_id]))
  const characterById = new Map(characters.map((item) => [item.id, item]))
  const stateById = new Map(states.map((item) => [item.id, item]))
  const legacyTaxon = (packetId: string) => data.key.taxa.find((item) => item.id === taxonOriginal.get(packetId))
  const factSheet = (packetId: string) => data.facts.sheets.find((item) => item.entity_id === taxonOriginal.get(packetId))
  const stateIllustration = (state: GenusState) => {
    const legacyId = stateOriginal.get(state.packetId)
    const sourceState = data.key.states.find((item) => item.id === legacyId)
    const media = sourceState?.images?.[0] ?? (legacyId ? data.key.curated_state_media?.records[String(legacyId)]?.[0] : undefined)
    return media ? { url: mediaUrl(media.path), caption: plainCaption(media.caption) } : null
  }
  const meta = (character: GenusCharacter) => {
    const originalId = featureOriginal.get(character.packetId)
    const legacy = data.key.features.find((item) => item.id === originalId)
    const groupId = groupOriginal.get(character.groupPacketId)
    const group = groupId ? data.curated.group_defaults[String(groupId)] : undefined
    const override = originalId ? data.curated.feature_overrides[String(originalId)] : undefined
    return { difficulty: override?.difficulty ?? group?.difficulty ?? 3, methods: group?.methods ?? ['visual inspection'], groupLabel: group?.label ?? legacy?.name ?? 'Morphology' }
  }
  return { characterById, stateById, legacyTaxon, factSheet, stateIllustration, meta }
}

type UiIndexes = ReturnType<typeof buildUiIndexes>
function historicalFor(reconciled: ReconciledGenusEvaluation, taxonId: string) { return reconciled.historical.find((item) => item.sourceEntityId === taxonId) }
function conceptsFor(reconciled: ReconciledGenusEvaluation, taxonId: string) { return reconciled.concepts.filter((item) => item.historicalRoutes.some((route) => route.sourceEntityId === taxonId)) }

function StatusScreen({ title, detail, error = false }: { title: string; detail: string; error?: boolean }) {
  return <main className="status-screen"><div className={`brand-mark large ${error ? 'error' : ''}`}><Bug /></div><h1>{title}</h1><p>{detail}</p></main>
}

function ContextStart({ onStart }: { onStart: (sex: Sex) => void }) {
  return <main className="context-start"><section><span className="eyebrow">New identification</span><h1>Start with what you know.</h1><p>Sex changes which characters can be used. Choose “not sure” when it is unknown—the app will not assume male or female anatomy.</p><div className="start-options"><button onClick={() => onStart('male')}><span>♂</span><b>Male</b><small>Use male and shared characters</small><ChevronRight /></button><button onClick={() => onStart('female')}><span>♀</span><b>Female</b><small>Use female and shared characters</small><ChevronRight /></button><button onClick={() => onStart('unknown')}><CircleHelp /><b>Not sure</b><small>Use shared characters only</small><ChevronRight /></button></div><p className="start-assurance"><Check /> Every answer and context choice can be revised.</p></section><aside><Bug /><h2>Genus comes first</h2><p>The guide compares observations with historical genus evidence, then shows reviewed routes to contemporary concepts separately.</p></aside></main>
}

function MigrationNotice({ session, onClose, onExport }: { session: IdentificationSession; onClose: () => void; onExport: () => void }) {
  return <aside className="migration-notice"><Info /><div><b>Previous session migrated</b><span>{session.migration.message}</span>{session.legacyHistory.length > 0 && <small>Unconverted records remain in this session’s export; they were not used as evidence.</small>}</div><button onClick={onExport}><Download /> Export record</button><button className="icon-button" onClick={onClose} aria-label="Dismiss migration notice"><X /></button></aside>
}

function NavButton({ active, icon, label, count, onClick }: { active: boolean; icon: ReactNode; label: string; count?: number; onClick: () => void }) {
  return <button className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} onClick={onClick}>{icon}<span>{label}</span>{count != null && <small>{count}</small>}</button>
}

function ProgressSummary({ active, suspended, viable, total }: { active: number; suspended: number; viable: number; total: number }) {
  return <section className="summary-card" aria-live="polite"><span className="eyebrow">Identification progress</span><div className="result-count"><strong>{viable}</strong><span>of {total} genera without<br />a strong conflict</span></div><div className="summary-stats"><span><b>{active}</b> active clues</span><span><b>{suspended}</b> paused</span></div></section>
}

function ContextSummary({ session, onOpen }: { session: IdentificationSession; onOpen: () => void }) {
  return <button className="context-summary" onClick={onOpen}><span className="specimen-avatar">{session.specimen.sex === 'male' ? '♂' : session.specimen.sex === 'female' ? '♀' : '?'}</span><span><b>{session.specimen.sex === 'unknown' ? 'Sex not known' : `${session.specimen.sex} specimen`}</b><small>{session.specimen.lifeStage} · {session.workMode} equipment</small></span><ChevronRight /></button>
}

function ObservationList({ session, domain, schubert, onEdit, onEditSchubert, onRemove, onRemoveSchubert }: { session: IdentificationSession; domain: { characters: GenusCharacter[]; states: GenusState[] }; schubert: { characters: SchubertCharacter[]; states: SchubertState[] }; onEdit: (id: string) => void; onEditSchubert: (id: string) => void; onRemove: (id: string) => void; onRemoveSchubert: (id: string) => void }) {
  const label = (observation: GenusObservation) => observation.disposition !== 'observed' ? observation.disposition.replace('_', ' ') : observation.stateIds.map((id) => domain.states.find((item) => item.id === id)?.label).filter(Boolean).join(' or ')
  const schubertLabel = (observation: GenusObservation) => observation.disposition !== 'observed' ? observation.disposition.replace('_', ' ') : observation.stateIds.map((id) => schubert.states.find((item) => item.id === id)?.label).filter(Boolean).join(' or ')
  const count = session.observations.length + session.schubertObservations.length
  return <section className="observation-list"><header><span className="eyebrow">Observation log</span><b>{count}</b></header>{count === 0 ? <p>Your answers will collect here for review.</p> : <>{session.observations.map((observation) => <article key={observation.id}><button onClick={() => onEdit(observation.characterId)}><b>{domain.characters.find((item) => item.id === observation.characterId)?.label}</b><small>{label(observation)}</small></button><button className="remove" onClick={() => onRemove(observation.characterId)} aria-label="Remove observation"><X /></button></article>)}{session.schubertObservations.map((observation) => <article key={observation.id}><button onClick={() => onEditSchubert(observation.characterId)}><b>{schubert.characters.find((item) => item.id === observation.characterId)?.label}</b><small>Schubert · {schubertLabel(observation)}</small></button><button className="remove" onClick={() => onRemoveSchubert(observation.characterId)} aria-label="Remove Schubert observation"><X /></button></article>)}</>}</section>
}

function QuestionFlow({ character, observation, states, meta, utility, stateIllustration, candidateCount, workMode, expertMode, onMode, onExpert, onToggleState, onCertainty, onDisposition, onNext, onEvidence }: {
  character?: GenusCharacter; observation?: GenusObservation; states: GenusState[]; meta: ReturnType<UiIndexes['meta']> | null; utility: { explanation: string; utility: number }; stateIllustration: (state: GenusState) => { url: string; caption?: string } | null; candidateCount: number; workMode: WorkMode; expertMode: boolean; onMode: (mode: WorkMode) => void; onExpert: (value: boolean) => void; onToggleState: (character: GenusCharacter, stateId: string) => void; onCertainty: (characterId: string, value: ObservationCertainty) => void; onDisposition: (character: GenusCharacter, value: 'not_sure' | 'cannot_see' | 'skipped') => void; onNext: () => void; onEvidence: () => void
}) {
  if (!character || !meta) return <div className="empty-state"><ClipboardCheck /><span className="eyebrow">Useful stopping point</span><h1>No more questions are available in this equipment mode.</h1><p>Review the evidence, switch equipment mode, or stop with a ranked set. An unresolved result is valid.</p><button className="primary" onClick={onEvidence}>Review evidence <ArrowRight /></button></div>
  const observed = observation?.disposition === 'observed' ? observation : undefined
  return <div className="question-flow"><div className="flow-toolbar"><div className="segmented" aria-label="Available equipment"><button className={workMode === 'field' ? 'active' : ''} onClick={() => onMode('field')}><EyeOff /> Field / photo</button><button className={workMode === 'microscope' ? 'active' : ''} onClick={() => onMode('microscope')}><Microscope /> Microscope</button></div><label className="expert-toggle"><input type="checkbox" checked={expertMode} onChange={(event) => onExpert(event.target.checked)} /><span>Show expert detail</span></label></div><article className="question-card"><header><div><span className="eyebrow">Lucid observation · {meta.groupLabel}</span><h1>{character.label}</h1><p>{meta.methods.join(' · ')} · effort {meta.difficulty}/5</p></div><span className="candidate-pill">{candidateCount} remain compatible</span></header><details className="why-question" open={expertMode}><summary><CircleHelp /> Why this question?<ChevronDown /></summary><p>{utility.explanation} Utility is comparative guidance, not a probability.</p></details><div className="state-choices">{character.stateIds.map((stateId) => { const state = states.find((item) => item.id === stateId)!; const selected = observed?.stateIds.includes(stateId) ?? false; const illustration = stateIllustration(state); return <button className={`state-choice ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={() => onToggleState(character, stateId)} key={stateId}><StateIllustration characterId={character.packetId} stateId={state.packetId} characterLabel={character.label} stateLabel={state.label} anatomicalRegion={meta.groupLabel} imageUrl={illustration?.url} imageCaption={illustration?.caption} /><span className="choice-label"><i>{selected && <Check />}</i><b>{state.label}</b></span></button> })}</div><AnatomyReference characterLabel={character.label} anatomicalRegion={meta.groupLabel} />{observed && <div className="certainty"><div><b>How sure are you?</b><span>This changes contradiction strength, not a probability.</span></div><div>{(['certain', 'fairly_sure', 'tentative'] as const).map((certainty) => <button className={observed.certainty === certainty ? 'active' : ''} onClick={() => onCertainty(character.id, certainty)} key={certainty}>{certainty === 'fairly_sure' ? 'Fairly sure' : certainty === 'tentative' ? 'Tentative' : 'Certain'}</button>)}</div></div>}<div className="question-actions"><div><button onClick={() => onDisposition(character, 'not_sure')}>Not sure</button><button onClick={() => onDisposition(character, 'cannot_see')}>Can’t see it</button><button onClick={() => onDisposition(character, 'skipped')}>Skip</button></div>{observed && <button className="primary" onClick={onNext}>Record & continue <ArrowRight /></button>}</div></article></div>
}

type RankedQuestion = { source: 'lucid' | 'schubert'; characterId: string; utility: number; effort: number; explanation: string }

function QuestionPicker({ questions, selected, genus, schubert, onChoose }: { questions: RankedQuestion[]; selected?: RankedQuestion; genus: { characters: GenusCharacter[] }; schubert: { characters: SchubertCharacter[] }; onChoose: (value: string) => void }) {
  if (!questions.length) return null
  const displayQuestions = selected && !questions.some((item) => item.source === selected.source && item.characterId === selected.characterId) ? [selected, ...questions] : questions
  const label = (question: RankedQuestion) => question.source === 'lucid'
    ? genus.characters.find((item) => item.id === question.characterId)?.label
    : schubert.characters.find((item) => item.id === question.characterId)?.label
  return <div className="question-picker"><label htmlFor="question-choice"><Route /> Choose another useful question</label><select id="question-choice" value={`${selected?.source}|${selected?.characterId}`} onChange={(event) => onChoose(event.target.value)}>{displayQuestions.map((question, index) => <option key={`${question.source}:${question.characterId}`} value={`${question.source}|${question.characterId}`}>{index === 0 && question.utility > 0 ? 'Recommended: ' : ''}{label(question)} · {question.source === 'lucid' ? 'Lucid' : 'Schubert'} · effort {question.effort}/5</option>)}</select></div>
}

function SchubertQuestionFlow({ character, observation, states, utility, candidateCount, onToggleState, onCertainty, onDisposition, onNext }: { character?: SchubertCharacter; observation?: GenusObservation; states: SchubertState[]; utility: RankedQuestion; candidateCount: number; onToggleState: (character: SchubertCharacter, stateId: string) => void; onCertainty: (characterId: string, value: ObservationCertainty) => void; onDisposition: (character: SchubertCharacter, value: 'not_sure' | 'cannot_see' | 'skipped') => void; onNext: () => void }) {
  if (!character) return null
  const observed = observation?.disposition === 'observed' ? observation : undefined
  return <div className="question-flow"><article className="question-card schubert-card"><header><div><span className="eyebrow">Reviewed Schubert assertion · {character.anatomicalRegion}</span><h1>{character.label}</h1><p>Effort {character.cost.effort}/5 · {character.cost.errorRisk} error risk · curator/product cost judgment</p></div><span className="candidate-pill">{candidateCount} historical genera remain</span></header><details className="why-question"><summary><CircleHelp /> Why this question?<ChevronDown /></summary><p>{utility.explanation} Missing assertions remain unscored, and overlapping states are not treated as probabilities.</p></details><p className="source-description">{character.description}</p><div className="state-choices">{character.stateIds.map((stateId) => { const state = states.find((item) => item.id === stateId)!; const selected = observed?.stateIds.includes(stateId) ?? false; return <button className={`state-choice ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={() => onToggleState(character, stateId)} key={stateId}><StateIllustration characterId={character.packetId} stateId={state.packetId} characterLabel={character.label} stateLabel={state.label} anatomicalRegion={character.anatomicalRegion} /><span className="choice-label"><i>{selected && <Check />}</i><b>{state.label}</b></span></button> })}</div><AnatomyReference characterLabel={character.label} anatomicalRegion={character.anatomicalRegion} />{observed && <div className="certainty"><div><b>How sure are you?</b><span>Low certainty yields qualified support.</span></div><div>{(['certain', 'fairly_sure', 'tentative'] as const).map((certainty) => <button className={observed.certainty === certainty ? 'active' : ''} onClick={() => onCertainty(character.id, certainty)} key={certainty}>{certainty === 'fairly_sure' ? 'Fairly sure' : certainty === 'tentative' ? 'Tentative' : 'Certain'}</button>)}</div></div>}<div className="question-actions"><div><button onClick={() => onDisposition(character, 'not_sure')}>Not sure</button><button onClick={() => onDisposition(character, 'cannot_see')}>Can’t see it</button><button onClick={() => onDisposition(character, 'skipped')}>Skip</button></div>{observed && <button className="primary" onClick={onNext}>Record & continue <ArrowRight /></button>}</div></article></div>
}

function ContextOrStop({ session, onContext, onEvidence }: { session: IdentificationSession; onContext: () => void; onEvidence: () => void }) {
  const needsContext = session.specimen.sex === 'unknown' || session.specimen.lifeStage === 'unknown'
  return <div className="empty-state"><ClipboardCheck /><span className="eyebrow">Useful stopping point</span><h1>{needsContext ? 'Specimen context could unlock safer questions.' : 'No further useful question is available.'}</h1><p>{needsContext ? 'Sex and life stage can have indirect value by making scoped characters applicable. “Not sure” remains a valid answer.' : 'Stop with a ranked set, review evidence, or change equipment. An unresolved result is valid.'}</p><button className="primary" onClick={needsContext ? onContext : onEvidence}>{needsContext ? 'Review specimen context' : 'Review evidence'} <ArrowRight /></button></div>
}

function PublishedKeyResolver({ node, available, onBranch, onReset }: { node: ReturnType<typeof publishedKeyNode> | null; available: { available: boolean; reason: string }; onBranch: (index: number) => void; onReset: () => void }) {
  return <section className="published-key"><header><div><span className="eyebrow">Expert reference</span><h2>Published adult-male Saitis-group resolver</h2></div><button onClick={onReset}><RotateCcw /> Restart resolver</button></header><p><Info /> {available.reason} It preserves the source’s exact branch logic and does not convert paths into universal genus profiles.</p>{available.available && node?.kind === 'question' && <><h3>Couplet {node.couplet}</h3><div className="key-branches">{node.branches.map((branch, index) => <button onClick={() => onBranch(index)} key={`${node.id}:${index}`}><b>{branch.match === 'all' ? 'All conditions together' : branch.match === 'any' ? 'Either alternative' : 'Choose this lead'}</b><span>{branch.verbatimLead}</span></button>)}</div><small>Schubert thesis p. {node.sourcePage}</small></>}{available.available && node?.kind === 'terminal' && <div className="key-terminal"><Check /><div><span>Scoped key result</span><h3>{node.verbatimResult}</h3><p>This adds independent adult-male key support. It does not exclude every other concept.</p></div></div>}</section>
}

function EvidenceReview({ session, evaluation, domain, schubert, schubertEvaluation, onEdit, onEditSchubert, onRemove, onRemoveSchubert }: { session: IdentificationSession; evaluation: ReturnType<typeof evaluateGenusIdentification>; domain: { characters: GenusCharacter[]; states: GenusState[] }; schubert: { characters: SchubertCharacter[]; states: SchubertState[] }; schubertEvaluation: ReturnType<typeof evaluateSchubertEvidence>; onEdit: (id: string) => void; onEditSchubert: (id: string) => void; onRemove: (id: string) => void; onRemoveSchubert: (id: string) => void }) {
  const active = new Set(evaluation.activeObservationIds)
  const schubertActive = new Set(schubertEvaluation.activeObservationIds)
  const total = session.observations.length + session.schubertObservations.length
  return <div className="page-panel"><header className="page-heading"><span className="eyebrow">Evidence review</span><h1>Every answer stays revisable.</h1><p>Lucid and Schubert evidence retain separate source identities. Paused observations stay saved.</p></header>{total === 0 ? <div className="empty-inline">No observations recorded yet.</div> : <div className="evidence-review">{session.observations.map((observation) => { const character = domain.characters.find((item) => item.id === observation.characterId); const suspension = evaluation.suspended.find((item) => item.observation.id === observation.id); const value = observation.disposition === 'observed' ? observation.stateIds.map((id) => domain.states.find((item) => item.id === id)?.label).join(' or ') : observation.disposition.replace('_', ' '); return <article key={observation.id}><div className={`status-icon ${active.has(observation.id) ? 'active' : ''}`}>{active.has(observation.id) ? <Check /> : <EyeOff />}</div><div><span className="eyebrow">Lucid · {active.has(observation.id) ? 'Active evidence' : 'Saved, not scoring'}</span><h3>{character?.label}</h3><p>{value}</p>{suspension?.applicability && <small>{suspension.applicability.reason}</small>}</div><div className="review-actions"><button onClick={() => onEdit(observation.characterId)}>Revise</button><button onClick={() => onRemove(observation.characterId)}>Remove</button></div></article> })}{session.schubertObservations.map((observation) => { const character = schubert.characters.find((item) => item.id === observation.characterId); const value = observation.disposition === 'observed' ? observation.stateIds.map((id) => schubert.states.find((item) => item.id === id)?.label).join(' or ') : observation.disposition.replace('_', ' '); const suspension = schubertEvaluation.suspended.find((item) => item.observation.id === observation.id); return <article key={observation.id}><div className={`status-icon ${schubertActive.has(observation.id) ? 'active' : ''}`}>{schubertActive.has(observation.id) ? <Check /> : <EyeOff />}</div><div><span className="eyebrow">Schubert · {schubertActive.has(observation.id) ? 'Active support evidence' : 'Saved, not scoring'}</span><h3>{character?.label}</h3><p>{value}</p>{suspension && <small>{suspension.reason}</small>}</div><div className="review-actions"><button onClick={() => onEditSchubert(observation.characterId)}>Revise</button><button onClick={() => onRemoveSchubert(observation.characterId)}>Remove</button></div></article> })}</div>}{session.legacyHistory.length > 0 && <details className="legacy-history"><summary>Unconverted legacy history ({session.legacyHistory.length})</summary><p>These old records are retained for audit/export but do not affect ranking because a persistent identity could not be recovered.</p></details>}</div>
}

function ContextPanel({ session, evaluation, offlineStatus, storageUsage, storageWarning, importMessage, onCheckUpdate, onRollback, onExport, onImport, onContext, onMode, onBack }: { session: IdentificationSession; evaluation: ReturnType<typeof evaluateGenusIdentification>; offlineStatus: OfflineStatus; storageUsage: { usage?: number; quota?: number } | null; storageWarning: string; importMessage: string; onCheckUpdate: () => void; onRollback: () => void; onExport: () => void; onImport: () => void; onContext: (field: 'sex' | 'lifeStage' | 'preparation', value: Sex | LifeStage | PreparationState) => void; onMode: (mode: WorkMode) => void; onBack: () => void }) {
  const storageCopy = storageUsage?.usage != null && storageUsage.quota ? `${(storageUsage.usage / 1048576).toFixed(1)} MB of ${(storageUsage.quota / 1048576).toFixed(0)} MB browser storage in use.` : 'Storage usage is not reported by this browser.'
  return <div className="page-panel context-panel"><button className="back" onClick={onBack}><ArrowLeft /> Back to question</button><header className="page-heading"><span className="eyebrow">Specimen context</span><h1>Tell the guide what can apply.</h1><p>Changing context pauses incompatible observations without deleting them.</p></header><ContextChoice label="Sex" value={session.specimen.sex} options={[['male', 'Male'], ['female', 'Female'], ['unknown', 'Not sure']]} onChange={(value) => onContext('sex', value as Sex)} /><ContextChoice label="Life stage" value={session.specimen.lifeStage} options={[['adult', 'Adult'], ['juvenile', 'Juvenile'], ['unknown', 'Not sure']]} onChange={(value) => onContext('lifeStage', value as LifeStage)} />{session.specimen.sex !== 'male' && <ContextChoice label="Epigyne preparation" value={session.specimen.preparation.epigyneCleared} options={[['yes', 'Cleared'], ['no', 'Not cleared'], ['unknown', 'Not sure']]} onChange={(value) => onContext('preparation', value as PreparationState)} />}<ContextChoice label="Available equipment" value={session.workMode} options={[['field', 'Field / photo'], ['microscope', 'Microscope']]} onChange={(value) => onMode(value as WorkMode)} />{evaluation.suspended.length > 0 && <p className="context-impact"><Info /> {evaluation.suspended.length} saved observation{evaluation.suspended.length === 1 ? ' is' : 's are'} currently paused by context or abstention.</p>}<OfflinePanel session={session} status={offlineStatus} storageCopy={storageCopy} message={storageWarning || importMessage} onCheckUpdate={onCheckUpdate} onRollback={onRollback} onExport={onExport} onImport={onImport} /></div>
}

function OfflinePanel({ session, status, storageCopy, message, onCheckUpdate, onRollback, onExport, onImport }: { session: IdentificationSession; status: OfflineStatus; storageCopy: string; message: string; onCheckUpdate: () => void; onRollback: () => void; onExport: () => void; onImport: () => void }) {
  return <section className="offline-panel"><header><HardDrive /><div><span className="eyebrow">Offline & recovery</span><h2>{status.coreReady ? 'Core guide ready offline' : 'Core guide not verified offline'}</h2></div></header><p>{status.message}</p><dl><div><dt>Device connectivity</dt><dd>{status.online ? 'Browser reports online' : 'Browser reports offline'}</dd></div><div><dt>Core package</dt><dd>{status.activePackageId ?? 'Not installed'}</dd></div><div><dt>Optional media</dt><dd>Local-only; no distributable pack installed</dd></div><div><dt>Durable storage</dt><dd>{status.storagePersistent === true ? 'Granted' : status.storagePersistent === false ? 'Not granted — export recommended' : 'Not supported/reported'}</dd></div></dl><small>{storageCopy}</small>{session.packagePin && <small>Session pinned to scientific package {session.packagePin.scientificPackageVersion}{session.packagePin.offlinePackageId ? ` and core ${session.packagePin.offlinePackageId}` : ''}.</small>}{message && <p className="storage-message" role="status">{message}</p>}<div><button onClick={onCheckUpdate} disabled={status.updateState === 'checking'}>{status.updateState === 'checking' ? 'Verifying…' : 'Verify updates'}</button><button onClick={onRollback} disabled={!status.previousPackageId}>Roll back</button><button onClick={onExport}><Download /> Export recovery file</button><button onClick={onImport}><Upload /> Import session</button></div></section>
}

function ContextChoice({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (value: string) => void }) {
  return <fieldset className="context-choice"><legend>{label}</legend>{options.map(([id, text]) => <button className={value === id ? 'active' : ''} aria-pressed={value === id} onClick={() => onChange(id)} key={id}>{value === id && <Check />}{text}</button>)}</fieldset>
}

function ComparisonPanel({ candidates, selectedIds, reconciled, onToggle, onOpen }: { candidates: CandidateResult[]; selectedIds: string[]; reconciled: ReconciledGenusEvaluation; onToggle: (id: string) => void; onOpen: (id: string) => void }) {
  const selected = candidates.filter((item) => selectedIds.includes(item.taxon.id))
  return <div className="page-panel"><header className="page-heading"><span className="eyebrow">Candidate comparison</span><h1>Compare evidence, not percentages.</h1><p>Select two to four genera from the result cards below. Coverage reports how much of your active evidence is actually scored for each genus.</p><p className="release-caution"><CircleAlert /> This is an open-world aid: missing or undescribed taxa may not be represented. An unresolved result is safer than forced certainty.</p></header>{selected.length < 2 ? <div className="empty-inline"><FlaskConical /><b>Select {2 - selected.length} more candidate{selected.length ? '' : 's'}.</b><span>Use “Compare” on result cards.</span></div> : <div className="comparison-grid">{selected.map((candidate) => <article key={candidate.taxon.id}><button className="remove-compare" onClick={() => onToggle(candidate.taxon.id)} aria-label={`Remove ${genusOnly(candidate.taxon.label)} from comparison`}><X /></button><span className={`band ${candidate.band}`}>{bandCopy[candidate.band].label}</span><h2><i>{genusOnly(candidate.taxon.label)}</i></h2><p>{candidate.explanation}</p><dl><div><dt>Support groups</dt><dd>{candidate.supportGroups + candidate.tentativeSupportGroups}</dd></div><div><dt>Strong conflicts</dt><dd>{candidate.strongContradictions}</dd></div><div><dt>Assessed coverage</dt><dd>{candidate.coverage.assessedObservations} of {candidate.coverage.constrainingObservations}</dd></div></dl><TaxonomySummary historical={historicalFor(reconciled, candidate.taxon.id)} concepts={conceptsFor(reconciled, candidate.taxon.id)} /><button className="text-button" onClick={() => onOpen(candidate.taxon.id)}>Review all evidence <ChevronRight /></button></article>)}</div>}</div>
}

const speciesOutcomeCopy: Record<SpeciesSuggestionResult['outcome'], { label: string; detail: string }> = {
  none: { label: 'No suggestion', detail: 'The selective source profiles do not support a species suggestion in the current scope.' },
  possible: { label: 'Possible', detail: 'Genus and scope allow consideration, but no diagnostic species evidence is confirmed.' },
  plausible: { label: 'Plausible', detail: 'Some applicable source evidence supports this candidate, with important limitations.' },
  strong_candidate: { label: 'Strong candidate', detail: 'Applicable source-diagnostic evidence and selective comparison coverage are satisfied.' },
  diagnostic_if_confirmed: { label: 'Diagnostic if confirmed', detail: 'A specific unresolved observation could materially strengthen this candidate.' },
}

function SpeciesSuggestionPanel({ evaluation, observations, enabled, sex, workMode, onToggle, onRecord, onCertainty, onRemove }: {
  evaluation: SpeciesSuggestionEvaluation
  observations: SpeciesObservation[]
  enabled: boolean
  sex: Sex
  workMode: WorkMode
  onToggle: (enabled: boolean) => void
  onRecord: (speciesId: string, hintId: string, response: SpeciesHintResponse) => void
  onCertainty: (speciesId: string, hintId: string, certainty: ObservationCertainty) => void
  onRemove: (speciesId: string, hintId: string) => void
}) {
  const visible = evaluation.visibleResults
  return <section className="species-panel" aria-labelledby="species-heading">
    <header><div><span className="eyebrow">Optional downstream module</span><h2 id="species-heading">Selective species suggestions</h2><p>Historical and contemporary genus results remain primary and are never changed by this module.</p></div><label className="expert-toggle"><input type="checkbox" checked={enabled} onChange={(event) => onToggle(event.target.checked)} /><span>Enable suggestions</span></label></header>
    <p className="species-coverage"><Info /> {evaluation.coverageNotice}</p>
    {!enabled ? <div className="empty-inline"><EyeOff /><b>Species suggestions are off.</b><span>Your genus ranking and evidence are unchanged.</span></div>
      : visible.length === 0 ? <div className="empty-inline"><CircleHelp /><b>No species suggestion</b><span>No sufficiently supported contemporary genus profile applies yet, or the specimen scope is unsupported.</span></div>
        : <div className="species-results">{visible.map((result) => {
          const copy = speciesOutcomeCopy[result.outcome]
          return <details className={`species-card ${result.outcome}`} key={result.species.id} open={result.outcome === 'strong_candidate' || result.outcome === 'plausible'}><summary><span><em>{copy.label}</em><b><i>{result.species.name}</i></b><small>{copy.detail}</small></span><ChevronDown /></summary><div className="species-card-body"><p>{result.explanation}</p><p className="thesis-status"><CircleAlert /> Thesis proposal only; nomenclatural availability has not been established by this tool.</p><dl><div><dt>Specimen scope</dt><dd>{sex} · {workMode}</dd></div><div><dt>Selective comparison</dt><dd>{result.comparisonCoverage.profiledSpeciesInGenus} profiled species in this genus</dd></div><div><dt>Other placements</dt><dd>{result.comparisonCoverage.otherPlacementsUnscored} unscored, not rejected</dd></div></dl>{result.constraints.length > 0 && <ul className="species-constraints">{result.constraints.map((constraint) => <li key={constraint}>{constraint}</li>)}</ul>}<div className="species-hints">{result.applicableHints.map((hint) => {
            const observation = observations.find((item) => item.speciesId === result.species.id && item.hintId === hint.id)
            return <article key={hint.id}><header><div><span>{hint.confidence.replaceAll('_', ' ')}</span><h3>{hint.label}</h3></div><small>Thesis p. {hint.sourcePage}</small></header><p>{hint.description}</p><div className="hint-requirements">{hint.requiresMicroscopy && <span><Microscope /> Microscope</span>}{hint.requiresGenitalia && <span><FlaskConical /> Genital anatomy</span>}<span>{hint.sex.join(' / ')}</span></div><div className="hint-actions"><button className={observation?.response === 'matches' ? 'active support' : ''} aria-pressed={observation?.response === 'matches'} onClick={() => onRecord(result.species.id, hint.id, 'matches')}><Check /> Matches</button><button className={observation?.response === 'does_not_match' ? 'active conflict' : ''} aria-pressed={observation?.response === 'does_not_match'} onClick={() => onRecord(result.species.id, hint.id, 'does_not_match')}><X /> Does not match</button><button className={observation?.response === 'not_sure' ? 'active' : ''} aria-pressed={observation?.response === 'not_sure'} onClick={() => onRecord(result.species.id, hint.id, 'not_sure')}>Not sure</button><button className={observation?.response === 'cannot_see' ? 'active' : ''} aria-pressed={observation?.response === 'cannot_see'} onClick={() => onRecord(result.species.id, hint.id, 'cannot_see')}>Can’t see</button>{observation && <button className="quiet" onClick={() => onRemove(result.species.id, hint.id)}>Clear</button>}</div>{observation && (observation.response === 'matches' || observation.response === 'does_not_match') && <div className="hint-certainty"><span>Confidence</span>{(['certain', 'fairly_sure', 'tentative'] as const).map((certainty) => <button className={observation.certainty === certainty ? 'active' : ''} onClick={() => onCertainty(result.species.id, hint.id, certainty)} key={certainty}>{certainty === 'fairly_sure' ? 'Fairly sure' : certainty === 'tentative' ? 'Tentative' : 'Certain'}</button>)}</div>}</article>
          })}</div><details className="species-source"><summary>Source limits and localities</summary><p>{result.species.limitations}</p><p>Recorded source localities: {result.species.localities.join('; ')}. Locality is displayed as context only and never scores a suggestion.</p><small>Source pages: {result.species.sourcePages.join(', ')} · {result.species.nomenclaturalStatus.replaceAll('_', ' ')}</small></details></div></details>
        })}</div>}
  </section>
}

function CandidateCard({ candidate, rank, reconciliation, concepts, selected, onCompare, onOpen }: { candidate: CandidateResult; rank: number; reconciliation?: HistoricalReconciliation; concepts: ReconciledGenusEvaluation['concepts']; selected: boolean; onCompare: () => void; onOpen: () => void }) {
  return <article className={`candidate-card ${candidate.band}`}><button className="candidate-main" onClick={onOpen}><span className="rank">{rank}</span><span className="candidate-copy"><span className={`band ${candidate.band}`}>{bandCopy[candidate.band].label}</span><b><i>{genusOnly(candidate.taxon.label)}</i></b><small>{candidate.supportGroups} support group{candidate.supportGroups === 1 ? '' : 's'} · {candidate.strongContradictions} strong conflict{candidate.strongContradictions === 1 ? '' : 's'} · {Math.round(candidate.coverage.ratio * 100)}% assessed coverage</small>{reconciliation && <em>{reconciliation.status === 'unreviewed' ? 'Contemporary mapping not reviewed' : concepts.length ? `${concepts.length} reviewed contemporary route${concepts.length === 1 ? '' : 's'}` : 'Reviewed, destination unresolved'}</em>}</span><ChevronRight /></button><button className={`compare-toggle ${selected ? 'active' : ''}`} onClick={onCompare}>{selected ? <Check /> : <FlaskConical />} {selected ? 'Selected' : 'Compare'}</button></article>
}

function CandidateDetail({ candidate, reconciliation, concepts, ui, facts, onClose }: { candidate: CandidateResult; reconciliation?: HistoricalReconciliation; concepts: ReconciledGenusEvaluation['concepts']; ui: UiIndexes; facts: FactSheetData; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(document.activeElement as HTMLElement | null)
  useEffect(() => {
    closeRef.current?.focus()
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button, summary, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((element) => !element.hasAttribute('disabled'))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', handleKey)
    return () => { window.removeEventListener('keydown', handleKey); returnFocusRef.current?.focus() }
  }, [onClose])
  const legacy = ui.legacyTaxon(candidate.taxon.packetId)
  const sheet = ui.factSheet(candidate.taxon.packetId) ?? facts.sheets.find((item) => item.entity_id === legacy?.id)
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><article ref={dialogRef} className="candidate-detail" role="dialog" aria-modal="true" aria-labelledby="candidate-title" aria-describedby="candidate-summary"><header><div><span className={`band ${candidate.band}`}>{bandCopy[candidate.band].label}</span><h1 id="candidate-title"><i>{genusOnly(candidate.taxon.label)}</i></h1><p>{candidate.taxon.label}</p></div><button ref={closeRef} className="icon-button" onClick={onClose} aria-label="Close"><X /></button></header><p className="band-explanation" id="candidate-summary">{bandCopy[candidate.band].description} {candidate.explanation}</p><TaxonomySummary historical={reconciliation} concepts={concepts} expanded /><section><h2>Evidence from your observations</h2>{candidate.evidence.length ? <div className="candidate-evidence-list">{candidate.evidence.map((evidence) => <article className={evidence.outcome} key={evidence.observationId}><span>{outcomeCopy[evidence.outcome]}</span><div><b>{ui.characterById.get(evidence.characterId)?.label}</b><p>{evidence.stateIds.map((id) => ui.stateById.get(id)?.label).join(' or ')}</p><small>{evidence.explanation}</small>{candidate.recheckObservationIds.includes(evidence.observationId) && <em><CircleAlert /> Rechecking this answer may restore the candidate.</em>}</div></article>)}</div> : <p>No active evidence yet.</p>}</section>{sheet && <section className="fact-sheet"><h2><BookOpen /> Archived source fact sheet</h2>{sheet.sections.slice(0, 5).map((section) => <details key={section.id}><summary>{section.heading}<ChevronDown /></summary><p>{section.text}</p></details>)}<small>The fact sheet is historical source material and may use legacy taxonomy.</small></section>}</article></div>
}

function TaxonomySummary({ historical, concepts, expanded = false }: { historical?: HistoricalReconciliation; concepts: ReconciledGenusEvaluation['concepts']; expanded?: boolean }) {
  if (!historical) return null
  return <section className={`taxonomy-summary ${expanded ? 'expanded' : ''}`}><span className="eyebrow">Contemporary interpretation</span>{historical.status === 'unreviewed' ? <p>No reviewed crosswalk is supplied. This remains a historical Lucid result, not a claimed contemporary equivalent.</p> : concepts.length ? <><p>{historical.explanation}</p><ul>{concepts.map((item) => <li key={item.concept.id}><b><i>{item.concept.label}</i></b><span>{item.assessment.replaceAll('_', ' ')}</span>{item.concept.qualifier && <small>{item.concept.qualifier}</small>}{item.concept.typeSpeciesAssertions.length > 1 && <aside className="taxonomy-conflict"><CircleAlert /><div><b>Unresolved type-species conflict</b>{item.concept.typeSpeciesAssertions.map((assertion) => <small key={assertion.provenance}>{assertion.name} — {assertion.assertionStatus.replaceAll('_', ' ')} (thesis p. {assertion.sourcePage})</small>)}<small>Both source assertions are retained; this tool does not choose between them.</small></div></aside>}</li>)}</ul>{historical.unresolvedResidue && <small>Unresolved source residue remains; destinations are not exhaustive.</small>}</> : <p>{historical.explanation}</p>}</section>
}

function genusOnly(label: string) { return label.split(/\s+/)[0] }
export default App
