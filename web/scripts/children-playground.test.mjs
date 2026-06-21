import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

import { animals } from '../src/data/animals.ts';
import { buildFactCards } from '../src/utils/factCards.ts';
import { getChallengeSet } from '../src/utils/challenges.ts';
import { createDailyQuestProgress, getDailyQuestSummary, markDailyQuestStep, todayKey } from '../src/utils/dailyTasks.ts';

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const url = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);
    if (entry.isDirectory()) {
      files.push(...await collectSourceFiles(url));
    } else if (entry.name.endsWith('.tsx')) {
      files.push(url);
    }
  }
  return files;
}

test('daily quest date follows the local calendar day', () => {
  assert.equal(todayKey(new Date('2026-06-01T00:30:00+08:00')), '2026-06-01');
});

test('daily quest progress advances one step at a time', () => {
  const today = '2026-06-01';
  const progress = createDailyQuestProgress(today);

  assert.equal(getDailyQuestSummary(progress).completedCount, 0);

  const afterCare = markDailyQuestStep(progress, 'care', today);
  assert.equal(afterCare.steps.care.done, true);
  assert.equal(getDailyQuestSummary(afterCare, today).completedCount, 1);
});

test('daily quest completes after reward and stays idempotent', () => {
  const today = '2026-06-01';
  const progress = ['care', 'learn', 'play', 'reward'].reduce(
    (current, step) => markDailyQuestStep(current, step, today),
    createDailyQuestProgress(today),
  );
  const afterRepeat = markDailyQuestStep(progress, 'reward', today);

  assert.equal(getDailyQuestSummary(progress, today).complete, true);
  assert.equal(afterRepeat.stars, 4);
});

test('challenge generator creates a richer question set for every animal', () => {
  for (const animal of animals) {
    const questions = getChallengeSet(animal);
    assert.ok(questions.length >= 8, `${animal.id} should have at least 8 questions`);
    assert.ok(questions.some((question) => question.id.includes('unsafe')), `${animal.id} missing unsafe food question`);
    assert.ok(questions.some((question) => question.id.includes('growth')), `${animal.id} missing growth question`);
    assert.ok(questions.every((question) => question.options.includes(question.correct)), `${animal.id} has a question without the correct option`);
  }
});

test('animal library includes woodlouse as a habitat-care arthropod', () => {
  const animal = animals.find((item) => item.id === 'woodlouse_pillbug');

  assert.ok(animal, 'woodlouse_pillbug should be available for adoption');
  assert.equal(animal.name, '西瓜虫');
  assert.equal(animal.category, 'arthropod');
  assert.match(animal.scientificName ?? '', /Armadillidium/);
  assert.equal(animal.interactionRules.careMode, 'habitat_care');
  assert.equal(animal.interactionRules.canFeedDirectly, false);
  assert.ok(animal.habitat.some((item) => /落叶|潮湿/.test(item)), 'woodlouse should mention damp leaf-litter habitat');
  assert.ok(animal.habits.some((item) => /蜕皮|卷成/.test(item)), 'woodlouse should include child-friendly behavior facts');
  assert.equal(animal.growthStages.length, 30);
  assert.match(animal.growthStages[0].description, /陆生甲壳动物|育幼袋|蜕皮/);
  assert.match(animal.media.coverImage, /\/assets\/animals\/woodlouse_pillbug\/age-01\.webp$/);
});

test('fact cards use short copy that can wrap inside child cards', () => {
  for (const animal of animals) {
    const cards = buildFactCards(animal, animal.growthStages[0]);

    assert.equal(cards.length, 7, `${animal.id} should have seven fact cards`);
    assert.ok(cards.every((card) => card.value.length <= 42), `${animal.id} has an overly long fact card`);
  }
});

