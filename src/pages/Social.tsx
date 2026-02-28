import { useState } from 'react';
import {
    Users, Activity, Trophy, Search, UserPlus, UserCheck,
    UserX, Clock, Dumbbell, Flame, X, Check, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useFriends, useActivityFeed, useReactions, useLeaderboard } from '../lib/socialHooks';
import type { FeedItem, FriendProfile } from '../lib/socialHooks';
import type { WorkoutReaction } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDuration, formatRelative } from '../lib/utils';
import './Social.css';

type Tab = 'feed' | 'friends' | 'leaderboard';
const EMOJIS: Array<'💪' | '🔥' | '👏'> = ['💪', '🔥', '👏'];

export default function Social() {
    const [activeTab, setActiveTab] = useState<Tab>('feed');
    const { pendingRequests } = useFriends();

    return (
        <div className="page-container">
            <div className="page-header animate-slide-up">
                <h1>Social</h1>
                <p>See what your friends are up to</p>
            </div>

            <div className="social-tabs">
                <button
                    className={`social-tab ${activeTab === 'feed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('feed')}
                >
                    <Activity size={16} />
                    Feed
                </button>
                <button
                    className={`social-tab ${activeTab === 'friends' ? 'active' : ''}`}
                    onClick={() => setActiveTab('friends')}
                >
                    <Users size={16} />
                    Friends
                    {pendingRequests.length > 0 && (
                        <span className="tab-badge">{pendingRequests.length}</span>
                    )}
                </button>
                <button
                    className={`social-tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('leaderboard')}
                >
                    <Trophy size={16} />
                    Leaderboard
                </button>
            </div>

            {activeTab === 'feed' && <FeedTab />}
            {activeTab === 'friends' && <FriendsTab />}
            {activeTab === 'leaderboard' && <LeaderboardTab />}
        </div>
    );
}

// ============ FEED TAB ============

function FeedTab() {
    const { feedItems, loading, fetchFeed } = useActivityFeed();
    const { toggleReaction } = useReactions();
    const { user } = useAuth();

    const handleReaction = async (workoutId: string, emoji: '💪' | '🔥' | '👏', reactions: WorkoutReaction[]) => {
        await toggleReaction(workoutId, emoji, reactions);
        await fetchFeed();
    };

    if (loading) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">
                    <Activity size={32} />
                </div>
                <h3>Loading feed...</h3>
            </div>
        );
    }

    if (feedItems.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">
                    <Activity size={32} />
                </div>
                <h3>No activity yet</h3>
                <p>Add some friends to see their workouts here, or complete a workout yourself!</p>
            </div>
        );
    }

    return (
        <div className="feed-list">
            {feedItems.map((item) => (
                <FeedCard
                    key={item.workout.id}
                    item={item}
                    currentUserId={user?.id || ''}
                    onReaction={handleReaction}
                />
            ))}
        </div>
    );
}

