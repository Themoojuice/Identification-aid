# Interactive key test scenarios

These repeatable scenarios exercise the prototype's user-facing engine without altering the Lucid source.

## Dependency checks

- Male: male palp and male leg characters remain available; female chelicera, epigyne, female palp and female leg groups are hidden.
- Female, uncleared: external epigyne characters remain available; internal epigyne and male groups are hidden.
- Female, cleared: internal epigyne characters become available.
- Unknown: all sex-specific groups are hidden and general morphology remains available.

## Forgiving ranking checks

For Jotus, Holoplatys, Maratus, Adoxotoma, Opisthoncus and Ananeon, the automated test selects up to nine of the target genus's rarest commonly scored source states. The target must rank in the top five with no conflicts.

The conflict scenario combines four Maratus-compatible states with one low-confidence Holoplatys-compatible state. All 85 genera must remain inspectable and every compatibility result must remain valid.

## Differential check

For a short Jotus scenario, the comparison engine examines the top four candidates. Every displayed character must contain at least two different genus descriptions; identical rows are suppressed.
