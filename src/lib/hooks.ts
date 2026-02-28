import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Exercise, Workout, WorkoutSet, WorkoutTemplate, PersonalRecord, BodyMeasurement } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ============ EXERCISES ============
export function useExercises() {
    const { user } = useAuth();
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchExercises = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('exercises')
            .select('*')
            .eq('user_id', user.id)
            .order('name');

        if (!error && data) setExercises(data as Exercise[]);
        setLoading(false);
    }, [user]);

    useEffect(() => { fetchExercises(); }, [fetchExercises]);

    const addExercise = async (exercise: Omit<Exercise, 'id' | 'user_id' | 'created_at'>) => {
        if (!user) return null;
        const { data, error } = await supabase
            .from('exercises')
            .insert({ ...exercise, user_id: user.id })
            .select()
            .single();

        if (!error && data) {
            setExercises(prev => [...prev, data as Exercise].sort((a, b) => a.name.localeCompare(b.name)));
            return data as Exercise;
        }
        return null;
    };

    const updateExercise = async (id: string, updates: Partial<Exercise>) => {
        const { error } = await supabase
            .from('exercises')
            .update(updates)
            .eq('id', id);

        if (!error) {
            setExercises(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
        }
        return !error;
    };

    const deleteExercise = async (id: string) => {
        const { error } = await supabase.from('exercises').delete().eq('id', id);
        if (!error) {
            setExercises(prev => prev.filter(e => e.id !== id));
        }
        return !error;
    };

    return { exercises, loading, fetchExercises, addExercise, updateExercise, deleteExercise };
}

// ============ WORKOUT TEMPLATES ============
export function useTemplates() {
    const { user } = useAuth();
    const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTemplates = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('workout_templates')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

        if (!error && data) setTemplates(data as WorkoutTemplate[]);
        setLoading(false);
    }, [user]);

    useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

    const addTemplate = async (template: Omit<WorkoutTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
        if (!user) return null;
        const { data, error } = await supabase
            .from('workout_templates')
            .insert({ ...template, user_id: user.id })
            .select()
            .single();

        if (!error && data) {
            setTemplates(prev => [data as WorkoutTemplate, ...prev]);
            return data as WorkoutTemplate;
        }
        return null;
    };

    const updateTemplate = async (id: string, updates: Partial<WorkoutTemplate>) => {
        const { error } = await supabase
            .from('workout_templates')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (!error) {
            setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
        }
        return !error;
    };

    const deleteTemplate = async (id: string) => {
        const { error } = await supabase.from('workout_templates').delete().eq('id', id);
        if (!error) {
            setTemplates(prev => prev.filter(t => t.id !== id));
        }
        return !error;
    };

    return { templates, loading, fetchTemplates, addTemplate, updateTemplate, deleteTemplate };
}

