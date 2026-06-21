import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('frontend uses auth page and remote api-backed pet state', async () => {
  const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const apiSource = await readFile(new URL('../src/utils/apiClient.ts', import.meta.url), 'utf8');
  const storeSource = await readFile(new URL('../src/store/remotePetStore.ts', import.meta.url), 'utf8');
  const authSource = await readFile(new URL('../src/pages/AuthPage.tsx', import.meta.url), 'utf8');

  assert.match(appSource, /AuthPage/, 'app should render auth page for unauthenticated users');
  assert.match(appSource, /useRemotePetStore/, 'app should use the API-backed store');
  assert.match(apiSource, /credentials:\s*'include'/, 'API requests should include HttpOnly session cookies');
  assert.doesNotMatch(storeSource, /localStorage\.setItem\(['"]petpet-planet\.state/, 'remote store should not persist core user data to localStorage');
  assert.match(authSource, /登录/, 'auth page should expose login');
  assert.match(authSource, /注册/, 'auth page should expose register');
});

test('auth page stays polished and aligned with the child playground layout', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const authPageBlock = styles.match(/\.auth-page\s*{(?<body>[^}]*)}/s)?.groups?.body ?? '';

  assert.match(styles, /\.auth-page\s*{[^}]*display:\s*grid;[^}]*place-items:\s*center;/s, 'auth page should center the login experience');
  assert.match(authPageBlock, /(?:^|\n)\s*height:\s*100dvh;/, 'auth page should be a fixed viewport scroll container instead of pushing document scroll');
  assert.match(styles, /\.auth-page\s*{[^}]*overflow-y:\s*auto;/s, 'auth page should scroll when the form is taller than the viewport');
  assert.match(styles, /\.auth-page\s*{[^}]*-webkit-overflow-scrolling:\s*touch;/s, 'auth page should keep native mobile momentum scrolling');
  assert.match(styles, /\.auth-card\s*{[^}]*width:\s*min\([^;]+calc\(100vw - 32px\)[^;]*\);/s, 'auth card should stop growing before it hits the viewport edges');
  assert.match(styles, /\.auth-card\s*{[^}]*max-width:\s*1040px;/s, 'auth card should align with the app content width');
  assert.match(styles, /\.auth-card\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*0\.95fr\)\s+minmax\(320px,\s*1fr\);/s, 'auth card should use a balanced desktop split');
  assert.match(styles, /\.auth-art h1\s*{[^}]*font-size:\s*clamp\(2\.35rem,\s*6vw,\s*4\.75rem\);/s, 'auth title should not inherit the oversized global h1 scale');
  assert.match(styles, /@media \(max-width:\s*760px\)\s*{[\s\S]*?\.auth-card\s*{[^}]*grid-template-columns:\s*1fr;/s, 'auth card should collapse cleanly on small screens');
});

