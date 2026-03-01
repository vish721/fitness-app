import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import type { Friendship, WorkoutReaction, Profile, Workout } from './supabase';
import { useAuth } from '../contexts/AuthContext';
import { differenceInDays, isSameDay, startOfWeek } from 'date-fns';

// ============ FRIENDS ============

export type FriendProfile = Profile & {
    friendship_id: string;
    friendship_status: Friendship['status'];
    is_requester: boolean;
    username: string | null;
};

export function useFriends() {
    const { user } = useAuth();
    const [friends, setFriends] = useState<FriendProfile[]>([]);
    const [pendingRequests, setPendingRequests] = useState<FriendProfile[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchFriends = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        const { data: friendships, error } = await supabase
            .from('friendships')
            .select('*')
            .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

        if (error || !friendships) {
            setLoading(false);
            return;
        }

        const friendUserIds = friendships.map(f =>
            f.requester_id === user.id ? f.addressee_id : f.requester_id
        );

        if (friendUserIds.length === 0) {
            setFriends([]);
            setPendingRequests([]);
            setLoading(false);
            return;
        }

        const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .in('id', friendUserIds);

        if (!profiles) {
            setLoading(false);
            return;
        }

        const enriched: FriendProfile[] = friendships.map(f => {
            const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
            const profile = profiles.find(p => p.id === friendId);
            return {
                id: friendId,
                display_name: profile?.display_name || 'Unknown',
                username: profile?.username || null,
                avatar_url: profile?.avatar_url || null,
                created_at: profile?.created_at || f.created_at,
                updated_at: profile?.updated_at || f.updated_at,
                friendship_id: f.id,
                friendship_status: f.status,
                is_requester: f.requester_id === user.id,
            };
        });

        setFriends(enriched.filter(f => f.friendship_status === 'accepted'));
        setPendingRequests(enriched.filter(f =>
            f.friendship_status === 'pending' && !f.is_requester
        ));
        setLoading(false);
    }, [user]);

    useEffect(() => { fetchFriends(); }, [fetchFriends]);

    const searchUser = async (searchTerm: string): Promise<Profile | null> => {
        const { data, error } = await supabase.rpc('search_user', {
            search_term: searchTerm.toLowerCase().trim(),
        });
        if (error || !data || data.length === 0) return null;
        return data[0] as Profile;
    };

    const sendFriendRequest = async (addresseeId: string) => {
        if (!user) return false;

        // Check if friendship already exists in either direction
        const { data: existing } = await supabase
            .from('friendships')
            .select('id, status')
            .or(
                `and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`
            );

        if (existing && existing.length > 0) {
            const row = existing[0];
            // If pending or accepted, block the new request
            if (row.status === 'pending' || row.status === 'accepted') return false;
            // If declined or blocked, delete the old row so we can re-add
            await supabase.from('friendships').delete().eq('id', row.id);
        }

        const { error } = await supabase
            .from('friendships')
            .insert({ requester_id: user.id, addressee_id: addresseeId });

        if (!error) await fetchFriends();
        return !error;
    };

    const acceptRequest = async (friendshipId: string) => {
        const { error } = await supabase
            .from('friendships')
            .update({ status: 'accepted', updated_at: new Date().toISOString() })
            .eq('id', friendshipId);

        if (!error) await fetchFriends();
        return !error;
    };

    const declineRequest = async (friendshipId: string) => {
        const { error } = await supabase
            .from('friendships')
            .update({ status: 'declined', updated_at: new Date().toISOString() })
            .eq('id', friendshipId);

        if (!error) await fetchFriends();
        return !error;
    };

    const removeFriend = async (friendshipId: string) => {
        const { error } = await supabase
            .from('friendships')
            .delete()
            .eq('id', friendshipId);

        if (!error) await fetchFriends();
        return !error;
    };

    return {
        friends,
        pendingRequests,
        loading,
        fetchFriends,
        searchUser,
        sendFriendRequest,
        acceptRequest,
        declineRequest,
        removeFriend,
    };
}

// ============ ACTIVITY FEED ============

export type FeedItem = {
    workout: Workout;
    profile: Profile;
    reactions: WorkoutReaction[];
    isOwnWorkout: boolean;
};

