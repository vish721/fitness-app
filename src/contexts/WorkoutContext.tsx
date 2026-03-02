import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWorkouts, useWorkoutSets, usePersonalRecords } from '../lib/hooks';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

export type SetEntry = {
    id?: string;
    reps: number;
    weight: number;
    rpe: number | null;
    is_warmup: boolean;
    saved: boolean;
};

export type ActiveExercise = {
    exercise_id: string;
    exercise_name: string;
    sets: SetEntry[];
    collapsed: boolean;
    restDuration: number;
};

type WorkoutContextType = {
    workoutId: string | null;
    workoutName: string;
    activeExercises: ActiveExercise[];
    isActive: boolean;
    startedAt: number | null;
    notes: string;
    workoutRating: number | null;

    // State setters
    setWorkoutName: (name: string) => void;
    setNotes: (notes: string) => void;
    setWorkoutRating: (rating: number | null) => void;

    // Actions
    startNewWorkout: (name: string, templateId?: string, templateExercises?: ActiveExercise[]) => Promise<boolean>;
    finishCurrentWorkout: () => Promise<boolean>;
    cancelWorkout: () => Promise<void>;

    // Exercise Management
    addExerciseToWorkout: (exerciseId: string, exerciseName: string) => void;
    removeExercise: (index: number) => void;
    toggleCollapse: (index: number) => void;
    updateRestDuration: (exerciseIndex: number, duration: number) => void;

    // Set Management
    addSetToExercise: (exerciseIndex: number) => void;
    removeSet: (exerciseIndex: number, setIndex: number) => void;
    updateSetField: (exerciseIndex: number, setIndex: number, field: keyof SetEntry, value: any) => void;
    saveSetToDb: (exerciseIndex: number, setIndex: number) => Promise<boolean>;
};

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export function WorkoutProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { startWorkout, finishWorkout, deleteWorkout } = useWorkouts();
    const { addSet } = useWorkoutSets(null); // We'll pass the workoutId dynamically when saving
    const { checkAndUpdatePR } = usePersonalRecords();

    // Persisted State
    const [workoutId, setWorkoutId] = useState<string | null>(null);
    const [workoutName, setWorkoutName] = useState('');
    const [activeExercises, setActiveExercises] = useState<ActiveExercise[]>([]);
    const [isActive, setIsActive] = useState(false);
    const [startedAt, setStartedAt] = useState<number | null>(null);
    const [notes, setNotes] = useState('');
    const [workoutRating, setWorkoutRating] = useState<number | null>(null);

    // Initialization flag to prevent overwriting localStorage on mount
    const [isInitialized, setIsInitialized] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        if (user) {
            const savedState = localStorage.getItem(`active_workout_${user.id}`);
            if (savedState) {
                try {
                    const parsed = JSON.parse(savedState);
                    setWorkoutId(parsed.workoutId || null);
                    setWorkoutName(parsed.workoutName || '');
                    setActiveExercises(parsed.activeExercises || []);
                    setIsActive(parsed.isActive || false);
                    setStartedAt(parsed.startedAt || null);
                    setNotes(parsed.notes || '');
                    setWorkoutRating(parsed.workoutRating ?? null);
                } catch (e) {
                    console.error('Failed to parse active workout state', e);
                }
            }
        }
        setIsInitialized(true);
    }, [user]);

    // Save to localStorage when state changes
    useEffect(() => {
        if (isInitialized && user) {
            if (isActive) {
                const stateToSave = {
                    workoutId,
                    workoutName,
                    activeExercises,
                    isActive,
                    startedAt,
                    notes,
                    workoutRating
                };
                localStorage.setItem(`active_workout_${user.id}`, JSON.stringify(stateToSave));
            } else {
                localStorage.removeItem(`active_workout_${user.id}`);
            }
        }
    }, [isInitialized, user, workoutId, workoutName, activeExercises, isActive, startedAt, notes, workoutRating]);

    const startNewWorkout = async (name: string, templateId?: string, templateExercises?: ActiveExercise[]) => {
        if (!name.trim()) {
            toast.error('Enter a workout name');
            return false;
        }

        const workout = await startWorkout(name, templateId);
        if (workout) {
            setWorkoutId(workout.id);
            setWorkoutName(name);
            setIsActive(true);
            setStartedAt(Date.now());
            setNotes('');
            setWorkoutRating(null);

            if (templateExercises && templateExercises.length > 0) {
                setActiveExercises(templateExercises);
            } else {
                setActiveExercises([]);
            }
            toast.success('Workout started!');
            return true;
        }
        return false;
    };

    const finishCurrentWorkout = async () => {
        if (!workoutId) return false;

        // Save unsaved sets
        for (let exIdx = 0; exIdx < activeExercises.length; exIdx++) {
            const ex = activeExercises[exIdx];
            for (let setIdx = 0; setIdx < ex.sets.length; setIdx++) {
                const s = ex.sets[setIdx];
                if (!s.saved && s.weight > 0 && s.reps > 0) {
                    await saveSetToDb(exIdx, setIdx);
                }
            }
        }

        const WORKOUT_RATINGS = ['Terrible', 'Tough', 'Okay', 'Great', 'Beast Mode'];
        const EMOJIS = ['😤', '😕', '😐', '💪', '🔥'];

        const ratingNote = workoutRating !== null ? `[Rating: ${EMOJIS[workoutRating]} ${WORKOUT_RATINGS[workoutRating]}]` : '';
        const fullNotes = [ratingNote, notes].filter(Boolean).join('\n');

        const success = await finishWorkout(workoutId, fullNotes);
        if (success) {
            setIsActive(false);
            setWorkoutId(null);
            setStartedAt(null);
            setActiveExercises([]);
            if (user) localStorage.removeItem(`active_workout_${user.id}`);
            toast.success('Workout complete! 🎉');
            return true;
        }
        return false;
    };

    const cancelWorkout = async () => {
        if (!workoutId) return;

        if (window.confirm('Are you sure you want to cancel this workout? All progress will be lost.')) {
            await deleteWorkout(workoutId);
            setIsActive(false);
            setWorkoutId(null);
            setStartedAt(null);
            setActiveExercises([]);
            setNotes('');
            setWorkoutName('');
            setWorkoutRating(null);
            if (user) localStorage.removeItem(`active_workout_${user.id}`);
            toast('Workout cancelled');
        }
    };

    const addExerciseToWorkout = (exerciseId: string, exerciseName: string) => {
        setActiveExercises(prev => [...prev, {
            exercise_id: exerciseId,
            exercise_name: exerciseName,
            sets: [{ reps: 10, weight: 0, rpe: null, is_warmup: false, saved: false }],
            collapsed: false,
            restDuration: 90,
        }]);
    };

    const removeExercise = (index: number) => {
        setActiveExercises(prev => prev.filter((_, i) => i !== index));
    };

    const toggleCollapse = (index: number) => {
        setActiveExercises(prev => prev.map((ex, i) =>
            i === index ? { ...ex, collapsed: !ex.collapsed } : ex
        ));
    };

    const updateRestDuration = (exerciseIndex: number, duration: number) => {
        setActiveExercises(prev => prev.map((ex, i) =>
            i === exerciseIndex ? { ...ex, restDuration: duration } : ex
        ));
    };

    const addSetToExercise = (exerciseIndex: number) => {
        setActiveExercises(prev => prev.map((ex, i) =>
            i === exerciseIndex ? {
                ...ex,
                sets: [...ex.sets, { reps: 10, weight: 0, rpe: null, is_warmup: false, saved: false }],
            } : ex
        ));
    };

    const removeSet = (exerciseIndex: number, setIndex: number) => {
        setActiveExercises(prev => prev.map((ex, i) =>
            i === exerciseIndex ? {
                ...ex,
                sets: ex.sets.filter((_, si) => si !== setIndex),
            } : ex
        ));
    };

    const updateSetField = (exerciseIndex: number, setIndex: number, field: keyof SetEntry, value: any) => {
        setActiveExercises(prev => prev.map((ex, i) =>
            i === exerciseIndex ? {
                ...ex,
                sets: ex.sets.map((s, si) => si === setIndex ? { ...s, [field]: value } : s),
            } : ex
        ));
    };

    const saveSetToDb = async (exerciseIndex: number, setIndex: number) => {
        if (!workoutId) return false;

        const ex = activeExercises[exerciseIndex];
        const set = ex.sets[setIndex];

        if (set.weight <= 0 || set.reps <= 0) {
            toast.error('Enter weight and reps');
            return false;
        }

        const newSet = await addSet({
            workout_id: workoutId,
            exercise_id: ex.exercise_id,
            set_number: setIndex + 1,
            reps: set.reps,
            weight: set.weight,
            rpe: set.rpe,
            is_warmup: set.is_warmup,
        });

        if (newSet) {
            updateSetField(exerciseIndex, setIndex, 'saved', true);

            const newPRs = await checkAndUpdatePR(ex.exercise_id, set.weight, set.reps, workoutId);
            if (newPRs.length > 0) {
                toast('🏆 New Personal Record!', { duration: 3000, icon: '🎉' });
            }
            return true;
        }
        return false;
    };

    return (
        <WorkoutContext.Provider value={{
            workoutId,
            workoutName,
            activeExercises,
            isActive,
            startedAt,
            notes,
            workoutRating,
            setWorkoutName,
            setNotes,
            setWorkoutRating,
            startNewWorkout,
            finishCurrentWorkout,
            cancelWorkout,
            addExerciseToWorkout,
            removeExercise,
            toggleCollapse,
            updateRestDuration,
            addSetToExercise,
            removeSet,
            updateSetField,
            saveSetToDb
        }}>
            {children}
        </WorkoutContext.Provider>
    );
}

export function useActiveWorkout() {
    const context = useContext(WorkoutContext);
    if (context === undefined) {
        throw new Error('useActiveWorkout must be used within a WorkoutProvider');
    }
    return context;
}
