import { useEffect, useState } from 'react'
import { SchubertPictogram } from './SchubertPictogram'

interface StateIllustrationProps {
  characterId?: string
  stateId?: string
  characterLabel: string
  stateLabel: string
  anatomicalRegion?: string
  imageUrl?: string
  imageCaption?: string
}

type DiagramKind = 'eyes' | 'palp' | 'epigyne' | 'leg' | 'abdomen' | 'chelicera' | 'carapace' | 'body' | 'distribution' | 'behaviour' | 'spider'

function diagramKind(text: string): DiagramKind {
  if (/epig|spermat|copulatory|insemination|fertilisation|fertilization|female genital/.test(text)) return 'epigyne'
  if (/palp|embol|tegul|cymbium|apophysis|male genital/.test(text)) return 'palp'
  if (/eye|ocular|ame|ale|pme|ple/.test(text)) return 'eyes'
  if (/chelic|fang|tooth|teeth|fissident|unident|plurident/.test(text)) return 'chelicera'
  if (/leg|tibia|tars|metatars|femur|patella|trochanter|coxa|spine|fringe/.test(text)) return 'leg'
  if (/abdomen|opisthosoma|scutum|spinneret/.test(text)) return 'abdomen'
  if (/carapace|cephalothorax|clypeus|fovea|thoracic|cephalic/.test(text)) return 'carapace'
  if (/distribution|geograph|australia|europe|locality|known from/.test(text)) return 'distribution'
  if (/behavio|courtship|display|wave|dance/.test(text)) return 'behaviour'
  if (/body|form|shape|size|length|width/.test(text)) return 'body'
  return 'spider'
}

function stateFlags(text: string) {
  return {
    absent: /\b(absent|without|no |none|lacking|not present|unornamented)\b/.test(text),
    present: /\b(present|with |bearing|ornamented|distinct)\b/.test(text),
    elongate: /elong|narrow|slender|longer/.test(text),
    round: /round|compact|broad|wide|globular/.test(text),
    elevated: /elevat|high|steep/.test(text),
    flat: /flat|low|shallow/.test(text),
    stripe: /stripe|band|tract|line/.test(text),
    spot: /spot|patch|mark/.test(text),
    fringe: /fringe|brush|dense set|hair|tuft/.test(text),
    curved: /curv|hook|coil|arc|spiral/.test(text),
  }
}

function sizeScale(text: string) {
  if (/very large|>\s*11/.test(text)) return 1.12
  if (/\blarge\b|8\s*[-–]\s*11/.test(text)) return .96
  if (/medium|4\s*[-–]\s*8/.test(text)) return .8
  if (/\bsmall\b|<\s*4/.test(text)) return .63
  return .9
}

function numeral(text: string) {
  const leg = text.match(/\bleg(?:s)?\s*(i{1,3}|iv|1|2|3|4)\b/i)?.[1]
  if (leg) return leg.toUpperCase()
  const count = text.match(/\b(one|two|three|four|single|double|triple|1|2|3|4)\b/i)?.[1]
  return count?.toUpperCase() ?? ''
}

function Marker({ absent, present }: { absent: boolean; present: boolean }) {
  if (!absent && !present) return null
  return <g transform="translate(199 18)"><circle r="14" className={absent ? 'diagram-negative' : 'diagram-positive'} />{absent ? <><path d="M-6-6L6 6M6-6L-6 6" /><title>Absent</title></> : <><path d="M-7 0l5 5 9-11" /><title>Present</title></>}</g>
}

function BaseSpider({ abdomenLong = false }: { abdomenLong?: boolean }) {
  const legRoots = [70, 82, 94, 106]
  return <g className="diagram-base">
    <ellipse cx="94" cy="65" rx="29" ry="25" />
    <ellipse cx={abdomenLong ? 159 : 151} cy="65" rx={abdomenLong ? 40 : 31} ry={abdomenLong ? 20 : 27} />
    {legRoots.map((root, index) => <path key={`top-${root}`} d={`M${root} ${50 - index * 2} Q${48 + index * 8} ${34 - index * 3} ${24 + index * 4} ${14 + index * 2}`} />)}
    {legRoots.map((root, index) => <path key={`bottom-${root}`} d={`M${root} ${80 + index * 2} Q${48 + index * 8} ${96 + index * 3} ${24 + index * 4} ${116 - index * 2}`} />)}
  </g>
}

