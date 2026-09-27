interface SchubertPictogramProps {
  characterId: string
  stateId: string
  characterLabel: string
  stateLabel: string
}

const PALP = new Set(['SC004', 'SC008', 'SC011', 'SC013', 'SC026', 'SC027', 'SC028', 'SC029', 'SC041'])
const FEMALE_GENITALIA = new Set(['SC030', 'SC031', 'SC032', 'SC033'])
const LEGS = new Set(['SC001', 'SC002', 'SC020', 'SC021', 'SC022', 'SC023', 'SC025', 'SC042'])
const BEHAVIOUR = new Set(['SC036', 'SC037', 'SC038'])

export const focusLabels: Record<string, string> = {
  SC001: 'leg I fringe / pale tarsus', SC002: 'compare leg-pair length', SC003: 'posterior eye-field crescent',
  SC004: 'inner + outer embolic arcs', SC005: 'dorsal scutum / side flaps', SC006: 'side-profile height + slope',
  SC007: 'dark dorsal stripe', SC008: 'distal embolic apex', SC009: 'dorsal ground pattern',
  SC010: 'abdomen shape vs carapace', SC011: 'disc size + embolus form', SC012: 'recorded occurrence',
  SC013: 'tegular-shoulder lamella', SC014: 'lateral carapace bands', SC015: 'medial + post-PLE tracts',
  SC016: 'medial + transverse bands', SC017: 'width across posterior eyes', SC018: 'body robustness + leg length',
  SC019: 'male body + chelicera colour', SC020: 'male tarsus I colour', SC021: 'erect posterior-leg spines',
  SC022: 'male leg III setae', SC023: 'leg III metatarsus + fringe', SC024: 'ventral lip before spinnerets',
  SC025: 'leg order, longest to shortest', SC026: 'prolateral tegular lobe', SC027: 'embolic disc area + outline',
  SC028: 'embolus length + coiling', SC029: 'number + alignment of apices', SC030: 'spermathecal pairs + position',
  SC031: 'copulatory duct course', SC032: 'fossae size + separation', SC033: 'copulatory opening position',
  SC034: 'dorsal scutum', SC035: 'dense colourful dorsal scales', SC036: 'courtship: leg I raised',
  SC037: 'courtship: leg III raised', SC038: 'courtship: abdomen raised', SC039: 'scales surrounding front eyes',
  SC040: 'overall body colour', SC041: 'retrolateral tibial apophysis', SC042: 'male anterior femur I surface',
  SC043: 'pale medial dorsal tract', SC044: 'posterior transverse pale region',
}

function stateSuffix(stateId: string) { return stateId.split('_').at(-1) ?? 'A' }
type StateStatus = 'present' | 'absent' | 'neutral'

function stateStatus(label: string): StateStatus {
  if (/not adequately diagnosed|not reported|\bother\b/i.test(label)) return 'neutral'
  if (/\b(absent|without|none|lacking|not present|not usually|not conspicuously|generally absent|no )\b/i.test(label)) return 'absent'
  return 'present'
}

function StatusMark({ status }: { status: StateStatus }) {
  return <g transform="translate(211 22)"><circle r="13" className={status === 'absent' ? 'diagram-negative' : status === 'present' ? 'diagram-positive' : 'diagram-neutral'} />{status === 'absent' ? <path d="M-6 -6L6 6M6 -6L-6 6" className="diagram-status-path" /> : status === 'present' ? <path d="M-7 0l5 5 9-11" className="diagram-status-path" /> : <text y="5" textAnchor="middle" className="diagram-status-text">?</text>}</g>
}