test('login loading state is soft and child-friendly instead of a large headline', async () => {
  const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(appSource, /className="auth-loading-card"/, 'loading state should use a dedicated polished card');
  assert.match(appSource, /role="status"/, 'loading state should be announced politely for assistive tech');
  assert.match(appSource, /className="auth-loading-dots"/, 'loading state should use a gentle visual progress cue');
  assert.doesNotMatch(appSource, /if \(store\.loading\)\s*{[\s\S]*?<h1>正在进入宠宠星球<\/h1>/, 'loading state should not render the old oversized headline');
  assert.match(styles, /\.auth-loading-card\s*{[^}]*max-width:\s*420px;/s, 'loading card should stay compact instead of stretching like the full auth form');
  assert.match(styles, /\.auth-loading-dots\s*{[^}]*grid-template-columns:\s*repeat\(3,\s*12px\);/s, 'loading indicator should be simple and stable');
  assert.match(styles, /@keyframes\s+authLoadingBounce/, 'loading dots should have a named gentle animation');
  assert.match(styles, /@media \(prefers-reduced-motion:\s*reduce\)\s*{[\s\S]*?animation:\s*none\s*!important;/s, 'loading animation should respect reduced motion');
});

test('empty accounts route bottom tabs to distinct child-friendly screens', async () => {
  const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const emptySource = await readFile(new URL('../src/pages/EmptyGamePage.tsx', import.meta.url), 'utf8');
  const emptyLearnSource = await readFile(new URL('../src/pages/EmptyLearnPage.tsx', import.meta.url), 'utf8');

  assert.match(appSource, /EmptyGamePage/, 'app should render a dedicated game screen before the first pet is adopted');
  assert.match(appSource, /EmptyLearnPage/, 'app should render a dedicated encyclopedia screen before the first pet is adopted');
  assert.match(appSource, /function openPetHome\(\)\s*{\s*setView\(store\.activePet && store\.activeAnimal \? 'home' : 'hub'\);/s, 'pet tab should return empty accounts to the pet hub, not animal selection');
  assert.match(appSource, /function openPetLearn\(\)\s*{\s*setView\('learn'\);/s, 'encyclopedia tab should own its empty state');
  assert.doesNotMatch(appSource, /function openPetLearn\(\)\s*{\s*setView\(store\.activePet && store\.activeAnimal \? 'learn' : 'select'\);/s, 'encyclopedia tab should not duplicate the pet selection route');
  assert.doesNotMatch(appSource, /function openPetRecord\(\)\s*{\s*setView\(store\.activePet && store\.activeAnimal \? 'challenge' : 'hub'\);/s, 'game tab should not fall back to account center');
  assert.match(emptySource, /游戏空间/, 'empty game page should clearly identify the game tab');
  assert.match(emptySource, /选择动物伙伴/, 'empty game page should guide children to adopt before playing');
  assert.match(emptyLearnSource, /宠物百科/, 'empty encyclopedia page should clearly identify the encyclopedia tab');
  assert.match(emptyLearnSource, /动物小知识/, 'empty encyclopedia page should offer browseable learning content');
});

test('user hub uses a compact child-friendly dashboard instead of admin-like panels', async () => {
  const hubSource = await readFile(new URL('../src/pages/UserHubPage.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(hubSource, /hub-stats/, 'hub should show simple visual stats');
  assert.match(hubSource, /hub-adventure-actions/, 'hub should expose clear child-friendly actions');
  assert.match(hubSource, /empty-pet-adventure/, 'hub should use a playful empty-pet state');
  assert.doesNotMatch(hubSource, /<input value=\{name\} readOnly/, 'hub should not show a fake read-only account input');
  assert.doesNotMatch(hubSource, /退出登录|onLogout/, 'hub should not duplicate the global logout action');
  assert.match(styles, /\.hub-layout\s*{[^}]*max-width:\s*1120px;/s, 'hub should align with other app content');
  assert.match(styles, /\.hub-hero\s*{[^}]*grid-column:\s*1\s*\/\s*-1;/s, 'hub hero should be a full-width dashboard banner');
  assert.match(styles, /\.hub-hero\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(220px,\s*240px\);/s, 'hub hero action column should keep a stable desktop proportion');
  assert.match(styles, /\.hub-adventure-actions\s*{[^}]*justify-items:\s*stretch;/s, 'hub action buttons should align to the same width');
  assert.match(styles, /\.empty-pet-adventure\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto;/s, 'empty state should have a designed two-part layout on desktop');
});

test('logout clears the visible account state immediately', async () => {
  const storeSource = await readFile(new URL('../src/store/remotePetStore.ts', import.meta.url), 'utf8');

  assert.match(storeSource, /const logout = useCallback\(async \(\) => \{\s*setState\(\{ pets: \[\], achievements: freshAchievements\(\), dailyQuests: \{\} \}\);/s, 'logout should clear visible user state before waiting on the network');
  assert.match(storeSource, /catch\s*\([^)]*\)\s*\{\s*setAuthError\(/s, 'logout should handle network failures without leaving the user stuck');
});

test('authenticated app shell keeps logout visible after navigating away from the user hub', async () => {
  const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(appSource, /className="app-header-logout"/, 'authenticated shell should render a global logout action');
  assert.match(appSource, /onClick=\{\(\) => \{ void store\.logout\(\); setView\('hub'\); \}\}/, 'global logout should call the remote logout action and reset the current view');
  assert.match(styles, /\.app-header-logout/, 'global logout should have dedicated shell styles');
});

test('bodyless API actions do not force an empty JSON request body', async () => {
  const apiSource = await readFile(new URL('../src/utils/apiClient.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(apiSource, /headers:\s*\{\s*['"]Content-Type['"]\s*:\s*['"]application\/json['"]/s, 'api client should not always send a JSON content type');
  assert.match(apiSource, /options\.body\s*!==\s*undefined|typeof options\.body\s*!==\s*['"]undefined['"]/s, 'api client should only add JSON content type when a request body exists');
});

test('friend page exposes search visit and interaction controls', async () => {
  const friendsSource = await readFile(new URL('../src/pages/FriendsPage.tsx', import.meta.url), 'utf8');

  for (const text of ['搜索用户', '发送好友请求', '拜访', '打招呼', '点赞', '送贴纸', '鼓励', '陪玩']) {
    assert.match(friendsSource, new RegExp(text), `friends page should include ${text}`);
  }
  assert.match(friendsSource, /friend:\s*PublicUser/, 'friends page should use the server-provided friend profile');
  assert.doesNotMatch(friendsSource, /const friendId = friendship\.requesterId/, 'friends page should not assume requester is always the friend');
  assert.match(friendsSource, /acceptFriendRequest/, 'friends page should let addressees accept incoming friend requests');
});

test('friend refresh button shows progress and reloads opened friend pets', async () => {
  const friendsSource = await readFile(new URL('../src/pages/FriendsPage.tsx', import.meta.url), 'utf8');

  assert.match(friendsSource, /refreshFriendships/, 'refresh button should use a dedicated visible refresh action');
  assert.match(friendsSource, /refreshingFriends/, 'refresh button should expose a loading state');
  assert.match(friendsSource, /aria-busy=\{refreshingFriends\}/, 'refresh button should announce that it is working');
  assert.match(friendsSource, /正在刷新/, 'refresh button should change copy while loading');
  assert.match(friendsSource, /刷新好了/, 'refresh should update the page message after it completes');
  assert.match(friendsSource, /expandedFriendIds/, 'refresh should know which friend pet lists are open');
  assert.match(friendsSource, /Promise\.all\(expandedFriendIds\.map/, 'refresh should reload opened friend pet lists');
  assert.match(friendsSource, /onClick=\{refreshFriendships\}/, 'refresh button should be wired to the visible refresh action');
  assert.doesNotMatch(friendsSource, /onClick=\{loadFriendships\}>刷新好友/, 'refresh button should not silently call the background loader');
});
