# Children Playground Upgrade Design

## Goal

Turn the current pet care and encyclopedia app into a child-friendly animal playground for ages 3-10. The first large-version implementation should feel like a complete experience: children can enter through a visual planet map, follow a daily task loop, learn from simple animal cards, play several animal-themed games, and receive gentle rewards.

## Scope

This version uses a hybrid direction:

- A planet-map home as the primary navigation surface.
- A daily task chain that guides children through care, learning, play, and reward.
- A richer game space with four mini-games.
- An upgraded encyclopedia with child-sized cards and more quiz material.
- Existing animal data, growth data, images, and sound assets remain the source of truth.

Out of scope for this version:

- Online multiplayer.
- Accounts beyond the existing local user model.
- Paid items, ads, or external services.
- A full animation engine.
- New generated animal images.

## Audience Principles

For ages 3-5:

- Use large tap targets, icons, short labels, and one-step choices.
- Avoid dense text and punishment states.
- Prefer “try again” and “look closely” feedback.

For ages 6-10:

- Add light challenge, scoring, streaks, and knowledge hints.
- Use richer questions about habitat, behavior, safety, food, and growth.
- Keep facts accurate but phrased in everyday language.

## Information Architecture

The app keeps the existing bottom navigation, but the home view becomes a planet map with five large zones:

- Animal Home: care actions, mood/status, current animal stage.
- Encyclopedia House: animal cards, facts, growth timeline, mini quizzes.
- Game Island: four mini-games.
- Sticker Tree: achievements and daily rewards.
- Friend Meadow: existing friend/observation entry, kept lightweight.

The current “portal cards” on the home page become visual zone buttons inside the map. Existing routes can stay simple React state views.

## Daily Task Loop

Each active pet gets a daily task strip:

1. Care: feed, water, play, heal, or rest/clean/observe when those actions are surfaced.
2. Learn: read one fact card in the encyclopedia.
3. Play: finish one mini-game round.
4. Reward: earn stars and unlock a sticker-style achievement.

The first version can store daily progress in local app state. It does not need a real calendar reset beyond “today” tracking.

## Encyclopedia Upgrade

The encyclopedia page becomes easier to scan:

- Hero animal card with stage image, name, simple summary, and sound/play affordance.
- Fact card carousel: habitat, food, rest, behavior, safety, health, growth.
- “Today I found out” prompt for one short fact.
- Mini quiz section using the expanded question generator.

Question generation should expand from five questions to multiple question types:

- Safe food choice.
- Unsafe food avoidance.
- Habitat match.
- Behavior recognition.
- Rest/safety decision.
- Growth stage fact.
- Conservation/protection when available.
- Sound or observation prompt when useful.

Questions should be generated from `AnimalType` fields to cover all 30 animals without manually writing every item.

## Game Space

The new game space is a mini-game hub with four games:

1. Sound Safari
   - Plays the current animal or several candidate animal sounds.
   - Child chooses the matching animal.
   - Uses `/assets/sounds/...` and falls back gracefully.

2. Food Sorter
   - Children drag or tap foods into “safe to learn about” and “avoid” buckets.
   - Uses `safeFood` and `unsafeFood`.

3. Habitat Match
   - Match animal to habitat cards.
   - Uses `habitat`, category, and safety notes.

4. Memory Cards
   - Flip cards to match animal facts: food, habitat, behavior, rest.
   - Small board for younger users, slightly larger board for older users.

The existing solo/battle quiz can become one mode inside this hub rather than the whole page.

## Rewards And Feedback

Feedback should be warm and low-pressure:

- Correct answers: stars, cheerful text, animal sound, visual burst.
- Wrong answers: no penalty; show a hint and allow retry or continue.
- Completion: daily badge/sticker and achievement progress.

Rewards should use existing achievements first, then add new local achievements if needed:

- First sound game.
- Food helper.
- Habitat finder.
- Memory master.
- Daily explorer.

## UI Style

The UI should feel playful and clear, not like a marketing landing page.

Visual rules:

- Big zone buttons with icons and real animal images where possible.
- Short headings and labels.
- Large touch targets.
- More color variety than the current panel-heavy layout, but avoid a single-hue palette.
- Cards only for individual facts, games, rewards, and repeated items.
- No nested cards.
- Text must fit on mobile and desktop.

## Data And Components

New or modified units:

- `utils/challenges.ts`: expand question generation.
- `utils/dailyTasks.ts`: daily task model and progress helpers.
- `components/PlanetMap.tsx`: visual home zone navigation.
- `components/DailyQuestStrip.tsx`: daily progress chain.
- `components/FactCards.tsx`: encyclopedia facts.
- `components/MiniGameHub.tsx`: game selection.
- `components/games/SoundSafari.tsx`
- `components/games/FoodSorter.tsx`
- `components/games/HabitatMatch.tsx`
- `components/games/MemoryCards.tsx`
- `pages/HomePage.tsx`: integrate map and daily tasks.
- `pages/StoryLearnPage.tsx`: integrate fact cards and quiz.
- `pages/ChallengePage.tsx`: turn into game hub.
- `store/petStore.ts`: add progress/reward state only if existing state cannot cover it.
- `styles.css`: responsive child-friendly layout.

Keep new components small and focused. Reuse existing animal and pet models.

## Error Handling

- If sound playback fails, keep the existing audio fallback.
- If an animal lacks enough data for a game, use category-level fallback options.
- If daily progress state is missing, start from an empty day.
- If a child has no pet yet, the hub still leads to animal selection.

## Testing And Verification

Run:

- `npm run typecheck`
- `npm run build`
- Existing sound test: `npm run sounds:test`

Manual browser checks:

- First-run user with no pet can reach selection.
- Adopted pet sees the planet map.
- Care action updates daily quest progress.
- Encyclopedia fact cards render for several animal categories.
- Each mini-game can start, answer, and finish.
- Mobile-width layout has no overlapping text or clipped buttons.

