import { useState, useEffect } from 'react';
import { History as HistoryIcon, Calendar, Clock, Trash2, ChevronDown, ChevronUp, Dumbbell } from 'lucide-react';
import { useWorkouts, useExercises } from '../lib/hooks';
import { supabase } from '../lib/supabase';
import type { WorkoutSet } from '../lib/supabase';
import { formatDate, formatTime, formatDuration, formatRelative } from '../lib/utils';
import toast from 'react-hot-toast';
import './History.css';

export default function History() {
    const { workouts, loading, deleteWorkout } = useWorkouts();
    const { exercises } = useExercises();
    const completedWorkouts = workouts.filter(w => w.completed_at);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [expandedSets, setExpandedSets] = useState<WorkoutSet[]>([]);

    const toggleExpand = async (workoutId: string) => {
        if (expandedId === workoutId) {
            setExpandedId(null);
            setExpandedSets([]);
            return;
        }
        setExpandedId(workoutId);
        const { data } = await supabase
            .from('workout_sets')
            .select('*')
            .eq('workout_id', workoutId)
            .order('created_at');
        setExpandedSets((data as WorkoutSet[]) || []);
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Delete workout "${name}"? This cannot be undone.`)) {
            await deleteWorkout(id);
            toast.success('Workout deleted');
        }
    };

    const getExerciseName = (id: string) => exercises.find(e => e.id === id)?.name || 'Unknown';

    // Group sets by exercise
    const groupSetsByExercise = (sets: WorkoutSet[]) => {
        const grouped: Record<string, WorkoutSet[]> = {};
        for (const set of sets) {
            if (!grouped[set.exercise_id]) grouped[set.exercise_id] = [];
            grouped[set.exercise_id].push(set);
        }
        return grouped;
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Workout History</h1>
                <p>{completedWorkouts.length} workouts completed</p>
            </div>

            {loading ? (
                <div className="empty-state"><p>Loading...</p></div>
            ) : completedWorkouts.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon"><HistoryIcon size={32} /></div>
                    <h3>No workouts yet</h3>
                    <p>Complete your first workout to see it here</p>
                </div>
            ) : (
                <div className="history-list">
                    {completedWorkouts.map(workout => (
                        <div key={workout.id} className="card history-card animate-in">
                            <div className="history-card-main" onClick={() => toggleExpand(workout.id)}>
                                <div className="history-card-info">
                                    <h3>{workout.name}</h3>
                                    <div className="history-card-meta">
                                        <span className="flex items-center gap-xs">
                                            <Calendar size={14} />
                                            {formatDate(workout.started_at)}
                                        </span>
                                        <span className="flex items-center gap-xs">
                                            <Clock size={14} />
                                            {workout.duration_seconds ? formatDuration(workout.duration_seconds) : 'N/A'}
                                        </span>
                                    </div>
                                    {workout.notes && <p className="history-notes">{workout.notes}</p>}
                                </div>
                                <div className="flex items-center gap-sm">
                                    <button
                                        className="btn btn-ghost btn-icon btn-sm"
                                        onClick={e => { e.stopPropagation(); handleDelete(workout.id, workout.name); }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    {expandedId === workout.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </div>
                            </div>

                            {expandedId === workout.id && expandedSets.length > 0 && (
                                <div className="history-detail animate-slide-up">
                                    {Object.entries(groupSetsByExercise(expandedSets)).map(([exerciseId, sets]) => (
                                        <div key={exerciseId} className="history-exercise-group">
                                            <h4>{getExerciseName(exerciseId)}</h4>
                                            <div className="history-sets">
                                                {sets.map((set, i) => (
                                                    <div key={set.id} className="history-set">
                                                        <span className="set-number">{set.is_warmup ? 'W' : i + 1}</span>
                                                        <span>{set.weight} kg</span>
                                                        <span>×</span>
                                                        <span>{set.reps} reps</span>
                                                        {set.rpe && <span className="text-secondary">RPE {set.rpe}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