export function useActivityFeed() {
    const { user } = useAuth();
    const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchFeed = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        // Get accepted friends
        const { data: friendships } = await supabase
            .from('friendships')
            .select('*')
            .eq('status', 'accepted')
            .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

        if (!friendships || friendships.length === 0) {
            setFeedItems([]);
            setLoading(false);
            return;
        }

        const friendIds = friendships.map(f =>
            f.requester_id === user.id ? f.addressee_id : f.requester_id
        );

        // Include own workouts in the feed too
        const allUserIds = [user.id, ...friendIds];

        // Get recent completed workouts from friends + self
        const { data: workouts } = await supabase
            .from('workouts')
            .select('*')
            .in('user_id', allUserIds)
            .not('completed_at', 'is', null)
            .order('completed_at', { ascending: false })
            .limit(50);

        if (!workouts || workouts.length === 0) {
            setFeedItems([]);
            setLoading(false);
            return;
        }

        // Get profiles for all users
        const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .in('id', allUserIds);

        // Get reactions for these workouts
        const workoutIds = workouts.map(w => w.id);
        const { data: reactions } = await supabase
            .from('workout_reactions')
            .select('*')
            .in('workout_id', workoutIds);

        const items: FeedItem[] = workouts.map(workout => ({
            workout: workout as Workout,
            profile: (profiles?.find(p => p.id === workout.user_id) || {
                id: workout.user_id,
                display_name: 'Unknown',
                avatar_url: null,
                created_at: '',
                updated_at: '',
            }) as Profile,
            reactions: (reactions?.filter(r => r.workout_id === workout.id) || []) as WorkoutReaction[],
            isOwnWorkout: workout.user_id === user.id,
        }));

        setFeedItems(items);
        setLoading(false);
    }, [user]);

    useEffect(() => { fetchFeed(); }, [fetchFeed]);

    return { feedItems, loading, fetchFeed };
}

// ============ REACTIONS ============

export function useReactions() {
    const { user } = useAuth();

    const addReaction = async (workoutId: string, emoji: '💪' | '🔥' | '👏') => {
        if (!user) return false;
        const { error } = await supabase
            .from('workout_reactions')
            .insert({ workout_id: workoutId, user_id: user.id, emoji });
        return !error;
    };

    const removeReaction = async (workoutId: string, emoji: '💪' | '🔥' | '👏') => {
        if (!user) return false;
        const { error } = await supabase
            .from('workout_reactions')
            .delete()
            .eq('workout_id', workoutId)
            .eq('user_id', user.id)
            .eq('emoji', emoji);
        return !error;
    };

    const toggleReaction = async (workoutId: string, emoji: '💪' | '🔥' | '👏', currentReactions: WorkoutReaction[]) => {
        if (!user) return false;
        const existing = currentReactions.find(r => r.user_id === user.id && r.emoji === emoji);
        if (existing) {
            return removeReaction(workoutId, emoji);
        } else {
            return addReaction(workoutId, emoji);
        }
    };

    return { addReaction, removeReaction, toggleReaction };
}

// ============ LEADERBOARD ============

export type LeaderboardEntry = {
    profile: Profile;
    currentStreak: number;
    weeklyWorkouts: number;
    totalWorkouts: number;
    isCurrentUser: boolean;
};

export function useLeaderboard() {
    const { user } = useAuth();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLeaderboard = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        // Get accepted friends
        const { data: friendships } = await supabase
            .from('friendships')
            .select('*')
            .eq('status', 'accepted')
            .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

        const friendIds = (friendships || []).map(f =>
            f.requester_id === user.id ? f.addressee_id : f.requester_id
        );

        const allUserIds = [user.id, ...friendIds];

        // Get profiles
        const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .in('id', allUserIds);

        // Get all completed workouts for these users
        const { data: workouts } = await supabase
            .from('workouts')
            .select('user_id, started_at, completed_at')
            .in('user_id', allUserIds)
            .not('completed_at', 'is', null)
            .order('started_at', { ascending: false });

        if (!profiles || !workouts) {
            setLoading(false);
            return;
        }

        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

        const leaderboard: LeaderboardEntry[] = allUserIds.map(userId => {
            const profile = profiles.find(p => p.id === userId) || {
                id: userId,
                display_name: 'Unknown',
                avatar_url: null,
                created_at: '',
                updated_at: '',
            };

            const userWorkouts = workouts.filter(w => w.user_id === userId);
            const workoutDates = userWorkouts.map(w => new Date(w.started_at));

            // Calculate streak
            const sorted = [...workoutDates].sort((a, b) => b.getTime() - a.getTime());
            const uniqueDays = sorted.reduce<Date[]>((acc, date) => {
                if (acc.length === 0 || !isSameDay(acc[acc.length - 1], date)) {
                    acc.push(date);
                }
                return acc;
            }, []);

            let currentStreak = 0;
            if (uniqueDays.length > 0) {
                const today = new Date();
                const daysSinceLast = differenceInDays(today, uniqueDays[0]);
                if (daysSinceLast <= 1) {
                    currentStreak = 1;
                    for (let i = 1; i < uniqueDays.length; i++) {
                        if (differenceInDays(uniqueDays[i - 1], uniqueDays[i]) <= 1) {
                            currentStreak++;
                        } else {
                            break;
                        }
                    }
                }
            }

            // Weekly workouts
            const weeklyWorkouts = workoutDates.filter(d => d >= weekStart).length;

            return {
                profile: profile as Profile,
                currentStreak,
                weeklyWorkouts,
                totalWorkouts: userWorkouts.length,
                isCurrentUser: userId === user.id,
            };
        });

        // Sort by streak desc, then weekly workouts desc
        leaderboard.sort((a, b) => {
            if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak;
            return b.weeklyWorkouts - a.weeklyWorkouts;
        });

        setEntries(leaderboard);
        setLoading(false);
    }, [user]);

    useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

    return { entries, loading, fetchLeaderboard };
}