function Pictogram({ characterLabel, stateLabel, anatomicalRegion }: Omit<StateIllustrationProps, 'imageUrl' | 'imageCaption'>) {
  const text = `${characterLabel} ${stateLabel} ${anatomicalRegion ?? ''}`.toLowerCase()
  const kind = diagramKind(text)
  const flags = stateFlags(text)
  const number = numeral(text)
  return <svg className="state-pictogram" viewBox="0 0 240 130" role="img" aria-label={`Orientation diagram for ${stateLabel}`}>
    <title>{`Explanatory orientation diagram: ${characterLabel} — ${stateLabel}`}</title>
    <rect width="240" height="130" rx="12" className="diagram-background" />
    {kind === 'eyes' && <g transform="translate(36 25)" className="diagram-base">
      <path d="M10 75 Q20 15 84 10 Q148 15 158 75 Z" />
      <circle cx="53" cy="47" r="18" className="diagram-highlight" /><circle cx="115" cy="47" r="18" className="diagram-highlight" />
      <circle cx="26" cy="40" r="9" /><circle cx="142" cy="40" r="9" /><circle cx="18" cy="70" r="5" /><circle cx="150" cy="70" r="5" />
      <path d="M53 72v15M115 72v15" className="diagram-guide" />
    </g>}
    {kind === 'palp' && <g transform="translate(62 11)" className="diagram-base">
      <path d="M25 102 Q2 76 20 55 Q29 45 42 55" />
      <ellipse cx="72" cy="65" rx={flags.round ? 35 : 28} ry={flags.elongate ? 42 : 34} className="diagram-highlight" />
      <path d={flags.curved ? 'M72 22 Q112 22 102 58 Q96 77 73 89' : 'M70 25 Q98 18 101 48 L92 74'} className="diagram-accent" />
      <path d="M42 96 Q59 108 79 100" /><text x="116" y="41">ventral</text><path d="M108 45h-18" className="diagram-guide" />
    </g>}
    {kind === 'epigyne' && <g transform="translate(56 22)" className="diagram-base">
      <path d="M16 82 Q6 15 64 10 Q122 15 112 82 Q64 104 16 82Z" />
      <ellipse cx="43" cy="51" rx={flags.round ? 18 : 12} ry="24" className="diagram-highlight" /><ellipse cx="85" cy="51" rx={flags.round ? 18 : 12} ry="24" className="diagram-highlight" />
      <path d={flags.curved ? 'M43 27Q63 42 43 76M85 27Q65 42 85 76' : 'M43 27v49M85 27v49'} className="diagram-accent" />
      <path d="M30 22h68" className="diagram-guide" /><text x="126" y="48">ventral</text>
    </g>}
    {kind === 'leg' && <g transform="translate(15 22)" className="diagram-base">
      <path d="M18 75 L55 34 L104 55 L151 33 L207 46" className="diagram-limb" />
      {[18, 55, 104, 151, 207].map((x, index) => <circle key={x} cx={x} cy={[75, 34, 55, 33, 46][index]} r="4" />)}
      {flags.fringe && [120, 130, 140, 150, 160, 170].map((x) => <path key={x} d={`M${x} ${47 - (x - 120) * .25}l-3-13`} className="diagram-accent" />)}
      <path d="M58 91h92" className="diagram-guide" /><path d="M145 86l8 5-8 5" className="diagram-guide" />
      {number && <g><circle cx="42" cy="18" r="15" className="diagram-highlight" /><text x="42" y="23" textAnchor="middle" className="diagram-number">{number}</text></g>}
    </g>}
    {kind === 'abdomen' && <g transform="translate(41 19)" className="diagram-base">
      <ellipse cx="80" cy="48" rx={flags.elongate ? 64 : flags.round ? 42 : 52} ry={flags.round ? 42 : 31} className="diagram-highlight" />
      {flags.stripe && <path d="M22 48 Q80 32 138 48 Q80 64 22 48Z" className="diagram-accent-fill" />}
      {flags.spot && [48, 76, 104].map((x) => <circle key={x} cx={x} cy="48" r="7" className="diagram-accent-fill" />)}
      <path d="M80 94V72" className="diagram-guide" /><text x="80" y="108" textAnchor="middle">dorsal view</text>
    </g>}
    {kind === 'chelicera' && <g transform="translate(55 18)" className="diagram-base">
      <path d="M20 15 Q55 8 58 45 L51 84 Q25 78 20 45Z" className="diagram-highlight" /><path d="M108 15 Q73 8 70 45 L77 84 Q103 78 108 45Z" className="diagram-highlight" />
      <path d="M51 80q13 32 26 0" className="diagram-accent" />
      {[0, 1, 2].slice(0, number.includes('ONE') || number === '1' ? 1 : number.includes('TWO') || number === '2' ? 2 : 3).map((item) => <path key={item} d={`M${42 + item * 9} 60l5 8 5-8`} />)}
      <text x="130" y="53">teeth</text><path d="M122 57H84" className="diagram-guide" />
    </g>}
    {kind === 'carapace' && <g transform="translate(30 20)" className="diagram-base">
      <path d={flags.flat ? 'M12 76Q80 48 148 68L174 82H12Z' : flags.elevated ? 'M12 82Q74 5 148 52L174 82H12Z' : 'M12 80Q76 24 148 57L174 80H12Z'} className="diagram-highlight" />
      <circle cx="45" cy="59" r="9" /><circle cx="65" cy="53" r="6" />
      {flags.stripe && <path d="M48 33Q86 42 128 61" className="diagram-accent" />}
      <path d="M21 100h142" className="diagram-guide" /><text x="92" y="114" textAnchor="middle">lateral profile</text>
    </g>}
    {kind === 'body' && <g>
      <g transform={`translate(120 61) scale(${sizeScale(text)}) translate(-120 -61)`}><BaseSpider abdomenLong={flags.elongate} />{flags.round && <circle cx="151" cy="65" r="34" className="diagram-highlight-soft" />}</g>
      <path d="M55 110h130M55 105v10M87 106v8M120 105v10M152 106v8M185 105v10" className="diagram-guide" />
      <text x="120" y="126" textAnchor="middle" className="diagram-scale">relative body size</text>
    </g>}
    {kind === 'distribution' && <g transform="translate(53 12)" className="diagram-base"><path d="M69 7l19 17 25 8 4 29-16 21-17 31-22-18-25-9-13-28 19-16 8-26z" className="diagram-highlight" /><path d="M33 67l18 9 27-21 27 8" className="diagram-accent" /><text x="132" y="62">locality</text></g>}
    {kind === 'behaviour' && <g transform="translate(14 16)"><BaseSpider />{[-1, 1].map((side) => <path key={side} d={`M${94 + side * 20} 42q${side * 17}-25 ${side * 31}-4`} className="diagram-accent" />)}<path d="M62 17q32-20 64 0" className="diagram-guide" /></g>}
    {kind === 'spider' && <g transform="translate(12 16)"><BaseSpider abdomenLong={flags.elongate} />{(flags.stripe || flags.spot) && <path d="M125 65h54" className="diagram-accent" />}</g>}
    <Marker absent={flags.absent} present={flags.present} />
    <g className="diagram-callout"><circle cx="21" cy="109" r="8" /><path d="M25 103L44 85" /><text x="34" y="115">orientation aid</text></g>
  </svg>
}