// ============ WORKOUTS ============
export function useWorkouts() {
    const { user } = useAuth();
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchWorkouts = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('workouts')
            .select('*')
            .eq('user_id', user.id)
            .order('started_at', { ascending: false });

        if (!error && data) setWorkouts(data as Workout[]);
        setLoading(false);
    }, [user]);

    useEffect(() => { fetchWorkouts(); }, [fetchWorkouts]);

    const startWorkout = async (name: string, templateId?: string) => {
        if (!user) return null;
        const { data, error } = await supabase
            .from('workouts')
            .insert({
                user_id: user.id,
                name,
                template_id: templateId || null,
                started_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (!error && data) {
            setWorkouts(prev => [data as Workout, ...prev]);
            return data as Workout;
        }
        return null;
    };

    const finishWorkout = async (id: string, notes?: string) => {
        const workout = workouts.find(w => w.id === id);
        const startedAt = workout ? new Date(workout.started_at).getTime() : Date.now();
        const durationSeconds = Math.floor((Date.now() - startedAt) / 1000);

        const { error } = await supabase
            .from('workouts')
            .update({
                completed_at: new Date().toISOString(),
                duration_seconds: durationSeconds,
                notes: notes || null,
            })
            .eq('id', id);

        if (!error) {
            setWorkouts(prev => prev.map(w => w.id === id ? {
                ...w,
                completed_at: new Date().toISOString(),
                duration_seconds: durationSeconds,
                notes: notes || null,
            } : w));
        }
        return !error;
    };

    const deleteWorkout = async (id: string) => {
        // Delete sets first, then the workout
        await supabase.from('workout_sets').delete().eq('workout_id', id);
        const { error } = await supabase.from('workouts').delete().eq('id', id);
        if (!error) {
            setWorkouts(prev => prev.filter(w => w.id !== id));
        }
        return !error;
    };

    return { workouts, loading, fetchWorkouts, startWorkout, finishWorkout, deleteWorkout };
}

// ============ WORKOUT SETS ============
export function useWorkoutSets(workoutId: string | null) {
    const [sets, setSets] = useState<WorkoutSet[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchSets = useCallback(async () => {
        if (!workoutId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('workout_sets')
            .select('*')
            .eq('workout_id', workoutId)
            .order('created_at');

        if (!error && data) setSets(data as WorkoutSet[]);
        setLoading(false);
    }, [workoutId]);

    useEffect(() => { fetchSets(); }, [fetchSets]);

    const addSet = async (set: Omit<WorkoutSet, 'id' | 'created_at'>) => {
        const { data, error } = await supabase
            .from('workout_sets')
            .insert(set)
            .select()
            .single();

        if (!error && data) {
            setSets(prev => [...prev, data as WorkoutSet]);
            return data as WorkoutSet;
        }
        return null;
    };

    const updateSet = async (id: string, updates: Partial<WorkoutSet>) => {
        const { error } = await supabase
            .from('workout_sets')
            .update(updates)
            .eq('id', id);

        if (!error) {
            setSets(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
        }
        return !error;
    };

    const deleteSet = async (id: string) => {
        const { error } = await supabase.from('workout_sets').delete().eq('id', id);
        if (!error) {
            setSets(prev => prev.filter(s => s.id !== id));
        }
        return !error;
    };

    return { sets, loading, fetchSets, addSet, updateSet, deleteSet };
}

// ============ PERSONAL RECORDS ============
export function usePersonalRecords() {
    const { user } = useAuth();
    const [records, setRecords] = useState<PersonalRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRecords = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('personal_records')
            .select('*')
            .eq('user_id', user.id)
            .order('achieved_at', { ascending: false });

        if (!error && data) setRecords(data as PersonalRecord[]);
        setLoading(false);
    }, [user]);

    useEffect(() => { fetchRecords(); }, [fetchRecords]);

    const checkAndUpdatePR = async (exerciseId: string, weight: number, reps: number, workoutId: string) => {
        if (!user) return [];
        const newPRs: string[] = [];

        // Check max weight
        const existingMaxWeight = records.find(r => r.exercise_id === exerciseId && r.record_type === 'max_weight');
        if (!existingMaxWeight || weight > existingMaxWeight.value) {
            if (existingMaxWeight) {
                await supabase.from('personal_records').update({ value: weight, achieved_at: new Date().toISOString(), workout_id: workoutId }).eq('id', existingMaxWeight.id);
            } else {
                await supabase.from('personal_records').insert({ user_id: user.id, exercise_id: exerciseId, record_type: 'max_weight', value: weight, workout_id: workoutId });
            }
            newPRs.push('max_weight');
        }

        // Check max reps (at any weight)
        const existingMaxReps = records.find(r => r.exercise_id === exerciseId && r.record_type === 'max_reps');
        if (!existingMaxReps || reps > existingMaxReps.value) {
            if (existingMaxReps) {
                await supabase.from('personal_records').update({ value: reps, achieved_at: new Date().toISOString(), workout_id: workoutId }).eq('id', existingMaxReps.id);
            } else {
                await supabase.from('personal_records').insert({ user_id: user.id, exercise_id: exerciseId, record_type: 'max_reps', value: reps, workout_id: workoutId });
            }
            newPRs.push('max_reps');
        }

        // Check max volume (single set)
        const volume = weight * reps;
        const existingMaxVolume = records.find(r => r.exercise_id === exerciseId && r.record_type === 'max_volume');
        if (!existingMaxVolume || volume > existingMaxVolume.value) {
            if (existingMaxVolume) {
                await supabase.from('personal_records').update({ value: volume, achieved_at: new Date().toISOString(), workout_id: workoutId }).eq('id', existingMaxVolume.id);
            } else {
                await supabase.from('personal_records').insert({ user_id: user.id, exercise_id: exerciseId, record_type: 'max_volume', value: volume, workout_id: workoutId });
            }
            newPRs.push('max_volume');
        }

        if (newPRs.length > 0) {
            await fetchRecords();
        }

        return newPRs;
    };

    return { records, loading, fetchRecords, checkAndUpdatePR };
}

// ============ WORKOUT SETS FOR HISTORY (all sets) ============
export function useAllWorkoutSets() {
    const { user } = useAuth();
    const [sets, setSets] = useState<WorkoutSet[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAllSets = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        // We need to join through workouts to filter by user
        const { data: workouts } = await supabase
            .from('workouts')
            .select('id')
            .eq('user_id', user.id);

        if (workouts && workouts.length > 0) {
            const workoutIds = workouts.map(w => w.id);
            const { data, error } = await supabase
                .from('workout_sets')
                .select('*')
                .in('workout_id', workoutIds)
                .order('created_at');

            if (!error && data) setSets(data as WorkoutSet[]);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => { fetchAllSets(); }, [fetchAllSets]);

    return { sets, loading, fetchAllSets };
}

// ============ BODY MEASUREMENTS ============
export function useBodyMeasurements() {
    const { user } = useAuth();
    const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMeasurements = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('body_measurements')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: true });

        if (!error && data) setMeasurements(data as BodyMeasurement[]);
        setLoading(false);
    }, [user]);

    useEffect(() => { fetchMeasurements(); }, [fetchMeasurements]);

    const addMeasurement = async (measurement: { weight: number; body_fat_pct?: number | null; date?: string; notes?: string | null }) => {
        if (!user) return null;
        const { data, error } = await supabase
            .from('body_measurements')
            .insert({
                user_id: user.id,
                weight: measurement.weight,
                body_fat_pct: measurement.body_fat_pct || null,
                date: measurement.date || new Date().toISOString().split('T')[0],
                notes: measurement.notes || null,
            })
            .select()
            .single();

        if (!error && data) {
            setMeasurements(prev => [...prev, data as BodyMeasurement].sort((a, b) => a.date.localeCompare(b.date)));
            return data as BodyMeasurement;
        }
        return null;
    };

    const deleteMeasurement = async (id: string) => {
        const { error } = await supabase.from('body_measurements').delete().eq('id', id);
        if (!error) {
            setMeasurements(prev => prev.filter(m => m.id !== id));
        }
        return !error;
    };

    return { measurements, loading, fetchMeasurements, addMeasurement, deleteMeasurement };
}