function LegDiagram({ characterId, suffix, stateLabel }: { characterId: string; suffix: string; stateLabel: string }) {
  if (characterId === 'SC025') {
    const order = stateLabel.match(/[1-4]{4}/)?.[0] ?? '1234'
    return <g transform="translate(34 25)" className="diagram-base">{[...order].map((leg, index) => <g key={`${leg}-${index}`}><text x="0" y={13 + index * 22}>{`leg ${leg}`}</text><path d={`M38 ${9 + index * 22}h${118 - index * 23}`} className={index === 0 ? 'diagram-accent' : ''} /><circle cx={156 - index * 23} cy={9 + index * 22} r="3" /></g>)}</g>
  }
  if (characterId === 'SC002') {
    const lengths: Record<string, number[]> = { A: [142, 96, 112, 118], B: [100, 108, 132, 140], C: [105, 98, 148, 126], D: [98, 96, 133, 146], E: [143, 93, 143, 116] }
    return <g transform="translate(28 22)" className="diagram-base">{(lengths[suffix] ?? lengths.A).map((length, index) => <g key={index}><text x="0" y={12 + index * 23}>{`I${'I'.repeat(index)}`}</text><path d={`M25 ${8 + index * 23}h${length}`} className={length === Math.max(...(lengths[suffix] ?? lengths.A)) ? 'diagram-accent' : ''} /></g>)}</g>
  }
  const status = stateStatus(stateLabel)
  const targetLeg = characterId === 'SC022' || characterId === 'SC023' ? 'III' : characterId === 'SC021' ? 'III / IV' : 'I'
  return <g transform="translate(20 25)" className="diagram-base"><path d="M15 72L53 34L103 54L153 30L207 42" className="diagram-limb" />{[15, 53, 103, 153, 207].map((x, index) => <circle key={x} cx={x} cy={[72, 34, 54, 30, 42][index]} r="4" />)}
    {status === 'present' && ['SC001', 'SC022', 'SC023'].includes(characterId) && [116, 127, 138, 149, 160, 171].map((x, index) => <path key={x} d={`M${x} ${49 - index * 1.1}l${index % 2 ? 4 : -3}-15`} className="diagram-accent" />)}
    {status === 'present' && characterId === 'SC021' && [119, 135, 151, 167].map((x, index) => <path key={x} d={`M${x} ${47 - index * 1.1}l${index % 2 ? 5 : -4}-18l5 5-7 1z`} className="diagram-accent-fill" />)}
    {characterId === 'SC020' && <path d="M173 34L207 42" className={status === 'absent' ? 'diagram-muted' : 'diagram-pale-segment'} />}
    {characterId === 'SC023' && <path d="M105 53L151 30" className="diagram-pale-segment" />}
    {characterId === 'SC042' && <path d={suffix === 'A' ? 'M35 51Q54 20 79 39' : 'M34 51Q55 38 79 39'} className={suffix === 'A' ? 'diagram-accent' : 'diagram-muted'} />}
    <text x="16" y="94">{`focus: leg ${targetLeg}`}</text></g>
}

function embolusPath(suffix: string) {
  const paths: Record<string, string> = {
    A: 'M104 80Q142 15 174 51Q195 76 158 96', B: 'M103 80Q154 48 170 78', C: 'M104 79q52-55 68 0q-8 35-35 3q-11-14 10-21',
    D: 'M102 83Q143 78 190 26', E: 'M105 83Q186 90 174 35Q167 13 143 38Q126 58 151 73', F: 'M104 84Q220 98 194 20Q174-13 144 24',
    G: 'M104 82Q149 38 169 66L197 31', H: 'M104 85Q167 30 194 62', I: 'M105 82Q149 54 177 70',
  }
  return paths[suffix] ?? paths.A
}