export function StateIllustration(props: StateIllustrationProps) {
  const [imageFailed, setImageFailed] = useState(false)
  useEffect(() => setImageFailed(false), [props.imageUrl])
  if (props.imageUrl && !imageFailed) return <span className="state-illustration source-illustration"><img src={props.imageUrl} alt={`Source example for ${props.stateLabel}`} loading="lazy" onError={() => setImageFailed(true)} /><span className="illustration-caption"><b>Source example</b>{props.imageCaption || props.stateLabel}</span></span>
  if (props.characterId?.startsWith('SC') && props.stateId) return <span className="state-illustration generated-illustration"><SchubertPictogram characterId={props.characterId} stateId={props.stateId} characterLabel={props.characterLabel} stateLabel={props.stateLabel} /><span className="illustration-caption"><b>Character-specific guide</b>Shows this Schubert character and state comparatively; not a specimen image.</span></span>
  return <span className="state-illustration generated-illustration"><Pictogram {...props} /><span className="illustration-caption"><b>Illustrated guide</b>Structure or direction to compare; not a specimen image.</span></span>
}

export function AnatomyReference({ characterLabel, anatomicalRegion }: { characterLabel: string; anatomicalRegion?: string }) {
  const text = `${characterLabel} ${anatomicalRegion ?? ''}`.toLowerCase()
  const base = import.meta.env.BASE_URL
  const source = /palp|embol|tegul|cymbium|epig|spermat|leg|tibia|tars|femur|patella/.test(text)
    ? `${base}media/private-reference/figure_2_limbs.jpg`
    : /anterior|posterior|medial|lateral|dorsal|ventral|proximal|distal/.test(text)
      ? `${base}media/private-reference/figure_3_directions2.jpg`
      : `${base}media/private-reference/figure_1_morphology.jpg`
  return <details className="anatomy-reference"><summary>Open labelled anatomy reference</summary><img src={source} alt={`Labelled Salticidae anatomy reference for ${characterLabel}`} loading="lazy" /><small>Use the option-specific illustration above for the selected state.</small></details>
}
