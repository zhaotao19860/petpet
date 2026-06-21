# Child-Friendly Real Animal Sounds Design

## Goal

Upgrade the local demo sound set so the 30 animals sound more real, softer, and more varied during care actions, games, and sound-based interactions.

## Direction

Use a "real child-friendly" sound pipeline:

- Prefer real animal recordings from traceable public sources.
- Allow non-commercial Freesound resources for this local demo.
- Use real action/environment layers for eating, drinking, and sleeping instead of heavily transforming one animal call.
- Keep every generated clip short, soft, fade-safe, and comfortable for ages 3-10.
- Keep the current `/assets/sounds/{animalId}/{soundType}.wav` file contract so the app does not need route or component rewrites.

## Source Strategy

The pipeline resolves sources in this order:

1. Existing curated Wikimedia Commons source candidates.
2. Freesound preview audio found through the API when `FREESOUND_API_KEY` or `FREESOUND_TOKEN` is provided.
3. Real shared action layers for `eat`, `drink`, and `sleep`.
4. A softer procedural fallback only when no usable real source is found.

The manifest records provider, title, author, license, page URL, source class, and clip kind. API keys are never written to the manifest or source files.

## Clip Design

The seven existing sound types stay:

- `joy`
- `angry`
- `sad`
- `happy`
- `eat`
- `drink`
- `sleep`

Mood clips use the most relevant animal recording available. Transformations are intentionally subtle: small timing changes, gentle texture shaping, trimming, fades, peak limiting, and loudness normalization.

Action clips use action-specific layers:

- `eat`: chewing, nibbling, leaf crunch, grazing, pecking, or underwater nibble layers by animal family.
- `drink`: lapping, sipping, splashing, bubbling, or underwater movement layers.
- `sleep`: breathing, soft snore, nest/rest ambience, quiet water, or calm movement layers.

Action layers may be lightly mixed with a quiet animal source when that improves identity, but the action sound should lead.

## Child-Friendly Audio Rules

- Target short clips: roughly 0.8-1.8 seconds.
- Use fade-in and fade-out to avoid clicks.
- Limit peaks and normalize loudness so rapid tapping is not harsh.
- Avoid music, speech, synthetic toy sounds, horror-style sounds, and long ambience.
- Reduce aggressive angry clips so they communicate emotion without startling children.
- Keep sleep clips especially soft.

## App Integration

The app continues to load the generated manifest from `/assets/sounds/manifest.json`. `petSounds.ts` only needs a wider manifest type if new clip kinds are introduced. Existing care actions and Sound Safari continue calling `playPetSound`.

## Testing

Automated checks should verify:

- The catalog still covers 30 animals and 7 sound types.
- The manifest contains all 210 files.
- Clip metadata includes provider/license/source information.
- Real or real-layered clip coverage improves compared with the previous 6 real animals.
- WAV files are not silent, clipped, or extremely long.

Manual checks should verify:

- Care action sounds feel softer and more realistic.
- Sound Safari clips are distinct enough to be useful.
- Eat/drink/sleep are recognizable actions rather than strange animal-call pitch effects.
