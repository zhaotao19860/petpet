import { useEffect, useState } from 'react';
import { AchievementsPage } from './pages/AchievementsPage';
import { AdoptionChallengePage } from './pages/AdoptionChallengePage';
import { ChallengePage } from './pages/ChallengePage';
import { CelebrationToast, type CelebrationToastData } from './components/CelebrationToast';
import { AuthPage } from './pages/AuthPage';
import { EmptyGamePage } from './pages/EmptyGamePage';
import { EmptyLearnPage } from './pages/EmptyLearnPage';
import { FriendsPage } from './pages/FriendsPage';
import { HomePage } from './pages/HomePage';
import { SelectionPage } from './pages/SelectionPage';
import { StarBuddyPanel } from './components/StarBuddyPanel';
import { StoryLearnPage } from './pages/StoryLearnPage';
import { UserHubPage } from './pages/UserHubPage';
import { useRemotePetStore } from './store/remotePetStore';

type AppView = 'hub' | 'select' | 'gate' | 'home' | 'challenge' | 'learn' | 'friends' | 'achievements';

function App() {
  const store = useRemotePetStore();
  const [view, setView] = useState<AppView>('hub');
  const [celebration, setCelebration] = useState<CelebrationToastData>();

  function showCelebration(kind: CelebrationToastData['kind'], title: string, detail: string) {
    const id = Date.now();
    setCelebration({ id, kind, title, detail });
    window.setTimeout(() => {
      setCelebration((current) => (current?.id === id ? undefined : current));
    }, 2800);
  }

  useEffect(() => {
    if (store.activePet && store.activeAnimal && view === 'hub') {
      setView('home');
    }
  }, [store.activeAnimal, store.activePet, view]);

  function startChallenge(animalId: string, name: string) {
    store.startPendingAdoption(animalId, name);
    setView('gate');
  }

  async function completeGate() {
    await store.completePendingAdoption();
    setView('home');
  }

  function openPetHome() {
    setView(store.activePet && store.activeAnimal ? 'home' : 'hub');
  }

  function openPetLearn() {
    setView('learn');
  }

  function openPetRecord() {
    setView('challenge');
  }

  function openAchievements() {
    setView('achievements');
  }

  function unlockWithCelebration(achievementId?: string) {
    if (!achievementId) return;
    const achievement = store.achievements.find((item) => item.id === achievementId);
    const alreadyUnlocked = Boolean(achievement?.unlockedAt);
    void store.unlock(achievementId);
    if (!alreadyUnlocked && achievement) {
      showCelebration('new-achievement', achievement.title, achievement.description);
    }
  }

  function claimDailyReward() {
    const alreadyClaimed = Boolean(store.activeDailyQuest?.steps.reward.done);
    void store.markDailyQuest('reward');
    if (!alreadyClaimed) {
      showCelebration('daily-sticker', '今日贴纸收好啦', '完成一轮今日星球任务');
    }
  }

  if (store.loading) {
    return (
      <main className="auth-page">
        <section className="auth-loading-card" role="status" aria-live="polite">
          <div className="auth-loading-badge">
            <img src="/petpet-logo.svg" alt="" aria-hidden="true" />
          </div>
          <p className="auth-loading-kicker">正在整理动物小屋</p>
          <strong>马上进入宠宠星球</strong>
          <div className="auth-loading-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </section>
      </main>
    );
  }

  if (!store.isAuthenticated) {
    return <AuthPage onLogin={store.login} onRegister={store.register} loading={store.loading} error={store.authError} />;
  }

  let content = <UserHubPage user={store.activeUser} pets={store.state.pets} activePetId={store.state.activePetId} onSelectPet={(petId) => { void store.selectPet(petId); setView('home'); }} onAddPet={() => setView('select')} />;

  if (view === 'select') {
    content = <SelectionPage onStartChallenge={startChallenge} onBack={() => setView('hub')} />;
  } else if (view === 'gate' && store.pendingAnimal && store.state.pendingAdoption) {
    content = <AdoptionChallengePage animal={store.pendingAnimal} petName={store.state.pendingAdoption.name} onPass={completeGate} onBack={() => { store.cancelPendingAdoption(); setView('select'); }} />;
  } else if (view === 'home' && store.activePet && store.activeAnimal) {
    const activePet = store.activePet;
    content = (
      <HomePage
        animal={store.activeAnimal}
        pet={activePet}
        pets={store.state.pets}
        onCare={(action) => {
          void store.doCare(action, activePet.id);
        }}
        onAddPet={() => setView('select')}
        onSelectPet={(petId) => { void store.selectPet(petId); }}
      />
    );
  } else if (view === 'challenge' && store.activePet && store.activeAnimal) {
    content = <ChallengePage animal={store.activeAnimal} pet={store.activePet} achievements={store.achievements} onUnlock={unlockWithCelebration} onCompleteGame={() => { void store.markDailyQuest('play'); }} onBack={() => setView('home')} onOpenFriends={() => setView('friends')} />;
  } else if (view === 'challenge') {
    content = <EmptyGamePage onAddPet={() => setView('select')} />;
  } else if (view === 'learn' && store.activePet && store.activeAnimal) {
    content = <StoryLearnPage animal={store.activeAnimal} pet={store.activePet} onLearn={() => { void store.markDailyQuest('learn'); }} />;
  } else if (view === 'learn') {
    content = <EmptyLearnPage onAddPet={() => setView('select')} />;
  } else if (view === 'friends' && store.activePet && store.activeAnimal) {
    content = <FriendsPage />;
  } else if (view === 'achievements') {
    content = <AchievementsPage achievements={store.achievements} />;
  }

  const isPetTabActive = view === 'home' || view === 'hub' || view === 'select' || view === 'gate';

  return (
    <main className="app-shell">
      <header className="brand-header" aria-label="petpet宠宠星球">
        <img src="/petpet-logo.svg" alt="petpet宠宠星球 logo" className="brand-logo" />
        <div>
          <strong>petpet宠宠星球</strong>
          <span>真实动物观察、照护与知识挑战</span>
        </div>
      </header>
      <button className="app-header-logout" type="button" onClick={() => { void store.logout(); setView('hub'); }} aria-label="退出登录">退出</button>
      {content}
      <nav className="bottom-tab-bar" aria-label="底部导航">
        <button className={isPetTabActive ? 'active' : ''} type="button" aria-current={isPetTabActive ? 'page' : undefined} onClick={openPetHome}>
          <span>🐾</span>
          <strong>我的宠物</strong>
        </button>
        <button className={view === 'learn' ? 'active' : ''} type="button" aria-current={view === 'learn' ? 'page' : undefined} onClick={openPetLearn}>
          <span>📖</span>
          <strong>宠物百科</strong>
        </button>
        <button className={view === 'challenge' ? 'active' : ''} type="button" aria-current={view === 'challenge' ? 'page' : undefined} onClick={openPetRecord}>
          <span>🎮</span>
          <strong>游戏空间</strong>
        </button>
        <button className={view === 'achievements' ? 'active' : ''} type="button" aria-current={view === 'achievements' ? 'page' : undefined} onClick={openAchievements}>
          <span>🏆</span>
          <strong>成就</strong>
        </button>
      </nav>
      {store.activePet && <StarBuddyPanel pet={store.activePet} />}
      <CelebrationToast toast={celebration} />
    </main>
  );
}

export default App;