function FeedCard({
    item,
    currentUserId,
    onReaction,
}: {
    item: FeedItem;
    currentUserId: string;
    onReaction: (workoutId: string, emoji: '💪' | '🔥' | '👏', reactions: WorkoutReaction[]) => void;
}) {
    const { workout, profile, reactions, isOwnWorkout } = item;
    const initial = profile.display_name?.[0]?.toUpperCase() || '?';

    return (
        <div className="feed-card">
            <div className="feed-card-header">
                <div className={`feed-avatar ${isOwnWorkout ? 'self' : ''}`}>
                    {initial}
                </div>
                <div className="feed-user-info">
                    <span className="feed-user-name">
                        {isOwnWorkout ? 'You' : (profile.display_name || 'Unknown')}
                    </span>
                    <span className="feed-time">
                        {workout.completed_at ? formatRelative(workout.completed_at) : ''}
                    </span>
                </div>
            </div>

            <div className="feed-card-body">
                <div className="feed-workout-icon">
                    <Dumbbell size={22} />
                </div>
                <div className="feed-workout-details">
                    <span className="feed-workout-name">{workout.name}</span>
                    <div className="feed-workout-meta">
                        {workout.duration_seconds && (
                            <span>
                                <Clock size={12} />
                                {formatDuration(workout.duration_seconds)}
                            </span>
                        )}
                        <span>
                            completed
                        </span>
                    </div>
                </div>
            </div>

            <div className="feed-reactions">
                {EMOJIS.map(emoji => {
                    const count = reactions.filter(r => r.emoji === emoji).length;
                    const isActive = reactions.some(r => r.emoji === emoji && r.user_id === currentUserId);
                    return (
                        <button
                            key={emoji}
                            className={`reaction-btn ${isActive ? 'active' : ''}`}
                            onClick={() => onReaction(workout.id, emoji, reactions)}
                        >
                            <span className="reaction-emoji">{emoji}</span>
                            {count > 0 && <span className="reaction-count">{count}</span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ============ FRIENDS TAB ============

function FriendsTab() {
    const {
        friends, pendingRequests, loading,
        searchUserByEmail, sendFriendRequest,
        acceptRequest, declineRequest, removeFriend,
    } = useFriends();
    const [searchEmail, setSearchEmail] = useState('');
    const [searchResult, setSearchResult] = useState<{ id: string; display_name: string | null; avatar_url: string | null } | null>(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState('');

    const handleSearch = async () => {
        if (!searchEmail.trim()) return;
        setSearchLoading(true);
        setSearchError('');
        setSearchResult(null);

        const result = await searchUserByEmail(searchEmail);
        if (result) {
            // Check if already friends or pending
            const existing = [...friends, ...pendingRequests].find(f => f.id === result.id);
            if (existing) {
                setSearchError('You already have a connection with this user');
            } else {
                setSearchResult(result);
            }
        } else {
            setSearchError('No user found with that email');
        }
        setSearchLoading(false);
    };

    const handleSendRequest = async (userId: string) => {
        const success = await sendFriendRequest(userId);
        if (success) {
            toast.success('Friend request sent!');
            setSearchResult(null);
            setSearchEmail('');
        } else {
            toast.error('Could not send request. You may already be connected.');
        }
    };

    const handleAccept = async (friendshipId: string) => {
        const success = await acceptRequest(friendshipId);
        if (success) toast.success('Friend request accepted!');
    };

    const handleDecline = async (friendshipId: string) => {
        const success = await declineRequest(friendshipId);
        if (success) toast('Request declined');
    };

    const handleRemove = async (friendshipId: string, name: string) => {
        if (!confirm(`Remove ${name} from friends?`)) return;
        const success = await removeFriend(friendshipId);
        if (success) toast.success('Friend removed');
    };

    return (
        <div>
            {/* Search */}
            <div className="friends-search">
                <input
                    className="input"
                    type="email"
                    placeholder="Search by email..."
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button
                    className="btn btn-primary"
                    onClick={handleSearch}
                    disabled={searchLoading || !searchEmail.trim()}
                >
                    <Search size={16} />
                    {searchLoading ? 'Searching...' : 'Search'}
                </button>
            </div>

            {/* Search Result */}
            {searchResult && (
                <div className="search-result-card">
                    <div className="feed-avatar">
                        {searchResult.display_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="friend-info">
                        <span className="friend-name">{searchResult.display_name || 'Unknown'}</span>
                        <span className="friend-status">Found user</span>
                    </div>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleSendRequest(searchResult.id)}
                    >
                        <UserPlus size={14} />
                        Add Friend
                    </button>
                    <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => setSearchResult(null)}
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {searchError && (
                <div style={{
                    color: 'var(--text-secondary)',
                    fontSize: 'var(--font-sm)',
                    marginBottom: 'var(--space-xl)',
                    padding: 'var(--space-md)',
                    background: 'var(--bg-glass)',
                    borderRadius: 'var(--radius-md)',
                }}>
                    {searchError}
                </div>
            )}

            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
                <div className="friends-section">
                    <div className="friends-section-title">
                        <UserCheck size={14} />
                        Pending Requests ({pendingRequests.length})
                    </div>
                    {pendingRequests.map((req: FriendProfile) => (
                        <div key={req.friendship_id} className="friend-card">
                            <div className="feed-avatar">
                                {req.display_name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div className="friend-info">
                                <span className="friend-name">{req.display_name || 'Unknown'}</span>
                                <span className="friend-status">Wants to be your friend</span>
                            </div>
                            <div className="friend-actions">
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleAccept(req.friendship_id)}
                                >
                                    <Check size={14} />
                                    Accept
                                </button>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => handleDecline(req.friendship_id)}
                                >
                                    <UserX size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Friends List */}
            <div className="friends-section">
                <div className="friends-section-title">
                    <Users size={14} />
                    Your Friends ({friends.length})
                </div>
                {loading ? (
                    <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                        <p style={{ marginBottom: 0 }}>Loading friends...</p>
                    </div>
                ) : friends.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <Users size={32} />
                        </div>
                        <h3>No friends yet</h3>
                        <p>Search for friends by their email address above to get started!</p>
                    </div>
                ) : (
                    friends.map((friend: FriendProfile) => (
                        <div key={friend.friendship_id} className="friend-card">
                            <div className="feed-avatar">
                                {friend.display_name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div className="friend-info">
                                <span className="friend-name">{friend.display_name || 'Unknown'}</span>
                                <span className="friend-status">Friends since {new Date(friend.updated_at).toLocaleDateString()}</span>
                            </div>
                            <div className="friend-actions">
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleRemove(friend.friendship_id, friend.display_name || 'this user')}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// ============ LEADERBOARD TAB ============

function LeaderboardTab() {
    const { entries, loading } = useLeaderboard();

    if (loading) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">
                    <Trophy size={32} />
                </div>
                <h3>Loading leaderboard...</h3>
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">
                    <Trophy size={32} />
                </div>
                <h3>No leaderboard data</h3>
                <p>Add friends and start working out to see the leaderboard!</p>
            </div>
        );
    }

    return (
        <div className="leaderboard-list">
            {entries.map((entry, index) => {
                const rank = index + 1;
                const rankClass = rank <= 3 ? `top-${rank}` : '';
                const initial = entry.profile.display_name?.[0]?.toUpperCase() || '?';

                return (
                    <div
                        key={entry.profile.id}
                        className={`leaderboard-card ${rankClass} ${entry.isCurrentUser ? 'current-user' : ''}`}
                    >
                        <div className="leaderboard-rank">
                            {rank === 1 ? '👑' : `#${rank}`}
                        </div>
                        <div className={`feed-avatar ${entry.isCurrentUser ? 'self' : ''}`}>
                            {initial}
                        </div>
                        <div className="leaderboard-info">
                            <span className="leaderboard-name">
                                {entry.isCurrentUser ? 'You' : (entry.profile.display_name || 'Unknown')}
                                {entry.isCurrentUser && <span className="you-badge">(you)</span>}
                            </span>
                        </div>
                        <div className="leaderboard-stats">
                            <div className="leaderboard-stat streak">
                                <span className="leaderboard-stat-value">
                                    <Flame size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} />
                                    {entry.currentStreak}
                                </span>
                                <span className="leaderboard-stat-label">Streak</span>
                            </div>
                            <div className="leaderboard-stat">
                                <span className="leaderboard-stat-value">{entry.weeklyWorkouts}</span>
                                <span className="leaderboard-stat-label">This Week</span>
                            </div>
                            <div className="leaderboard-stat">
                                <span className="leaderboard-stat-value">{entry.totalWorkouts}</span>
                                <span className="leaderboard-stat-label">Total</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