function PalpDiagram({ characterId, suffix, stateLabel }: { characterId: string; suffix: string; stateLabel: string }) {
  const apexPaths: Record<string, string[]> = {
    A: ['M0 48Q4 16 13 7', 'M15 47Q20 30 18 20'],
    B: ['M0 48Q3 18 11 2', 'M14 48Q19 16 23 7'],
    C: ['M0 48Q2 14 7 0', 'M11 48Q14 12 17 0', 'M22 48Q25 14 29 1'],
    D: ['M0 48Q2 18 8 4', 'M10 48Q12 17 18 3'],
    E: ['M0 48Q6 18 17 4', 'M22 48Q17 18 17 4'],
    F: ['M7 48L7 2'], G: ['M0 48Q5 20 9 2', 'M17 48Q22 20 27 2'],
    H: ['M0 48Q4 19 9 2', 'M11 48Q15 19 20 2'],
    I: ['M0 48Q3 32 7 18', 'M12 48Q15 32 19 18'],
  }
  return <g className="diagram-base">
    <path d="M41 105Q19 77 38 57Q49 46 62 57" />
    <ellipse cx="104" cy="68" rx={characterId === 'SC027' && ['A', 'B'].includes(suffix) ? 42 : suffix === 'E' ? 35 : 29} ry={characterId === 'SC027' && suffix === 'E' ? 24 : 36} className="diagram-highlight" />
    {characterId === 'SC004' && <><path d="M91 91Q72 45 105 31Q134 48 115 88" className="diagram-accent" /><path d={suffix === 'A' ? 'M96 86Q83 50 105 40Q125 52 110 86' : 'M84 83Q75 50 98 39M116 39Q139 54 120 85'} className="diagram-accent" /></>}
    {characterId === 'SC008' && <path d={suffix === 'A' ? 'M104 35l41 17-37 12z' : 'M105 36q38 8 31 30'} className="diagram-accent" />}
    {characterId === 'SC011' && <><ellipse cx="105" cy="69" rx={suffix === 'A' ? 23 : 37} ry={suffix === 'A' ? 25 : 30} className="diagram-accent" /><path d={suffix === 'A' ? 'M112 43l8-18M124 47l16-13' : 'M119 44Q180 26 183 83'} className="diagram-accent" /></>}
    {characterId === 'SC013' && stateStatus(stateLabel) === 'present' && <path d="M72 43l-16-12 21 1z" className="diagram-accent-fill" />}
    {characterId === 'SC026' && <path d={suffix === 'C' ? 'M77 72l-22-11 15-12-18-9' : suffix === 'D' ? 'M78 68q-23 2-29 18' : 'M78 69l-32-17 23-13'} className="diagram-accent" />}
    {characterId === 'SC027' && <ellipse cx="104" cy="68" rx={suffix === 'C' ? 21 : suffix === 'D' ? 25 : suffix === 'E' ? 38 : 34} ry={suffix === 'D' ? 31 : suffix === 'E' ? 20 : 34} className="diagram-accent" />}
    {characterId === 'SC028' && <path d={embolusPath(suffix)} className="diagram-accent" />}
    {characterId === 'SC029' && <g transform="translate(130 31)">{(apexPaths[suffix] ?? apexPaths.G).map((path, index) => <path key={index} d={path} className={suffix === 'A' && index === 0 ? 'diagram-accent-thick' : 'diagram-accent'} />)}</g>}
    {characterId === 'SC041' && <path d={suffix === 'C' ? 'M59 88l-14 10' : suffix === 'B' ? 'M59 88L25 55' : 'M59 88L34 67'} className="diagram-accent" />}
    <text x="158" y="111">ventral schematic</text>
  </g>
}

