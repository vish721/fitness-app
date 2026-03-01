import { useState } from 'react';
import {
    Users, Activity, Trophy, Search, UserPlus, UserCheck,
    UserX, Clock, Dumbbell, Flame, X, Check, Trash2,
    Target, Plus, Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useFriends, useActivityFeed, useReactions, useLeaderboard, useChallenges } from '../lib/socialHooks';
import type { FeedItem, FriendProfile, ChallengeWithParticipants } from '../lib/socialHooks';
import type { WorkoutReaction } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDuration, formatRelative, formatDate } from '../lib/utils';
import './Social.css';

type Tab = 'feed' | 'friends' | 'leaderboard' | 'challenges';
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
                <button
                    className={`social-tab ${activeTab === 'challenges' ? 'active' : ''}`}
                    onClick={() => setActiveTab('challenges')}
                >
                    <Target size={16} />
                    Challenges
                </button>
            </div>

            {activeTab === 'feed' && <FeedTab />}
            {activeTab === 'friends' && <FriendsTab />}
            {activeTab === 'leaderboard' && <LeaderboardTab />}
            {activeTab === 'challenges' && <ChallengesTab />}
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
        searchUser, sendFriendRequest,
        acceptRequest, declineRequest, removeFriend,
    } = useFriends();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState<{ id: string; display_name: string | null; username: string | null; avatar_url: string | null } | null>(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState('');

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearchLoading(true);
        setSearchError('');
        setSearchResult(null);

        const result = await searchUser(searchQuery);
        if (result) {
            const existing = [...friends, ...pendingRequests].find(f => f.id === result.id);
            if (existing) {
                setSearchError('You already have a connection with this user');
            } else {
                setSearchResult(result);
            }
        } else {
            setSearchError('No user found with that email or username');
        }
        setSearchLoading(false);
    };

    const handleSendRequest = async (userId: string) => {
        const success = await sendFriendRequest(userId);
        if (success) {
            toast.success('Friend request sent!');
            setSearchResult(null);
            setSearchQuery('');
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
                    type="text"
                    placeholder="Search by username or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button
                    className="btn btn-primary"
                    onClick={handleSearch}
                    disabled={searchLoading || !searchQuery.trim()}
                >
                    <Search size={16} />
                    {searchLoading ? 'Searching...' : 'Search'}
                </button>
            </div>

            {searchResult && (
                <div className="search-result-card">
                    <div className="feed-avatar">
                        {searchResult.display_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="friend-info">
                        <span className="friend-name">{searchResult.display_name || 'Unknown'}</span>
                        <span className="friend-status">{searchResult.username ? `@${searchResult.username}` : 'Found user'}</span>
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
                                <span className="friend-status">{req.username ? `@${req.username} · ` : ''}Wants to be your friend</span>
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
                        <p>Search for friends by their username or email above to get started!</p>
                    </div>
                ) : (
                    friends.map((friend: FriendProfile) => (
                        <div key={friend.friendship_id} className="friend-card">
                            <div className="feed-avatar">
                                {friend.display_name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div className="friend-info">
                                <span className="friend-name">{friend.display_name || 'Unknown'}</span>
                                <span className="friend-status">{friend.username ? `@${friend.username} · ` : ''}Friends since {new Date(friend.updated_at).toLocaleDateString()}</span>
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

// ============ CHALLENGES TAB ============

const CHALLENGE_TYPES = [
    { value: 'workout_count' as const, label: 'Workout Count', icon: Dumbbell, desc: 'Who can do the most workouts' },
    { value: 'streak' as const, label: 'Streak', icon: Flame, desc: 'Longest consecutive workout streak' },
    { value: 'volume' as const, label: 'Total Volume', icon: Target, desc: 'Most total weight lifted (kg)' },
];

function ChallengesTab() {
    const { challenges, loading, createChallenge, joinChallenge, leaveChallenge, deleteChallenge } = useChallenges();
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [challengeType, setChallengeType] = useState<'streak' | 'workout_count' | 'volume'>('workout_count');
    const [targetValue, setTargetValue] = useState('10');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );

    const handleCreate = async () => {
        if (!title.trim()) {
            toast.error('Enter a challenge title');
            return;
        }
        const success = await createChallenge({
            title,
            description: description || undefined,
            challenge_type: challengeType,
            target_value: parseInt(targetValue) || 10,
            start_date: startDate,
            end_date: endDate,
        });
        if (success) {
            toast.success('Challenge created! 🎯');
            setShowForm(false);
            setTitle('');
            setDescription('');
        }
    };

    const handleJoin = async (id: string) => {
        const success = await joinChallenge(id);
        if (success) toast.success('Joined challenge!');
    };

    const handleLeave = async (id: string) => {
        const success = await leaveChallenge(id);
        if (success) toast('Left challenge');
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this challenge?')) return;
        const success = await deleteChallenge(id);
        if (success) toast.success('Challenge deleted');
    };

    if (loading) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon"><Target size={32} /></div>
                <h3>Loading challenges...</h3>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-lg)' }}>
                <h3>Active Challenges</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
                    <Plus size={14} /> New Challenge
                </button>
            </div>

            {showForm && (
                <div className="card challenge-form animate-slide-up" style={{ marginBottom: 'var(--space-lg)' }}>
                    <div className="input-group">
                        <label>Challenge Title</label>
                        <input
                            className="input"
                            placeholder="e.g. 7-Day Workout Streak"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="input-group" style={{ marginTop: 'var(--space-md)' }}>
                        <label>Description (optional)</label>
                        <textarea
                            className="input"
                            placeholder="What's the challenge about?"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            style={{ minHeight: '60px' }}
                        />
                    </div>
                    <div className="challenge-type-selector" style={{ marginTop: 'var(--space-md)' }}>
                        <label className="text-sm text-secondary" style={{ fontWeight: 500, marginBottom: 'var(--space-sm)', display: 'block' }}>Challenge Type</label>
                        <div className="challenge-type-options">
                            {CHALLENGE_TYPES.map(ct => (
                                <button
                                    key={ct.value}
                                    className={`challenge-type-option ${challengeType === ct.value ? 'active' : ''}`}
                                    onClick={() => setChallengeType(ct.value)}
                                >
                                    <ct.icon size={18} />
                                    <span>{ct.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-3" style={{ gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                        <div className="input-group">
                            <label>Target</label>
                            <input
                                className="input"
                                type="number"
                                value={targetValue}
                                onChange={e => setTargetValue(e.target.value)}
                            />
                        </div>
                        <div className="input-group">
                            <label>Start Date</label>
                            <input
                                className="input"
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="input-group">
                            <label>End Date</label>
                            <input
                                className="input"
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex gap-md" style={{ marginTop: 'var(--space-lg)' }}>
                        <button className="btn btn-primary" onClick={handleCreate}>Create Challenge</button>
                        <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                    </div>
                </div>
            )}

            {challenges.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon"><Target size={32} /></div>
                    <h3>No challenges yet</h3>
                    <p>Create a challenge and invite your friends to compete!</p>
                </div>
            ) : (
                <div className="challenges-list">
                    {challenges.map(challenge => (
                        <ChallengeCard
                            key={challenge.id}
                            challenge={challenge}
                            onJoin={handleJoin}
                            onLeave={handleLeave}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function ChallengeCard({
    challenge,
    onJoin,
    onLeave,
    onDelete,
}: {
    challenge: ChallengeWithParticipants;
    onJoin: (id: string) => void;
    onLeave: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    const typeInfo = CHALLENGE_TYPES.find(t => t.value === challenge.challenge_type);
    const TypeIcon = typeInfo?.icon || Target;
    const now = new Date();
    const endDate = new Date(challenge.end_date);
    const startDateObj = new Date(challenge.start_date);
    const isActive = now >= startDateObj && now <= endDate;
    const isEnded = now > endDate;
    const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    // Sort participants by progress
    const sortedParticipants = [...challenge.participants].sort((a, b) => b.progress - a.progress);

    return (
        <div className={`challenge-card ${isEnded ? 'ended' : ''}`}>
            <div className="challenge-card-header">
                <div className="challenge-type-badge">
                    <TypeIcon size={16} />
                </div>
                <div className="challenge-card-info">
                    <span className="challenge-title">{challenge.title}</span>
                    <div className="challenge-meta">
                        <span>
                            <Calendar size={12} />
                            {formatDate(challenge.start_date)} → {formatDate(challenge.end_date)}
                        </span>
                        {isActive && <span className="badge badge-success">{daysLeft}d left</span>}
                        {isEnded && <span className="badge badge-danger">Ended</span>}
                        {!isActive && !isEnded && <span className="badge badge-primary">Upcoming</span>}
                    </div>
                </div>
                <div className="challenge-actions">
                    {!challenge.isParticipant && !isEnded && (
                        <button className="btn btn-primary btn-sm" onClick={() => onJoin(challenge.id)}>Join</button>
                    )}
                    {challenge.isParticipant && !isEnded && (
                        <button className="btn btn-ghost btn-sm" onClick={() => onLeave(challenge.id)}>Leave</button>
                    )}
                    {challenge.isCreator && (
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onDelete(challenge.id)}>
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>

            {challenge.description && (
                <p className="challenge-description">{challenge.description}</p>
            )}

            {/* Target & Progress */}
            <div className="challenge-target">
                <span className="text-sm text-secondary">
                    Target: <strong>{challenge.target_value}</strong> {challenge.challenge_type === 'volume' ? 'kg' : challenge.challenge_type === 'workout_count' ? 'workouts' : 'days'}
                </span>
            </div>

            {/* Participants */}
            {sortedParticipants.length > 0 && (
                <div className="challenge-participants">
                    {sortedParticipants.map((p, idx) => {
                        const progressPct = Math.min(100, (p.progress / challenge.target_value) * 100);
                        return (
                            <div key={p.user_id} className="challenge-participant">
                                <span className="challenge-participant-rank">
                                    {idx === 0 && sortedParticipants.length > 1 ? '👑' : `#${idx + 1}`}
                                </span>
                                <span className="challenge-participant-name">
                                    {p.display_name || 'Unknown'}
                                </span>
                                <div className="challenge-progress-bar">
                                    <div
                                        className="challenge-progress-fill"
                                        style={{ width: `${progressPct}%` }}
                                    />
                                </div>
                                <span className="challenge-participant-progress">
                                    {p.progress}/{challenge.target_value}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