// ============ PREVIOUS PERFORMANCE ============
export function usePreviousPerformance(exerciseIds: string[]) {
    const { user } = useAuth();
    const [previousSets, setPreviousSets] = useState<Record<string, { weight: number; reps: number }[]>>({});

    const fetchPrevious = useCallback(async () => {
        if (!user || exerciseIds.length === 0) return;

        // Get the user's last completed workout that contained each exercise
        const result: Record<string, { weight: number; reps: number }[]> = {};

        for (const exerciseId of exerciseIds) {
            // Find the most recent completed workout with this exercise
            const { data: recentSets } = await supabase
                .from('workout_sets')
                .select('weight, reps, workout_id, created_at')
                .eq('exercise_id', exerciseId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (recentSets && recentSets.length > 0) {
                // Group by workout_id and get the most recent workout's sets
                const lastWorkoutId = recentSets[0].workout_id;
                const lastWorkoutSets = recentSets
                    .filter(s => s.workout_id === lastWorkoutId)
                    .reverse() // chronological order
                    .map(s => ({ weight: s.weight, reps: s.reps }));
                result[exerciseId] = lastWorkoutSets;
            }
        }

        setPreviousSets(result);
    }, [user, exerciseIds.join(',')]);

    useEffect(() => { fetchPrevious(); }, [fetchPrevious]);

    return previousSets;
}

// ============ ONBOARDING STATUS ============
export function useOnboardingStatus() {
    const { user } = useAuth();
    const [needsOnboarding, setNeedsOnboarding] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const check = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            // Check if user has any exercises
            const { count, error } = await supabase
                .from('exercises')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id);

            if (!error) {
                setNeedsOnboarding(count === 0);
            }
            setLoading(false);
        };

        check();
    }, [user]);

    const completeOnboarding = () => {
        setNeedsOnboarding(false);
    };

    return { needsOnboarding, loading, completeOnboarding };
}
