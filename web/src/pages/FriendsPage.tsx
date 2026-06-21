import { useEffect, useState } from 'react';
import type { PetInstance } from '../models/pet';
import { apiRequest } from '../utils/apiClient';

interface PublicUser {
  id: string;
  username: string;
  displayName: string;
}

interface FriendshipView {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: 'pending' | 'accepted';
  direction: 'incoming' | 'outgoing';
  friend: PublicUser;
}

const interactionButtons = [
  { kind: 'wave', label: '打招呼', icon: '👋' },
  { kind: 'like', label: '点赞', icon: '⭐' },
  { kind: 'gift_sticker', label: '送贴纸', icon: '🎀' },
  { kind: 'encourage', label: '鼓励', icon: '🌈' },
  { kind: 'play', label: '陪玩', icon: '🎮' },
];

export function FriendsPage() {
  const [username, setUsername] = useState('');
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [friendships, setFriendships] = useState<FriendshipView[]>([]);
  const [friendPets, setFriendPets] = useState<Record<string, PetInstance[]>>({});
  const [expandedFriendIds, setExpandedFriendIds] = useState<string[]>([]);
  const [refreshingFriends, setRefreshingFriends] = useState(false);
  const [message, setMessage] = useState('搜索用户，去好友家拜访动物伙伴。');

  useEffect(() => {
    void loadFriendships();
  }, []);

  async function searchUsers() {
    if (!username.trim()) {
      setUsers([]);
      setMessage('先输入好友的用户名。');
      return;
    }
    const data = await apiRequest<{ users: PublicUser[] }>(`/api/users/search?username=${encodeURIComponent(username)}`);
    setUsers(data.users);
    setMessage(data.users.length > 0 ? '找到可以添加的好友啦。' : '没有找到这个用户名。');
  }

  async function sendFriendRequest(userId: string) {
    await apiRequest('/api/friendships', { method: 'POST', body: JSON.stringify({ addresseeId: userId }) });
    await loadFriendships();
    setMessage('发送好友请求成功。');
  }

  async function acceptFriendRequest(friendshipId: string) {
    await apiRequest(`/api/friendships/${friendshipId}/accept`, { method: 'POST' });
    await loadFriendships();
    setMessage('已经成为好友，可以去拜访啦。');
  }

  async function loadFriendships() {
    const data = await apiRequest<{ friendships: FriendshipView[] }>('/api/friendships');
    setFriendships(data.friendships);
    return data.friendships;
  }

  async function refreshFriendships() {
    if (refreshingFriends) return;
    setRefreshingFriends(true);
    setMessage('正在刷新好友草地...');
    try {
      const nextFriendships = await loadFriendships();
      await Promise.all(expandedFriendIds.map(async (friendId) => {
        const stillAccepted = nextFriendships.some((friendship) => friendship.friend.id === friendId && friendship.status === 'accepted');
        if (stillAccepted) await loadFriendPets(friendId, false);
      }));
      setMessage(nextFriendships.length > 0 ? '刷新好了，好友草地更新啦。' : '刷新好了，还没有好友，可以先搜索用户名。');
    } catch {
      setMessage('刷新失败了，等网络好一点再试。');
    } finally {
      setRefreshingFriends(false);
    }
  }

  async function loadFriendPets(userId: string, showMessage = true) {
    const data = await apiRequest<{ pets: PetInstance[] }>(`/api/friends/${userId}/pets`);
    setFriendPets((current) => ({ ...current, [userId]: data.pets }));
    setExpandedFriendIds((current) => current.includes(userId) ? current : [...current, userId]);
    if (showMessage) setMessage('可以拜访好友的动物伙伴啦。');
  }

  async function visitPet(petId: string) {
    await apiRequest(`/api/pets/${petId}/visit`, { method: 'POST' });
    setMessage('拜访成功，动物伙伴看见你啦。');
  }

  async function interact(petId: string, kind: string, label: string) {
    try {
      await apiRequest(`/api/pets/${petId}/interactions`, { method: 'POST', body: JSON.stringify({ kind }) });
      setMessage(`${label}成功，好友的伙伴很开心。`);
    } catch {
      setMessage('今天已经互动过啦，明天再来看看。');
    }
  }

  return (
    <section className="friends-page">
      <header className="friends-header">
        <p className="eyebrow">好友草地</p>
        <h1>去朋友家看看</h1>
        <p>{message}</p>
      </header>

      <section className="panel friend-search-panel">
        <h2>搜索用户</h2>
        <div className="friend-search-row">
          <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="输入好友用户名" aria-label="搜索用户" />
          <button className="primary-button" type="button" onClick={searchUsers}>搜索用户</button>
          <button className="ghost-button" type="button" onClick={refreshFriendships} disabled={refreshingFriends} aria-busy={refreshingFriends}>{refreshingFriends ? '正在刷新' : '刷新好友'}</button>
        </div>
        <div className="friend-result-list">
          {users.map((user) => (
            <article className="friend-result-card" key={user.id}>
              <div>
                <strong>{user.displayName || user.username}</strong>
                <span>@{user.username}</span>
              </div>
              <button type="button" onClick={() => sendFriendRequest(user.id)}>发送好友请求</button>
            </article>
          ))}
        </div>
      </section>

      <section className="panel friend-list-panel">
        <div className="section-title">
          <div>
            <p className="eyebrow">好友列表</p>
            <h2>可以拜访的伙伴</h2>
          </div>
        </div>
        <div className="friend-result-list">
          {friendships.length === 0 && <p className="friend-empty-note">还没有好友，可以先搜索用户名。</p>}
          {friendships.map((friendship) => {
            const friendId = friendship.friend.id;
            const friendName = friendship.friend.displayName || friendship.friend.username;
            const pets = friendPets[friendId] ?? [];
            return (
              <article className="friend-result-card" key={friendship.id}>
                <div>
                  <strong>{friendName}</strong>
                  <span>@{friendship.friend.username}</span>
                </div>
                <small>{friendship.status === 'accepted' ? '已成为好友' : friendship.direction === 'incoming' ? '想和你成为好友' : '等待对方同意'}</small>
                {friendship.status === 'pending' && friendship.direction === 'incoming' && <button type="button" onClick={() => acceptFriendRequest(friendship.id)}>同意</button>}
                {friendship.status === 'accepted' && <button type="button" onClick={() => loadFriendPets(friendId)}>拜访</button>}
                {pets.map((pet) => (
                  <div className="friend-pet-visit" key={pet.id}>
                    <strong>{pet.name}</strong>
                    <button type="button" onClick={() => visitPet(pet.id)}>拜访</button>
                    <div className="friend-interaction-row">
                      {interactionButtons.map((item) => (
                        <button key={item.kind} type="button" onClick={() => interact(pet.id, item.kind, item.label)}>{item.icon} {item.label}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