function FemaleGenitalDiagram({ characterId, suffix }: { characterId: string; suffix: string }) {
  const spermathecae: Record<string, { x: number; y: number; rx: number; ry: number }> = {
    A: { x: 53, y: 75, rx: 12, ry: 12 }, B: { x: 53, y: 86, rx: 8, ry: 8 }, C: { x: 53, y: 78, rx: 17, ry: 15 },
    D: { x: 49, y: 70, rx: 21, ry: 16 }, E: { x: 53, y: 91, rx: 11, ry: 12 }, F: { x: 53, y: 81, rx: 12, ry: 20 },
    G: { x: 51, y: 88, rx: 19, ry: 15 }, H: { x: 51, y: 78, rx: 18, ry: 15 }, I: { x: 53, y: 68, rx: 12, ry: 17 },
    J: { x: 51, y: 85, rx: 18, ry: 16 }, L: { x: 53, y: 76, rx: 14, ry: 14 },
  }
  const ductPaths: Record<string, string> = {
    A: 'M30 24Q91 27 38 78M122 24Q61 27 114 78',
    B: 'M48 44L61 72M104 44L91 72',
    C: 'M49 50L53 72M103 50L99 72',
    D: 'M36 30q42 13 8 48M116 30q-42 13-8 48',
    E: 'M48 40L52 73M104 40L100 73',
    F: 'M28 25Q75 25 44 77M124 25Q77 25 108 77',
    G: 'M47 47L52 73M105 47L100 73',
    H: 'M50 73Q43 48 33 30M102 73Q109 48 119 30',
    I: 'M36 31Q72 44 44 77M116 31Q80 44 108 77',
  }
  return <g transform="translate(42 18)" className="diagram-base">
    <path d="M12 87Q4 12 76 8Q148 12 140 87Q76 110 12 87Z" />
    {characterId === 'SC032' && <><ellipse cx={suffix === 'B' ? 40 : 50} cy={suffix === 'C' ? 34 : 54} rx={suffix === 'A' ? 10 : 15} ry={suffix === 'A' ? 14 : 19} className="diagram-highlight" /><ellipse cx={suffix === 'B' ? 112 : 102} cy={suffix === 'C' ? 34 : 54} rx={suffix === 'A' ? 10 : 15} ry={suffix === 'A' ? 14 : 19} className="diagram-highlight" />{suffix === 'A' && <path d="M49 77h54" className="diagram-guide" />}</>}
    {characterId === 'SC033' && <>{suffix === 'A' ? <><circle cx="36" cy="41" r="7" className="diagram-accent-fill" /><circle cx="116" cy="41" r="7" className="diagram-accent-fill" /></> : <><circle cx="61" cy="61" r="7" className="diagram-muted" /><circle cx="91" cy="61" r="7" className="diagram-muted" /><text x="76" y="42" textAnchor="middle" className="diagram-status-text muted-text">variable</text></>}</>}
    {characterId === 'SC030' && suffix !== 'K' && (() => { const shape = spermathecae[suffix] ?? spermathecae.A; return <><ellipse cx={shape.x} cy={shape.y} rx={shape.rx} ry={shape.ry} className="diagram-highlight" /><ellipse cx={152 - shape.x} cy={shape.y} rx={shape.rx} ry={shape.ry} className="diagram-highlight" />{['C', 'H'].includes(suffix) && <><ellipse cx="55" cy="39" rx={suffix === 'H' ? 7 : 12} ry={suffix === 'H' ? 13 : 10} className="diagram-accent" /><ellipse cx="97" cy="39" rx={suffix === 'H' ? 7 : 12} ry={suffix === 'H' ? 13 : 10} className="diagram-accent" /></>}</> })()}
    {characterId === 'SC030' && suffix === 'K' && <text x="76" y="61" textAnchor="middle" className="diagram-unknown">?</text>}
    {characterId === 'SC031' && <><ellipse cx="52" cy="80" rx="12" ry="10" className="diagram-highlight" /><ellipse cx="100" cy="80" rx="12" ry="10" className="diagram-highlight" /><path d={ductPaths[suffix] ?? ductPaths.B} className={['E', 'G'].includes(suffix) ? 'diagram-accent-thick' : 'diagram-accent'} />{suffix === 'C' && <><ellipse cx="50" cy="48" rx="13" ry="10" className="diagram-highlight" /><ellipse cx="102" cy="48" rx="13" ry="10" className="diagram-highlight" /></>}{['D', 'I'].includes(suffix) && <><circle cx="38" cy="40" r="5" className="diagram-accent-fill" /><circle cx="114" cy="40" r="5" className="diagram-accent-fill" /></>}{suffix === 'H' && <><circle cx="33" cy="30" r="7" className="diagram-accent-fill" /><circle cx="119" cy="30" r="7" className="diagram-accent-fill" /></>}</>}
    <text x="151" y="49">ventral</text>
  </g>
}

