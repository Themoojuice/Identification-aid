# Character comparator audit

## Finding

The Lucid vectors were preserved correctly, but the first app scoring implementation made an important distinction incorrectly.

A `0` for the chosen state can mean either:

1. the genus is scored for a different state of that character — a genuine conflict; or
2. every state for that genus and character is `0` — the source provides no score for the comparison.

The app treated both cases as conflicts. This was most visible in leg comparisons because some genera have all-zero source data across those characters. Such a genus lost compatibility whichever exhaustive-looking option the user selected.

The corrected engine first checks whether the genus has any non-zero score anywhere in the character. An all-zero character is now neutral “not scored in source” evidence. A zero selected state remains a conflict only when another state in the same character is scored.

## Leg-character source coverage

| Feature | ID | Genera with all-zero source data |
| --- | ---: | --- |
| Male: comparative lengths of legs 3 and 4 | 91 | Australoneon |
| Male: absolute leg length | 101 | Australoneon |
| Male: relative leg lengths | 102 | Australoneon |
| Female: comparative lengths of legs 3 and 4 | 103 | Australoneon, Capeyorkia, Maddisonia, Parahelpis |
| Female: absolute leg length | 113 | Australoneon |
| Female: relative leg lengths | 114 | Australoneon, Capeyorkia, Maddisonia, Parahelpis, Pristobaeus |

Multiple source states can legitimately be common for the same genus. The UI therefore retains its multi-select “any of these” behaviour: if the observation could fit two states, selecting both uses the strongest compatible source score once for that character.

## Presentation correction

“Plausible” remains a soft leading group, not an elimination result. The candidate pane now displays all 85 genera, with lower-ranked genera separated under “Other genera — lower-ranked, not removed.” Source gaps are shown on candidate cards and in the evidence explanation.

## Media

The Lucid payload includes no dedicated images for the 12 male/female relative-leg-length states. A separate curated overlay now supplies representative archived plates from genera scored common for each state. Each is explicitly labelled as an example rather than an original Lucid state image. The normalized source data is unchanged.
