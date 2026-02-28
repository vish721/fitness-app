import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Play, Square, Plus, Trash2, Timer,
    CheckCircle, ChevronDown, ChevronUp, Clock
} from 'lucide-react';
import { useWorkouts, useWorkoutSets, useExercises, usePersonalRecords, usePreviousPerformance } from '../lib/hooks';
import type { WorkoutTemplate } from '../lib/supabase';
import { formatTimerDisplay, cn } from '../lib/utils';
import toast from 'react-hot-toast';
import './Workout.css';

type ActiveExercise = {
    exercise_id: string;
    exercise_name: string;
    sets: SetEntry[];
    collapsed: boolean;
    restDuration: number; // rest timer duration in seconds, per exercise
};

type SetEntry = {
    id?: string;
    reps: number;
    weight: number;
    rpe: number | null;
    is_warmup: boolean;
    saved: boolean;
};

const REST_PRESETS = [30, 60, 90, 120, 180, 300];
const WORKOUT_RATINGS = [
    { emoji: '😤', label: 'Terrible' },
    { emoji: '😕', label: 'Tough' },
    { emoji: '😐', label: 'Okay' },
    { emoji: '💪', label: 'Great' },
    { emoji: '🔥', label: 'Beast Mode' },
];

export default function Workout() {
    const location = useLocation();
    const navigate = useNavigate();
    const template = (location.state as any)?.template as WorkoutTemplate | undefined;

    const { startWorkout, finishWorkout } = useWorkouts();
    const { exercises } = useExercises();
    const { checkAndUpdatePR } = usePersonalRecords();

    const [workoutId, setWorkoutId] = useState<string | null>(null);
    const [workoutName, setWorkoutName] = useState(template?.name || '');
    const [activeExercises, setActiveExercises] = useState<ActiveExercise[]>([]);
    const [isActive, setIsActive] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [notes, setNotes] = useState('');
    const [workoutRating, setWorkoutRating] = useState<number | null>(null);

    // Rest timer
    const [restTime, setRestTime] = useState(0);
    const [restActive, setRestActive] = useState(false);
    const [currentRestDuration, setCurrentRestDuration] = useState(90);
    const restInterval = useRef<number | null>(null);

    const { addSet } = useWorkoutSets(workoutId);

    // Previous performance
    const exerciseIds = useMemo(() => activeExercises.map(e => e.exercise_id), [activeExercises]);
    const previousPerformance = usePreviousPerformance(exerciseIds);

    // Workout timer
    useEffect(() => {
        let interval: number | undefined;
        if (isActive) {
            interval = window.setInterval(() => setElapsed(e => e + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isActive]);

    // Rest timer
    useEffect(() => {
        if (restActive && restTime > 0) {
            restInterval.current = window.setInterval(() => {
                setRestTime(t => {
                    if (t <= 1) {
                        setRestActive(false);
                        toast('⏰ Rest time is up!', { icon: '💪' });
                        return 0;
                    }
                    return t - 1;
                });
            }, 1000);
        }
        return () => { if (restInterval.current) clearInterval(restInterval.current); };
    }, [restActive, restTime]);

    const handleStart = async () => {
        if (!workoutName.trim()) {
            toast.error('Enter a workout name');
            return;
        }
        const workout = await startWorkout(workoutName, template?.id);
        if (workout) {
            setWorkoutId(workout.id);
            setIsActive(true);

            // Pre-populate from template
            if (template?.exercises) {
                const templateExercises: ActiveExercise[] = template.exercises.map(te => ({
                    exercise_id: te.exercise_id,
                    exercise_name: te.exercise_name,
                    sets: Array.from({ length: te.target_sets }, () => ({
                        reps: parseInt(te.target_reps) || 10,
                        weight: 0,
                        rpe: null,
                        is_warmup: false,
                        saved: false,
                    })),
                    collapsed: false,
                    restDuration: 90,
                }));
                setActiveExercises(templateExercises);
            }
            toast.success('Workout started!');
        }
    };

    const handleFinish = async () => {
        if (!workoutId) return;

        // Save any unsaved sets first
        for (const ex of activeExercises) {
            for (let i = 0; i < ex.sets.length; i++) {
                const s = ex.sets[i];
                if (!s.saved && s.weight > 0 && s.reps > 0) {
                    await saveSet(ex.exercise_id, i, s);
                }
            }
        }

        // Include rating in notes
        const ratingNote = workoutRating !== null ? `[Rating: ${WORKOUT_RATINGS[workoutRating].emoji} ${WORKOUT_RATINGS[workoutRating].label}]` : '';
        const fullNotes = [ratingNote, notes].filter(Boolean).join('\n');

        await finishWorkout(workoutId, fullNotes);
        setIsActive(false);
        toast.success('Workout complete! 🎉');
        navigate('/history');
    };

    const addExerciseToWorkout = (exerciseId: string) => {
        const ex = exercises.find(e => e.id === exerciseId);
        if (!ex) return;
        setActiveExercises(prev => [...prev, {
            exercise_id: ex.id,
            exercise_name: ex.name,
            sets: [{ reps: 10, weight: 0, rpe: null, is_warmup: false, saved: false }],
            collapsed: false,
            restDuration: 90,
        }]);
    };

    const removeExercise = (index: number) => {
        setActiveExercises(prev => prev.filter((_, i) => i !== index));
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

    const updateRestDuration = (exerciseIndex: number, duration: number) => {
        setActiveExercises(prev => prev.map((ex, i) =>
            i === exerciseIndex ? { ...ex, restDuration: duration } : ex
        ));
    };

    const saveSet = async (exerciseId: string, setIndex: number, set: SetEntry) => {
        if (!workoutId) return;
        const result = await addSet({
            workout_id: workoutId,
            exercise_id: exerciseId,
            set_number: setIndex + 1,
            reps: set.reps,
            weight: set.weight,
            rpe: set.rpe,
            is_warmup: set.is_warmup,
        });

        if (result) {
            // Check for PR
            const newPRs = await checkAndUpdatePR(exerciseId, set.weight, set.reps, workoutId);
            if (newPRs.length > 0) {
                toast('🏆 New Personal Record!', { duration: 3000, icon: '🎉' });
            }

            // Start rest timer with the exercise's specific rest duration
            const exercise = activeExercises.find(e => e.exercise_id === exerciseId);
            const restDur = exercise?.restDuration || 90;
            setCurrentRestDuration(restDur);
            setRestTime(restDur);
            setRestActive(true);
        }

        return result;
    };

    const handleSaveSet = async (exerciseIndex: number, setIndex: number) => {
        const ex = activeExercises[exerciseIndex];
        const set = ex.sets[setIndex];

        if (set.weight <= 0 || set.reps <= 0) {
            toast.error('Enter weight and reps');
            return;
        }

        const result = await saveSet(ex.exercise_id, setIndex, set);
        if (result) {
            updateSetField(exerciseIndex, setIndex, 'saved', true);
            toast.success(`Set ${setIndex + 1} logged!`);
        }
    };

    const toggleCollapse = (index: number) => {
        setActiveExercises(prev => prev.map((ex, i) =>
            i === index ? { ...ex, collapsed: !ex.collapsed } : ex
        ));
    };

    // Pre-workout state
    if (!isActive && !workoutId) {
        return (
            <div className="page-container">
                <div className="page-header">
                    <h1>Start Workout</h1>
                    <p>{template ? `From template: ${template.name}` : 'Create an ad-hoc workout or select a template'}</p>
                </div>

                <div className="workout-start-card card animate-slide-up">
                    <div className="input-group">
                        <label>Workout Name</label>
                        <input
                            className="input"
                            placeholder="e.g. Push Day, Leg Day..."
                            value={workoutName}
                            onChange={e => setWorkoutName(e.target.value)}
                        />
                    </div>

                    {template && template.exercises.length > 0 && (
                        <div className="template-preview">
                            <h3>Exercises</h3>
                            {template.exercises.map((te, i) => (
                                <div key={i} className="te-preview">
                                    <span>{te.exercise_name}</span>
                                    <span className="text-secondary text-sm">{te.target_sets} × {te.target_reps}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <button className="btn btn-primary btn-lg w-full" onClick={handleStart}>
                        <Play size={20} />
                        Start Workout
                    </button>
                </div>

                {!template && (
                    <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
                        <p className="text-secondary text-sm" style={{ marginBottom: 'var(--space-md)' }}>
                            Or pick a template from your library →
                        </p>
                        <button className="btn btn-secondary" onClick={() => navigate('/templates')}>
                            Browse Templates
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* Workout Header */}
            <div className="workout-header">
                <div>
                    <h1>{workoutName}</h1>
                    <div className="workout-timer">
                        <Timer size={16} />
                        <span>{formatTimerDisplay(elapsed)}</span>
                    </div>
                </div>
                <div className="flex gap-md">
                    <button className="btn btn-danger" onClick={handleFinish}>
                        <Square size={16} />
                        Finish
                    </button>
                </div>
            </div>

            {/* Exercise Blocks */}
            <div className="workout-exercises">
                {activeExercises.map((ex, exIdx) => {
                    const prevSets = previousPerformance[ex.exercise_id];
                    return (
                        <div key={exIdx} className="card workout-exercise-card animate-slide-up">
                            <div className="exercise-block-header" onClick={() => toggleCollapse(exIdx)}>
                                <div className="flex items-center gap-md">
                                    <div className="exercise-block-number">{exIdx + 1}</div>
                                    <h3>{ex.exercise_name}</h3>
                                </div>
                                <div className="flex items-center gap-sm">
                                    <span className="text-sm text-secondary">
                                        {ex.sets.filter(s => s.saved).length}/{ex.sets.length} sets
                                    </span>
                                    {ex.collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                                </div>
                            </div>

                            {!ex.collapsed && (
                                <div className="exercise-sets">
                                    {/* Rest timer config for this exercise */}
                                    <div className="rest-config">
                                        <Clock size={14} />
                                        <span className="text-sm text-secondary">Rest:</span>
                                        <div className="rest-presets">
                                            {REST_PRESETS.map(d => (
                                                <button
                                                    key={d}
                                                    className={cn('rest-preset-btn', ex.restDuration === d && 'active')}
                                                    onClick={() => updateRestDuration(exIdx, d)}
                                                >
                                                    {d >= 60 ? `${d / 60}m` : `${d}s`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="sets-header">
                                        <span>Set</span>
                                        <span>Previous</span>
                                        <span>Weight (kg)</span>
                                        <span>Reps</span>
                                        <span>RPE</span>
                                        <span></span>
                                    </div>
                                    {ex.sets.map((set, setIdx) => {
                                        const prev = prevSets?.[setIdx];
                                        return (
                                            <div key={setIdx} className={cn('set-row', set.saved && 'set-saved')}>
                                                <span className="set-number">
                                                    {set.is_warmup ? 'W' : setIdx + 1}
                                                </span>
                                                <span className="prev-performance">
                                                    {prev ? `${prev.weight}kg × ${prev.reps}` : '—'}
                                                </span>
                                                <input
                                                    className="input input-sm"
                                                    type="number"
                                                    value={set.weight || ''}
                                                    onChange={e => updateSetField(exIdx, setIdx, 'weight', parseFloat(e.target.value) || 0)}
                                                    placeholder={prev ? String(prev.weight) : '0'}
                                                    disabled={set.saved}
                                                />
                                                <input
                                                    className="input input-sm"
                                                    type="number"
                                                    value={set.reps || ''}
                                                    onChange={e => updateSetField(exIdx, setIdx, 'reps', parseInt(e.target.value) || 0)}
                                                    placeholder={prev ? String(prev.reps) : '0'}
                                                    disabled={set.saved}
                                                />
                                                <input
                                                    className="input input-sm"
                                                    type="number"
                                                    value={set.rpe || ''}
                                                    onChange={e => updateSetField(exIdx, setIdx, 'rpe', parseInt(e.target.value) || null)}
                                                    placeholder="-"
                                                    min={1}
                                                    max={10}
                                                    disabled={set.saved}
                                                />
                                                <div className="set-actions">
                                                    {!set.saved ? (
                                                        <button
                                                            className="btn btn-primary btn-sm"
                                                            onClick={() => handleSaveSet(exIdx, setIdx)}
                                                        >
                                                            <CheckCircle size={14} />
                                                        </button>
                                                    ) : (
                                                        <CheckCircle size={18} style={{ color: 'var(--success)' }} />
                                                    )}
                                                    {!set.saved && (
                                                        <button
                                                            className="btn btn-ghost btn-icon btn-sm"
                                                            onClick={() => removeSet(exIdx, setIdx)}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <button className="btn btn-ghost btn-sm w-full" onClick={() => addSetToExercise(exIdx)}>
                                        <Plus size={14} /> Add Set
                                    </button>
                                </div>
                            )}

                            <button
                                className="btn btn-ghost btn-sm"
                                style={{ marginTop: 'var(--space-sm)' }}
                                onClick={() => removeExercise(exIdx)}
                            >
                                <Trash2 size={14} /> Remove Exercise
                            </button>
                        </div>
                    );
                })}

                {/* Add Exercise */}
                <div className="add-exercise-section">
                    <select
                        className="input"
                        onChange={e => { if (e.target.value) { addExerciseToWorkout(e.target.value); e.target.value = ''; } }}
                        defaultValue=""
                    >
                        <option value="">+ Add exercise...</option>
                        {exercises.map(ex => (
                            <option key={ex.id} value={ex.id}>{ex.name} ({ex.muscle_group})</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Workout Rating & Notes */}
            <div className="card workout-finish-section" style={{ marginTop: 'var(--space-lg)' }}>
                <div className="input-group">
                    <label>How did it feel?</label>
                    <div className="workout-rating-row">
                        {WORKOUT_RATINGS.map((r, idx) => (
                            <button
                                key={idx}
                                className={cn('workout-rating-btn', workoutRating === idx && 'active')}
                                onClick={() => setWorkoutRating(workoutRating === idx ? null : idx)}
                                title={r.label}
                            >
                                <span className="rating-emoji">{r.emoji}</span>
                                <span className="rating-label">{r.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="input-group" style={{ marginTop: 'var(--space-lg)' }}>
                    <label>Workout Notes</label>
                    <textarea
                        className="input"
                        placeholder="How did the workout feel? Any PRs, struggles, observations..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    />
                </div>
            </div>

            {/* Rest Timer */}
            {restActive && (
                <div className="rest-timer-overlay">
                    <div className="rest-timer-card">
                        <div className="rest-timer-circle">
                            <svg viewBox="0 0 120 120" className="rest-timer-svg">
                                <circle
                                    cx="60" cy="60" r="54"
                                    fill="none"
                                    stroke="var(--bg-glass)"
                                    strokeWidth="6"
                                />
                                <circle
                                    cx="60" cy="60" r="54"
                                    fill="none"
                                    stroke="var(--accent-primary)"
                                    strokeWidth="6"
                                    strokeLinecap="round"
                                    strokeDasharray={2 * Math.PI * 54}
                                    strokeDashoffset={2 * Math.PI * 54 * (1 - restTime / currentRestDuration)}
                                    style={{ transition: 'stroke-dashoffset 1s linear', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                                />
                            </svg>
                            <span className="rest-timer-time">{formatTimerDisplay(restTime)}</span>
                        </div>
                        <span className="rest-timer-label">Rest Time</span>
                        <div className="rest-timer-actions">
                            <button className="btn btn-ghost btn-sm" onClick={() => setRestTime(t => t + 15)}>+15s</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setRestTime(t => Math.max(0, t - 15))}>-15s</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => { setRestActive(false); setRestTime(0); }}>Skip</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