function BehaviourDiagram({ characterId, isAbsent }: { characterId: string; isAbsent: boolean }) {
  const legRoot = characterId === 'SC037' ? 108 : 78
  return <g className="diagram-base"><ellipse cx="103" cy={70} rx="28" ry="23" /><ellipse cx="157" cy={characterId === 'SC038' && !isAbsent ? 43 : 70} rx="30" ry="24" className="diagram-highlight" />
    <path d={isAbsent ? `M${legRoot} 62L40 84` : `M${legRoot} 62L48 24`} className="diagram-accent" /><path d="M89 81L43 108M112 82L78 113M136 82L122 113" />
    <path d="M151 91L170 113M168 88L200 105" /><text x="21" y="119">courtship posture</text></g>
}

function SomaticDiagram({ characterId, suffix, stateLabel }: { characterId: string; suffix: string; stateLabel: string }) {
  const status = stateStatus(stateLabel)
  const isAbsent = status === 'absent'
  const elongate = characterId === 'SC010' && ['B', 'D'].includes(suffix)
  const dark = characterId === 'SC040' && suffix === 'A' || characterId === 'SC019' && suffix === 'A'
  if (characterId === 'SC006') return <g transform="translate(24 19)" className="diagram-base"><path d={suffix === 'A' ? 'M12 77Q82 55 154 70L183 82H12Z' : suffix === 'B' ? 'M12 81Q82 27 154 57L183 82H12Z' : suffix === 'C' ? 'M12 82Q74 5 145 36L183 82H12Z' : 'M12 82Q76 16 148 45L183 82H12Z'} className="diagram-highlight" /><circle cx="45" cy="58" r="8" /><text x="86" y="110">lateral profile</text></g>
  if (characterId === 'SC012') return <g className="diagram-base"><path d={suffix === 'A' ? 'M65 21l18 16 22 6 4 25-14 18-15 28-20-16-22-8-11-25 17-14 7-23z' : 'M87 22l19 8 18-7 19 13 22-3 12 18-17 15-7 29-26 9-22-15-24 2-10-23 13-17z'} className="diagram-highlight" /><text x="135" y="117">{suffix === 'A' ? 'Australia' : 'Europe'}</text></g>
  if (characterId === 'SC024') return <g className="diagram-base"><ellipse cx="112" cy="64" rx="62" ry="38" className="diagram-highlight" /><path d="M165 53l18-10M170 62l20-2M165 72l19 10" /><path d={isAbsent ? 'M146 77h18' : 'M143 77q13 15 26 0'} className={isAbsent ? 'diagram-muted' : 'diagram-accent'} /><text x="87" y="116">ventral abdomen · spinnerets →</text></g>
  if (characterId === 'SC019') return <g className="diagram-base"><path d="M54 91Q57 25 120 22Q183 25 186 91Z" className={suffix === 'A' ? 'diagram-dark-fill' : 'diagram-highlight'} /><circle cx="91" cy="52" r="17" /><circle cx="149" cy="52" r="17" /><path d="M91 76q-7 36-23 18M149 76q7 36 23 18" className="diagram-accent" /><text x="120" y="119" textAnchor="middle">front view · body + chelicerae</text></g>
  if (characterId === 'SC039') return <g className="diagram-base"><path d="M54 94Q57 26 120 22Q183 26 186 94Z" className="diagram-highlight" /><circle cx="91" cy="58" r="18" /><circle cx="149" cy="58" r="18" />{status === 'present' && [68, 78, 88, 99, 141, 152, 162, 172].map((x, index) => <circle key={x} cx={x} cy={index < 4 ? 35 : 35} r="3" className="diagram-accent-fill" />)}<text x="120" y="119" textAnchor="middle">front view · scales around eyes</text></g>
  return <g className="diagram-base">
    <ellipse cx="91" cy="65" rx="30" ry="27" className={dark ? 'diagram-dark-fill' : ''} />
    <ellipse cx={elongate ? 162 : 151} cy="65" rx={elongate ? 47 : 33} ry={elongate ? 19 : 28} className={dark ? 'diagram-dark-fill' : 'diagram-highlight'} />
    {[48, 60, 72, 84].map((y, index) => <path key={`l${y}`} d={`M72 ${y}Q45 ${25 + index * 18} ${22 + index * 3} ${17 + index * 25}`} />)}
    {[48, 60, 72, 84].map((y, index) => <path key={`r${y}`} d={`M108 ${y}Q127 ${22 + index * 18} ${141 + index * 4} ${14 + index * 25}`} />)}
    {!isAbsent && ['SC003', 'SC014', 'SC015', 'SC016', 'SC044'].includes(characterId) && <path d={characterId === 'SC003' && suffix === 'C' ? 'M67 44Q77 30 84 28M99 28Q108 31 116 44' : characterId === 'SC003' ? 'M67 44Q91 20 116 44' : characterId === 'SC044' ? 'M67 81Q92 68 118 81' : characterId === 'SC014' ? 'M65 58Q91 77 118 58' : characterId === 'SC016' ? 'M68 42L115 80M115 42L68 80' : 'M91 39v48M72 50l-10-12M110 50l11-12'} className="diagram-accent" />}
    {!isAbsent && ['SC007', 'SC009', 'SC043'].includes(characterId) && (characterId === 'SC009' && suffix === 'C' ? <g>{[132, 151, 170].map((x, index) => <circle key={x} cx={x} cy={index % 2 ? 77 : 51} r="6" className="diagram-accent-fill" />)}</g> : <path d={suffix === 'C' && characterId === 'SC043' ? 'M151 35v60M124 65h54' : suffix === 'B' && characterId === 'SC009' ? 'M125 39h52v52h-52z' : 'M151 36v58'} className="diagram-accent" />)}
    {!isAbsent && ['SC005', 'SC034', 'SC035'].includes(characterId) && <><ellipse cx="151" cy="65" rx="27" ry="22" className="diagram-accent" />{characterId !== 'SC034' && [132, 144, 156, 168].map((x) => <circle key={x} cx={x} cy="63" r="4" className="diagram-accent-fill" />)}</>}
    {characterId === 'SC017' && <path d="M61 40Q91 55 121 40M61 87Q91 72 121 87" className="diagram-guide" />}
    {characterId === 'SC018' && <path d={suffix === 'A' ? 'M62 36Q30 6 13 17M120 36Q154 5 184 17' : suffix === 'B' ? 'M68 44L43 24M114 44L139 24' : 'M63 40L32 18M119 40L150 18'} className="diagram-accent" />}
    <text x="150" y="112">dorsal schematic</text>
  </g>
}

