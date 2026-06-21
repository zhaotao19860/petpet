import { useState } from 'react';

export function AuthPage({ onLogin, onRegister, loading, error }: { onLogin: (username: string, password: string) => Promise<void>; onRegister: (username: string, password: string, displayName: string) => Promise<void>; loading: boolean; error?: string }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');

  async function submit() {
    if (mode === 'login') {
      await onLogin(username, password);
    } else {
      await onRegister(username, password, displayName);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-art">
          <div className="auth-logo-badge">
            <img src="/petpet-logo.svg" alt="petpet宠宠星球" />
          </div>
          <p className="auth-kicker">儿童动物乐园</p>
          <h1>petpet宠宠星球</h1>
          <p>登录后，每个小朋友的动物伙伴都会安全分开保存。</p>
          <div className="auth-feature-row" aria-label="登录后可用功能">
            <span>🐾 养成</span>
            <span>📖 百科</span>
            <span>🎮 游戏</span>
          </div>
        </div>
        <div className="auth-form">
          <div className="auth-form-title">
            <span>{mode === 'login' ? '欢迎回来' : '创建小小观察员'}</span>
            <strong>{mode === 'login' ? '进入我的动物小队' : '开始新的动物旅程'}</strong>
          </div>
          <div className="auth-tabs" role="tablist" aria-label="登录注册">
            <button className={mode === 'login' ? 'active' : ''} type="button" onClick={() => setMode('login')}>登录</button>
            <button className={mode === 'register' ? 'active' : ''} type="button" onClick={() => setMode('register')}>注册</button>
          </div>
          <label>用户名<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" /></label>
          {mode === 'register' && <label>昵称<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="nickname" /></label>}
          <label>密码<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
          {error && <p className="auth-error">{error}</p>}
          <button className="primary-button wide" type="button" disabled={loading} onClick={submit}>{loading ? '请稍等' : mode === 'login' ? '登录' : '注册'}</button>
        </div>
      </section>
    </main>
  );
}