test('planet map keeps only destination zones with real screens', async () => {
  const source = await readFile(new URL('../src/components/PlanetMap.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /动物家园/, 'home zone only scrolls to the top and should not appear as a destination');
  assert.doesNotMatch(source, /scrollTo/, 'planet zones should open real app areas instead of scrolling the current page');
  assert.doesNotMatch(source, /好友草地/, 'friends grassland should move out of the home planet map');
  for (const title of ['百科小屋', '游戏岛', '成就树']) {
    assert.match(source, new RegExp(title), `${title} should remain available on the planet map`);
  }
});

test('home page does not keep hidden duplicate destination cards or upper destination rows', async () => {
  const source = await readFile(new URL('../src/pages/HomePage.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /PlanetMap/, 'home should no longer render the upper planet map row');
  assert.doesNotMatch(source, /DailyQuestStrip/, 'home should no longer render the upper daily quest row');
  assert.doesNotMatch(source, /kid-portal-panel/, 'hidden portal panel should not keep duplicate home navigation');
  assert.doesNotMatch(source, /选择一个星球区域/, 'duplicate destination prompt is already covered by bottom navigation');
  assert.doesNotMatch(source, /轻量装扮/, 'hidden outfit toggle should not appear as a destination card');
});

test('planet map zone cards keep stable row heights on small screens', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(styles, /\.planet-zones\s*{[^}]*grid-auto-rows:\s*1fr;/s, 'zone rows should stretch to equal heights');
  assert.match(styles, /\.planet-zone\s*{[^}]*height:\s*100%;/s, 'zone buttons should fill their grid row');
});

test('bottom navigation uses a clear game icon for game space', async () => {
  const source = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /<span>🕘<\/span>\s*<strong>游戏空间<\/strong>/, 'game space should not use a clock icon');
  assert.match(source, /<span>🎮<\/span>\s*<strong>游戏空间<\/strong>/, 'game space should use a game icon');
});

test('interactive buttons declare their button type explicitly', async () => {
  const sourceFiles = await collectSourceFiles(new URL('../src/', import.meta.url));

  for (const fileUrl of sourceFiles) {
    const source = await readFile(fileUrl, 'utf8');
    const buttonTags = source.match(/<button\b[^>]*>/gs) ?? [];
    for (const tag of buttonTags) {
      assert.match(tag, /\btype=/, `${fileUrl.pathname} has a button without an explicit type: ${tag}`);
    }
  }
});

test('app shell owns vertical scrolling above the fixed bottom navigation', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(styles, /\.app-shell\s*{[^}]*height:\s*100dvh;[^}]*overflow-y:\s*auto;/s, 'app shell should be the stable vertical scroll container');
  assert.match(styles, /\.app-shell\s*{[^}]*-webkit-overflow-scrolling:\s*touch;/s, 'mobile scrolling should keep native momentum');
  assert.match(styles, /\.app-shell\s*{[^}]*scroll-padding-bottom:\s*calc\(132px \+ env\(safe-area-inset-bottom\)\);/s, 'fixed bottom nav should not hide page endings');
  assert.match(styles, /@media \(max-width: 640px\)\s*{[\s\S]*?\.app-shell\s*{[^}]*scroll-padding-bottom:\s*calc\(108px \+ env\(safe-area-inset-bottom\)\);/s, 'small screens should keep bottom nav clearance');
});

test('rewards and achievements surface a child-friendly celebration toast', async () => {
  const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const toastSource = await readFile(new URL('../src/components/CelebrationToast.tsx', import.meta.url), 'utf8');

  assert.match(appSource, /CelebrationToast/, 'app should render the celebration toast');
  assert.match(appSource, /new-achievement/, 'achievement unlocks should enqueue a celebration');
  assert.match(appSource, /daily-sticker/, 'daily reward should enqueue a celebration');
  assert.match(toastSource, /aria-live="polite"/, 'celebration toast should be announced politely');
  assert.match(toastSource, /获得新成就|今日贴纸/, 'celebration copy should be visible and child-friendly');
});

test('sound controls show and honor the current sound state', async () => {
  const careSource = await readFile(new URL('../src/components/CareActions.tsx', import.meta.url), 'utf8');
  const safariSource = await readFile(new URL('../src/components/games/SoundSafari.tsx', import.meta.url), 'utf8');
  const soundSource = await readFile(new URL('../src/utils/petSounds.ts', import.meta.url), 'utf8');
  const toggleSource = await readFile(new URL('../src/components/SoundToggle.tsx', import.meta.url), 'utf8');

  assert.match(careSource, /SoundToggle/, 'care actions should expose sound status');
  assert.match(safariSource, /SoundToggle/, 'sound safari should expose sound status near playback');
  assert.match(soundSource, /isPetSoundEnabled/, 'sound utility should expose preference state');
  assert.match(soundSource, /if \(!isPetSoundEnabled\(\)\) return;/, 'muted state should prevent playback');
  assert.match(toggleSource, /有声/, 'toggle should show enabled state');
  assert.match(toggleSource, /静音/, 'toggle should show muted state');
});

test('quiz answers have distinct animated success and retry feedback', async () => {
  const appChallengeSource = await readFile(new URL('../src/pages/AdoptionChallengePage.tsx', import.meta.url), 'utf8');
  const learnSource = await readFile(new URL('../src/pages/StoryLearnPage.tsx', import.meta.url), 'utf8');
  const safariSource = await readFile(new URL('../src/components/games/SoundSafari.tsx', import.meta.url), 'utf8');
  const habitatSource = await readFile(new URL('../src/components/games/HabitatMatch.tsx', import.meta.url), 'utf8');
  const soundSource = await readFile(new URL('../src/utils/petSounds.ts', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  for (const source of [appChallengeSource, learnSource, safariSource, habitatSource]) {
    assert.match(source, /playQuizFeedbackSound/, 'quiz answer handlers should trigger feedback sound');
    assert.match(source, /quiz-reaction-correct/, 'quiz UIs should expose a success reaction class');
    assert.match(source, /quiz-reaction-wrong/, 'quiz UIs should expose a retry reaction class');
  }

  assert.match(soundSource, /export function playQuizFeedbackSound/, 'sound utilities should expose quiz feedback sounds');
  assert.match(soundSource, /OscillatorNode|createOscillator/, 'quiz feedback should use a lightweight generated UI tone');
  assert.match(soundSource, /if \(!isPetSoundEnabled\(\)\) return;/, 'quiz feedback sound should honor the global sound toggle');
  assert.match(styles, /\.quiz-reaction-correct::after/s, 'correct answers should render a celebratory overlay');
  assert.match(styles, /\.quiz-reaction-wrong/s, 'wrong answers should have a distinct retry style');
  assert.match(styles, /@keyframes\s+quizSuccessPop/, 'correct feedback should animate');
  assert.match(styles, /@keyframes\s+quizRetryShake/, 'wrong feedback should animate differently');
});

test('home pet stage behaves like an interactive playground', async () => {
  const viewerSource = await readFile(new URL('../src/components/RealMediaViewer.tsx', import.meta.url), 'utf8');
  const homeSource = await readFile(new URL('../src/pages/HomePage.tsx', import.meta.url), 'utf8');
  const careSource = await readFile(new URL('../src/components/CareActions.tsx', import.meta.url), 'utf8');

  assert.match(viewerSource, /playground-weather/, 'stage should include a weather/day-night layer');
  assert.match(viewerSource, /playground-decor/, 'stage should include tappable decoration items');
  assert.match(viewerSource, /pet-reaction-bubble/, 'stage should show pet reaction bubbles');
  assert.match(viewerSource, /onClick=\{handlePetTap\}/, 'pet image should react to taps');
  assert.match(homeSource, /careSignal/, 'home should pass care feedback to the stage');
  assert.match(careSource, /onCareFeedback/, 'care actions should emit visible feedback');
});

test('interactive playground styles keep effects contained and child friendly', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  for (const selector of ['.playground-weather', '.playground-decor', '.pet-reaction-bubble', '.stage-sparkle']) {
    assert.match(styles, new RegExp(selector.replace('.', '\\.')), `${selector} should have styles`);
  }
  assert.match(styles, /pointer-events:\s*none;/, 'ambient effects should not block child interactions');
  assert.match(styles, /@keyframes\s+petBounce/, 'pet tap feedback should animate');
});

test('pet playground stage uses richer visual layers without blocking taps', async () => {
  const viewerSource = await readFile(new URL('../src/components/RealMediaViewer.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  for (const layer of ['pet-spotlight', 'playground-floor', 'stage-foreground', 'tap-hint-ring', 'decor-shelf']) {
    assert.match(viewerSource, new RegExp(layer), `${layer} should be present in the stage markup`);
  }
  for (const passiveLayer of ['pet-spotlight', 'playground-floor', 'stage-foreground', 'tap-hint-ring']) {
    assert.match(styles, new RegExp(`\\.${passiveLayer}\\s*{[^}]*pointer-events:\\s*none;`, 's'), `${passiveLayer} should not block pet taps`);
  }
  assert.match(styles, /\.decor-shelf\s*{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/s, 'decor buttons should sit in a balanced three-item shelf');
  assert.match(styles, /@keyframes\s+tapHintPulse/, 'tap affordance should have a gentle pulse');
});

test('home polish adds a sticker path and clearer active navigation', async () => {
  const dailySource = await readFile(new URL('../src/components/DailyQuestStrip.tsx', import.meta.url), 'utf8');
  const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(dailySource, /sticker-path/, 'daily quest steps should render as a sticker path');
  assert.match(dailySource, /--quest-progress/, 'daily quest path should expose progress for the fill track');
  assert.match(styles, /\.sticker-path::before/, 'daily quest path should draw a soft track');
  assert.match(styles, /\.sticker-path::after\s*{[^}]*width:\s*var\(--quest-progress\);/s, 'daily quest path should fill according to progress');
  assert.match(appSource, /isPetTabActive/, 'pet tab should stay active on the empty pet hub');
  assert.match(appSource, /aria-current=\{isPetTabActive \? 'page' : undefined\}/, 'active nav item should expose the current page');
  assert.match(styles, /\.bottom-tab-bar button\.active::after/, 'active nav item should have a visible indicator');
});

test('playground polish respects reduced motion settings', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/, 'motion-heavy polish should honor reduced motion settings');
  assert.match(styles, /animation:\s*none !important;/, 'reduced motion should stop decorative animations');
});

test('care controls are readable and tappable for six year old children', async () => {
  const careSource = await readFile(new URL('../src/components/CareActions.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  for (const label of ['吃饭', '喝水', '玩球', '看医生']) {
    assert.match(careSource, new RegExp(label), `care action should use short child-readable label ${label}`);
  }
  assert.match(careSource, /aria-label=\{action\.spokenLabel\}/, 'care actions should keep a clear spoken label');
  assert.match(careSource, /<small>\{action\.hint\}<\/small>/, 'care actions should include a short hint under the main label');
  assert.match(styles, /\.kid-care-panel \.care-action\s*{[^}]*min-height:\s*112px;/s, 'care buttons should be large enough for young children');
  assert.match(styles, /\.care-action strong/, 'care action labels should be visually emphasized');
});

test('playing ball gently consumes water so the drinking status changes', async () => {
  const storeSource = await readFile(new URL('../src/store/petStore.ts', import.meta.url), 'utf8');
  const serverStoreSource = await readFile(new URL('../../server/src/petLogic.ts', import.meta.url), 'utf8');
  const playCase = storeSource.match(/case 'play':([\s\S]*?)break;/)?.[1] ?? '';
  const serverPlayCase = serverStoreSource.match(/action === 'play'\)([\s\S]*?)\} else if/)?.[1] ?? '';

  assert.match(playCase, /next\.happiness\s*=\s*clamp01\(next\.happiness \+ 0\.22\);/, 'play should still make the pet happier');
  assert.match(playCase, /next\.thirst\s*=\s*clamp01\(next\.thirst - 0\.06\);/, 'play should make the pet a little thirsty');
  assert.match(playCase, /有点口渴/, 'play feedback should explain why drinking changed');
  assert.match(serverPlayCase, /next\.thirst\s*=\s*clamp01\(next\.thirst - 0\.06\);/, 'remote pet care should also make the pet a little thirsty');
  assert.match(serverPlayCase, /有点口渴/, 'remote play feedback should explain why drinking changed');
});

test('care buttons update pet state before optional sound playback', async () => {
  const careSource = await readFile(new URL('../src/components/CareActions.tsx', import.meta.url), 'utf8');
  const clickAction = careSource.match(/function clickAction\(action: CareAction\) \{([\s\S]*?)\n  \}/)?.[1] ?? '';

  assert.ok(clickAction.indexOf('onCare(action)') >= 0, 'care click should always call the pet care handler');
  assert.ok(clickAction.indexOf('playCareSoundSafely') >= 0, 'care click should use a protected optional sound helper');
  assert.ok(
    clickAction.indexOf('onCare(action)') < clickAction.indexOf('playCareSoundSafely'),
    'pet care should run before sound playback so blocked audio cannot stop status updates',
  );
  assert.match(careSource, /try\s*\{[\s\S]*playPetSound\(\{\s*petId,\s*animalId,\s*mood,\s*action\s*\}\);[\s\S]*\}\s*catch/s, 'sound playback should be isolated from the care state update');
});

test('home care sends the visible pet id to the remote care action', async () => {
  const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const remoteStoreSource = await readFile(new URL('../src/store/remotePetStore.ts', import.meta.url), 'utf8');

  assert.match(appSource, /const activePet = store\.activePet;/, 'home should capture the visible pet before wiring care actions');
  assert.match(appSource, /onCare=\{\(action\) => \{\s*void store\.doCare\(action,\s*activePet\.id\);\s*\}\}/s, 'home care should target the pet currently shown on screen');
  assert.match(remoteStoreSource, /const doCare = useCallback\(async \(action: CareAction,\s*petId\?: string\)/, 'remote care should accept an explicit pet id');
  assert.match(remoteStoreSource, /const targetPetId = petId \?\? state\.activePetId;/, 'remote care should fall back to the active pet id only when needed');
  assert.match(remoteStoreSource, /if \(!targetPetId\) return;/, 'remote care should guard only after resolving the target pet id');
  assert.match(remoteStoreSource, /`\/api\/pets\/\$\{targetPetId\}\/care`/, 'remote care request should use the resolved target pet id');
});

test('status cards use simple visual levels for young children', async () => {
  const statusSource = await readFile(new URL('../src/components/StatusBars.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(statusSource, /getStatusLevel/, 'status cards should map percentages to child-friendly levels');
  assert.match(statusSource, /status-card \$\{level\.className\}/, 'status cards should expose visual level classes');
  assert.match(statusSource, /level\.label/, 'status cards should show a simple status label');
  for (const className of ['status-good', 'status-ok', 'status-low']) {
    assert.match(styles, new RegExp(`\\.${className}`), `${className} should have a distinct visual treatment`);
  }
});

test('home navigation copy stays short enough for early readers', async () => {
  const planetSource = await readFile(new URL('../src/components/PlanetMap.tsx', import.meta.url), 'utf8');
  const gameHubSource = await readFile(new URL('../src/components/MiniGameHub.tsx', import.meta.url), 'utf8');

  for (const longHint of ['听声音、配食物、找家园', '安静拜访动物朋友']) {
    assert.doesNotMatch(planetSource, new RegExp(longHint), `${longHint} is too long for the home zone card`);
  }
  assert.match(planetSource, /听声音玩游戏/, 'game hint should keep navigation scannable');
  assert.match(gameHubSource, /去朋友家看看/, 'friends grassland should keep a short child-readable hint in game space');
});

test('dream garden polish adds gentle sticker layers without hiding the animal', async () => {
  const viewerSource = await readFile(new URL('../src/components/RealMediaViewer.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  for (const layer of ['garden-sticker flower-one', 'garden-sticker flower-two', 'garden-ribbon', 'garden-glow-path']) {
    assert.match(viewerSource, new RegExp(layer), `${layer} should be present in the pet stage`);
  }
  assert.match(styles, /\.garden-sticker\s*{[^}]*pointer-events:\s*none;/s, 'garden stickers should not block animal taps');
  assert.match(styles, /\.garden-ribbon\s*{[^}]*pointer-events:\s*none;/s, 'ribbon decoration should not block animal taps');
  assert.match(styles, /\.garden-glow-path\s*{[^}]*pointer-events:\s*none;/s, 'glow path should not block animal taps');
});

test('dream garden theme uses mixed soft colors instead of one-note pink', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(styles, /--garden-blush:\s*#ffe0ed;/, 'theme should include a soft blush accent');
  assert.match(styles, /--garden-lavender:\s*#e9ddff;/, 'theme should include lavender for variety');
  assert.match(styles, /--garden-mint:\s*#dff8e6;/, 'theme should keep mint/green freshness');
  assert.match(styles, /--garden-cream:\s*#fff6d8;/, 'theme should include warm cream');
  assert.match(styles, /\.garden-dream-home/, 'home should expose a dream garden theme hook');
});

test('dream garden controls stay child sized and sticker like', async () => {
  const homeSource = await readFile(new URL('../src/pages/HomePage.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(homeSource, /garden-dream-home/, 'home page should opt into dream garden styling');
  assert.match(styles, /\.garden-dream-home \.care-action\s*{[^}]*border-radius:\s*28px;/s, 'care actions should feel like rounded stickers');
  assert.match(styles, /\.garden-dream-home \.daily-step\s*{[^}]*min-height:\s*96px;/s, 'daily stickers should remain tappable and readable');
  assert.match(styles, /\.garden-dream-home \.planet-zone\s*{[^}]*box-shadow:/s, 'zone cards should gain a richer sticker shadow');
});

test('refined garden stage blends decorations into the real animal photo', async () => {
  const viewerSource = await readFile(new URL('../src/components/RealMediaViewer.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  for (const layer of ['garden-depth-frame', 'photo-soft-vignette', 'sticker-shadow-wash']) {
    assert.match(viewerSource, new RegExp(layer), `${layer} should be present in the stage`);
    assert.match(styles, new RegExp(`\\.${layer}\\s*{[^}]*pointer-events:\\s*none;`, 's'), `${layer} should not block taps`);
  }
  assert.match(styles, /\.photo-soft-vignette\s*{[^}]*mix-blend-mode:\s*soft-light;/s, 'photo vignette should gently blend with real photos');
  assert.match(styles, /\.sticker-shadow-wash\s*{[^}]*filter:\s*blur\(10px\);/s, 'sticker shadows should feel integrated instead of pasted on');
});

test('daily quest becomes a star collection path without shrinking tap targets', async () => {
  const dailySource = await readFile(new URL('../src/components/DailyQuestStrip.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(dailySource, /star-collect-path/, 'daily quest should opt into the star collection path');
  assert.match(styles, /\.star-collect-path::before/, 'star path should keep a visible track');
  assert.match(styles, /\.star-collect-path::after\s*{[^}]*width:\s*var\(--quest-progress\);/s, 'star path should still fill by progress');
  assert.match(styles, /\.garden-dream-home \.daily-step\.done span\s*{[^}]*box-shadow:[^}]*rgba\(255,\s*214,\s*107,\s*0\.42\)/s, 'completed stars should glow warmly');
  assert.match(styles, /\.garden-dream-home \.daily-step\s*{[^}]*min-height:\s*96px;/s, 'daily steps should remain large enough to tap');
});

test('home page adds a thirty day growth star chain with flipped stage images', async () => {
  const homeSource = await readFile(new URL('../src/pages/HomePage.tsx', import.meta.url), 'utf8');
  const chainSource = await readFile(new URL('../src/components/GrowthStarChain.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(homeSource, /GrowthStarChain/, 'home should place the growth chain near the pet stage');
  assert.match(chainSource, /TOTAL_GROWTH_DAYS/, 'growth chain should use the shared 30 day rule');
  assert.match(chainSource, /Array\.from\(\{ length: TOTAL_GROWTH_DAYS \}/, 'growth chain should render 30 nodes');
  assert.match(chainSource, /isRevealed/, 'grown days should flip from star to animal image');
  assert.match(chainSource, /thumbnailUrl/, 'revealed days should use the stage thumbnail image');
  assert.match(chainSource, /growth-star-node locked/, 'future days should stay as small stars');
  assert.match(chainSource, /第 \{day\} 天/, 'each node should expose its day number for children and screen readers');
  assert.match(styles, /\.growth-star-chain/, 'growth chain should have a dedicated visual container');
  assert.match(styles, /\.growth-star-track/, 'growth chain should draw a pretty path');
  assert.match(styles, /\.growth-star-node\.revealed/, 'revealed days should have image-state styling');
  assert.match(styles, /\.growth-star-node\.locked/, 'future days should have star-state styling');
  assert.match(styles, /\.growth-star-node\.current/, 'current day should be visually highlighted');
});

test('game space owns friends grassland as a child-sized destination', async () => {
  const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const challengeSource = await readFile(new URL('../src/pages/ChallengePage.tsx', import.meta.url), 'utf8');
  const hubSource = await readFile(new URL('../src/components/MiniGameHub.tsx', import.meta.url), 'utf8');

  assert.match(appSource, /onOpenFriends=\{\(\) => setView\('friends'\)\}/, 'app should wire friends grassland through game space');
  assert.match(challengeSource, /onOpenFriends/, 'game space page should accept the friends entry action');
  assert.match(hubSource, /好友草地/, 'game hub should show friends grassland as an entry');
  assert.match(hubSource, /onOpenFriends\(\)/, 'friends tile should open the friends page instead of acting like a mini game');
});

test('growth star chain can enlarge a day, shrink it again, and play feedback sound', async () => {
  const chainSource = await readFile(new URL('../src/components/GrowthStarChain.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(chainSource, /expandedDay.*useState</, 'growth chain should remember the enlarged day');
  assert.match(chainSource, /setExpandedDay\(expandedDay === day \? undefined : day\)/, 'clicking the same day should shrink the preview');
  assert.match(chainSource, /playStarBuddySound/, 'growth chain should play a gentle UI sound on tap');
  assert.match(chainSource, /growth-star-preview/, 'growth chain should render a larger readable preview');
  assert.match(chainSource, /growth-star-node .*expanded/, 'the selected node should expose an expanded class');
  assert.match(styles, /\.growth-star-node\.expanded \.growth-star-face/, 'expanded node should be visually larger');
  assert.match(styles, /\.growth-star-preview/, 'enlarged day preview should have a dedicated layout');
  assert.match(styles, /\.growth-star-face\s*{[^}]*width:\s*72px;[^}]*height:\s*72px;/s, 'desktop star faces should be large enough to see');
});

test('growth star chain shows recent ten days first and folds the rest into a playful box', async () => {
  const chainSource = await readFile(new URL('../src/components/GrowthStarChain.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(chainSource, /RECENT_GROWTH_DAYS\s*=\s*10/, 'growth chain should keep only ten days visible by default');
  assert.match(chainSource, /showAllDays.*useState</, 'growth chain should remember whether the folded stars are open');
  assert.match(chainSource, /recentDays/, 'growth chain should compute the recent visible day window');
  assert.match(chainSource, /hiddenDays/, 'growth chain should keep the remaining days separate from the default view');
  assert.match(chainSource, /growth-star-track recent/, 'recent days should render in the main readable track');
  assert.match(chainSource, /growth-star-more-toggle/, 'folded days should have a large child-friendly toggle');
  assert.match(chainSource, /星光宝盒/, 'folded growth days should use playful child-facing copy');
  assert.match(chainSource, /growth-star-hidden-track/, 'expanded older days should render in their own folded area');
  assert.match(chainSource, /aria-expanded=\{showAllDays\}/, 'the folded star box should expose its open state');
  assert.match(styles, /\.growth-star-track\.recent\s*{[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\);/s, 'recent ten days should sit in two tidy rows');
  assert.match(styles, /\.growth-star-more-toggle/, 'star box toggle should have dedicated cartoon styling');
  assert.match(styles, /\.growth-star-hidden-track/, 'folded days should have a dedicated compact layout');
  assert.match(styles, /\.growth-star-node\.current::after/, 'current day should get an obvious today badge');
});

test('growth star chain uses a magical light box and playful curved path effects', async () => {
  const chainSource = await readFile(new URL('../src/components/GrowthStarChain.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.doesNotMatch(chainSource, /星星宝盒/, 'folded copy should use 星光宝盒 instead of 星星宝盒');
  assert.match(chainSource, /星光宝盒/, 'folded copy should say 星光宝盒');
  assert.match(chainSource, /growth-star-light-path/, 'the recent star track should include a decorative light path');
  assert.match(chainSource, /growth-star-sparkles/, 'the recent star track should include small sparkle effects');
  assert.match(styles, /\.growth-star-light-path/, 'curved light path should have dedicated styling');
  assert.match(styles, /border-radius:\s*58% 42% 56% 44%/, 'light path should avoid a straight boxed line');
  assert.match(styles, /@keyframes\s+starPathGlow/, 'light path should gently animate');
  assert.match(styles, /\.growth-star-sparkles i:nth-child\(2\)/, 'sparkle points should be placed independently along the path');
  assert.match(styles, /@keyframes\s+starSparkleTwinkle/, 'sparkle points should twinkle');
});

test('bottom navigation feels like a soft child tray with clear active state', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(styles, /\.bottom-tab-bar\s*{[^}]*width:\s*min\(1120px,\s*calc\(100vw - 28px\)\);/s, 'desktop bottom nav should align with the main 1120px content width');
  assert.match(styles, /\.selection-mobile-page\s*{[^}]*width:\s*min\(1120px,\s*calc\(100vw - 28px\)\);/s, 'selection page should align with the bottom nav width on desktop');
  assert.match(styles, /\.selection-mobile-grid\s*{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/s, 'selection animal cards should use balanced desktop columns');
  assert.match(styles, /\.one-screen-home\s*{[^}]*max-width:\s*min\(1120px,\s*calc\(100vw - 28px\)\);/s, 'pet home should not stretch wider than the shared app width');
  assert.match(styles, /\.game-space-page\s*{[^}]*width:\s*min\(1120px,\s*calc\(100vw - 28px\)\);/s, 'game space should align with the bottom nav width on desktop');
  assert.match(styles, /@media \(max-width: 640px\)\s*{[\s\S]*?\.bottom-tab-bar\s*{[^}]*width:\s*min\(100%,\s*calc\(100vw - 24px\)\);/s, 'small-screen bottom nav should align with the page content inset');
  assert.match(styles, /\.bottom-tab-bar::before\s*{[^}]*pointer-events:\s*none;/s, 'bottom tray decoration should never block navigation taps');
  assert.match(styles, /\.bottom-tab-bar::before\s*{[^}]*background:[^}]*linear-gradient/s, 'bottom nav should have a soft tray highlight');
  assert.match(styles, /\.bottom-tab-bar button\.active::after/, 'active nav item should keep a visible indicator');
  assert.match(styles, /\.bottom-tab-bar button:focus-visible/, 'navigation should keep keyboard focus visible');
});

test('sound studio keeps record actions visible above the bottom navigation', async () => {
  const source = await readFile(new URL('../src/components/SoundStudioPanel.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(source, /sound-studio-scroll-area/, 'sound cards should sit in a scrollable studio body');
  assert.match(source, /sound-studio-action-tray/, 'record, preview, save, and retry buttons should live in a persistent action tray');
  assert.match(source, /createPortal\(dialog,\s*document\.body\)/, 'sound studio modal should escape the scrolled home layout');
  for (const label of ['试听', '保存给宠物', '再来一次', '恢复系统声音']) {
    assert.match(source, new RegExp(label), `sound studio should expose ${label}`);
  }
  assert.match(styles, /\.sound-studio-backdrop\s*{[^}]*z-index:\s*120;/s, 'sound studio dialog should sit above the fixed bottom nav');
  assert.match(styles, /\.sound-studio-panel\s*{[^}]*grid-template-rows:\s*auto minmax\(0,\s*1fr\) auto;/s, 'dialog should reserve a visible footer row for actions');
  assert.match(styles, /\.sound-studio-scroll-area\s*{[^}]*overflow-y:\s*auto;/s, 'studio card area should scroll independently');
  assert.match(styles, /\.sound-studio-action-tray\s*{[^}]*position:\s*sticky;/s, 'action tray should stay visible inside the dialog');
  assert.match(styles, /\.sound-studio-controls\s*{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/s, 'action buttons should use a stable child-friendly grid');
  assert.match(styles, /@media \(max-width: 760px\)\s*{[\s\S]*?\.sound-studio-controls\s*{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s, 'narrow screens should keep action buttons in two compact columns');
  assert.doesNotMatch(styles, /@media \(max-width: 420px\)\s*{[\s\S]*?\.sound-studio-controls\s*{[^}]*grid-template-columns:\s*1fr;/s, 'very narrow screens should not stack all sound actions into one hidden column');
});
