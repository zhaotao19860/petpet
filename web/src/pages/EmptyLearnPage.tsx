export function EmptyLearnPage({ onAddPet }: { onAddPet: () => void }) {
  return (
    <section className="empty-learn-page">
      <div className="empty-learn-hero">
        <p className="eyebrow">宠物百科</p>
        <h1>先翻翻动物小知识</h1>
        <p>还没有动物伙伴也可以先学习：看看动物吃什么、住哪里、怎么睡觉，选伙伴时更有把握。</p>
        <button className="primary-button" type="button" onClick={onAddPet}>选择动物伙伴</button>
      </div>
      <div className="empty-learn-grid" aria-label="动物小知识">
        <article><span>🥗</span><strong>吃什么</strong><small>认识安全食物</small></article>
        <article><span>🏡</span><strong>住哪里</strong><small>观察真实栖息地</small></article>
        <article><span>🌙</span><strong>怎么休息</strong><small>学会安静陪伴</small></article>
        <article><span>🩺</span><strong>怎么照护</strong><small>遇到不舒服找大人</small></article>
      </div>
    </section>
  );
}
