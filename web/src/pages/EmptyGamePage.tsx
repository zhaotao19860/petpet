export function EmptyGamePage({ onAddPet }: { onAddPet: () => void }) {
  return (
    <section className="empty-game-page">
      <div className="empty-game-hero">
        <p className="eyebrow">游戏空间</p>
        <h1>游戏岛在等动物伙伴</h1>
        <p>先选择动物伙伴，再来听声音、配食物、找家园和翻知识卡。</p>
        <button className="primary-button" type="button" onClick={onAddPet}>选择动物伙伴</button>
      </div>
      <div className="empty-game-grid" aria-label="可玩的小游戏">
        <article><span>🎧</span><strong>听声识动物</strong></article>
        <article><span>🥗</span><strong>食物分类</strong></article>
        <article><span>🏞️</span><strong>栖息地配对</strong></article>
        <article><span>🧩</span><strong>记忆翻牌</strong></article>
      </div>
    </section>
  );
}