export function SchubertPictogram({ characterId, stateId, characterLabel, stateLabel }: SchubertPictogramProps) {
  const suffix = stateSuffix(stateId)
  const status = stateStatus(stateLabel)
  const isAbsent = status === 'absent'
  return <svg className="state-pictogram schubert-pictogram" viewBox="0 0 240 130" role="img" aria-label={`Schubert explanatory diagram for ${stateLabel}`}>
    <title>{`${characterId} ${characterLabel}: ${stateLabel}`}</title>
    <rect width="240" height="130" rx="12" className="diagram-background" />
    {PALP.has(characterId) ? <PalpDiagram characterId={characterId} suffix={suffix} stateLabel={stateLabel} />
      : FEMALE_GENITALIA.has(characterId) ? <FemaleGenitalDiagram characterId={characterId} suffix={suffix} />
        : LEGS.has(characterId) ? <LegDiagram characterId={characterId} suffix={suffix} stateLabel={stateLabel} />
          : BEHAVIOUR.has(characterId) ? <BehaviourDiagram characterId={characterId} isAbsent={isAbsent} />
            : <SomaticDiagram characterId={characterId} suffix={suffix} stateLabel={stateLabel} />}
    <rect x="7" y="6" width="226" height="18" rx="7" className="diagram-label-bg" />
    <text x="13" y="19" className="diagram-focus-label">{focusLabels[characterId] ?? characterLabel}</text>
    {characterId !== 'SC012' && <StatusMark status={status} />}
  </svg>
}