// ============ CHALLENGES ============

export type ChallengeWithParticipants = {
    id: string;
    creator_id: string;
    title: string;
    description: string | null;
    challenge_type: 'streak' | 'workout_count' | 'volume';
    target_value: number;
    start_date: string;
    end_date: string;
    created_at: string;
    participants: {
        user_id: string;
        display_name: string | null;
        progress: number;
    }[];
    isCreator: boolean;
    isParticipant: boolean;
    userProgress: number;
};

export function useChallenges() {
    const { user } = useAuth();
    const [challenges, setChallenges] = useState<ChallengeWithParticipants[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchChallenges = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        // Get friend IDs
        const { data: friendships } = await supabase
            .from('friendships')
            .select('*')
            .eq('status', 'accepted')
            .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

        const friendIds = (friendships || []).map(f =>
            f.requester_id === user.id ? f.addressee_id : f.requester_id
        );
        const allUserIds = [user.id, ...friendIds];

        // Get challenges where creator is self or friend
        const { data: challengeData } = await supabase
            .from('challenges')
            .select('*')
            .in('creator_id', allUserIds)
            .order('created_at', { ascending: false });

        if (!challengeData || challengeData.length === 0) {
            setChallenges([]);
            setLoading(false);
            return;
        }

        // Get participants for these challenges
        const challengeIds = challengeData.map(c => c.id);
        const { data: participants } = await supabase
            .from('challenge_participants')
            .select('*')
            .in('challenge_id', challengeIds);

        // Get profiles for all participant user IDs
        const participantUserIds = [...new Set((participants || []).map(p => p.user_id))];
        const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .in('id', participantUserIds.length > 0 ? participantUserIds : ['__none__']);

        const enriched: ChallengeWithParticipants[] = challengeData.map(c => {
            const challengeParticipants = (participants || []).filter(p => p.challenge_id === c.id);
            const userParticipant = challengeParticipants.find(p => p.user_id === user.id);

            return {
                ...c,
                participants: challengeParticipants.map(p => ({
                    user_id: p.user_id,
                    display_name: profiles?.find(pr => pr.id === p.user_id)?.display_name || 'Unknown',
                    progress: p.progress,
                })),
                isCreator: c.creator_id === user.id,
                isParticipant: !!userParticipant,
                userProgress: userParticipant?.progress || 0,
            };
        });

        setChallenges(enriched);
        setLoading(false);
    }, [user]);

    useEffect(() => { fetchChallenges(); }, [fetchChallenges]);

    const createChallenge = async (challenge: {
        title: string;
        description?: string;
        challenge_type: 'streak' | 'workout_count' | 'volume';
        target_value: number;
        start_date: string;
        end_date: string;
    }) => {
        if (!user) return false;

        const { data, error } = await supabase
            .from('challenges')
            .insert({
                creator_id: user.id,
                title: challenge.title,
                description: challenge.description || null,
                challenge_type: challenge.challenge_type,
                target_value: challenge.target_value,
                start_date: challenge.start_date,
                end_date: challenge.end_date,
            })
            .select()
            .single();

        if (error || !data) return false;

        // Auto-join creator
        await supabase.from('challenge_participants').insert({
            challenge_id: data.id,
            user_id: user.id,
            progress: 0,
        });

        await fetchChallenges();
        return true;
    };

    const joinChallenge = async (challengeId: string) => {
        if (!user) return false;
        const { error } = await supabase
            .from('challenge_participants')
            .insert({ challenge_id: challengeId, user_id: user.id, progress: 0 });

        if (!error) await fetchChallenges();
        return !error;
    };

    const leaveChallenge = async (challengeId: string) => {
        if (!user) return false;
        const { error } = await supabase
            .from('challenge_participants')
            .delete()
            .eq('challenge_id', challengeId)
            .eq('user_id', user.id);

        if (!error) await fetchChallenges();
        return !error;
    };

    const deleteChallenge = async (challengeId: string) => {
        if (!user) return false;
        // Delete participants first
        await supabase.from('challenge_participants').delete().eq('challenge_id', challengeId);
        const { error } = await supabase.from('challenges').delete().eq('id', challengeId);
        if (!error) await fetchChallenges();
        return !error;
    };

    return { challenges, loading, fetchChallenges, createChallenge, joinChallenge, leaveChallenge, deleteChallenge };
}
