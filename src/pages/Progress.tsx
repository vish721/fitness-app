import { useState, useMemo } from 'react';
import { TrendingUp, Trophy, BarChart3, Scale, Plus, Trash2 } from 'lucide-react';
import { useExercises, usePersonalRecords, useAllWorkoutSets, useWorkouts, useBodyMeasurements } from '../lib/hooks';
import { formatDate, calculateOneRepMax, MUSCLE_GROUP_BADGE_CLASS } from '../lib/utils';
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
    CartesianGrid, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import toast from 'react-hot-toast';
import './Progress.css';

const CHART_COLORS = ['#6366f1', '#a855f7', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#06b6d4'];

export default function Progress() {
    const { exercises } = useExercises();
    const { records } = usePersonalRecords();
    const { sets } = useAllWorkoutSets();
    const { workouts } = useWorkouts();
    const { measurements, addMeasurement, deleteMeasurement } = useBodyMeasurements();
    const [selectedExercise, setSelectedExercise] = useState<string>('');

    // Body weight tracking form
    const [showWeightForm, setShowWeightForm] = useState(false);
    const [weightInput, setWeightInput] = useState('');
    const [bodyFatInput, setBodyFatInput] = useState('');
    const [weightDateInput, setWeightDateInput] = useState(new Date().toISOString().split('T')[0]);

    // Exercise progression data
    const progressionData = useMemo(() => {
        if (!selectedExercise) return [];
        const exerciseSets = sets.filter(s => s.exercise_id === selectedExercise);

        // Group by workout
        const byWorkout: Record<string, { weight: number; reps: number; volume: number; date: string }[]> = {};
        for (const set of exerciseSets) {
            const workout = workouts.find(w => w.id === set.workout_id);
            if (!workout) continue;
            const dateKey = workout.started_at.split('T')[0];
            if (!byWorkout[dateKey]) byWorkout[dateKey] = [];
            byWorkout[dateKey].push({
                weight: set.weight,
                reps: set.reps,
                volume: set.weight * set.reps,
                date: workout.started_at,
            });
        }

        return Object.entries(byWorkout)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, wSets]) => ({
                date: formatDate(date),
                maxWeight: Math.max(...wSets.map(s => s.weight)),
                totalVolume: wSets.reduce((sum, s) => sum + s.volume, 0),
                est1RM: Math.max(...wSets.map(s => calculateOneRepMax(s.weight, s.reps))),
                avgReps: Math.round(wSets.reduce((sum, s) => sum + s.reps, 0) / wSets.length),
            }));
    }, [selectedExercise, sets, workouts]);

    // Muscle group volume distribution
    const muscleDistribution = useMemo(() => {
        const volumes: Record<string, number> = {};
        for (const set of sets) {
            const exercise = exercises.find(e => e.id === set.exercise_id);
            if (!exercise) continue;
            const mg = exercise.muscle_group;
            volumes[mg] = (volumes[mg] || 0) + set.weight * set.reps;
        }
        return Object.entries(volumes).map(([name, value]) => ({ name, value }));
    }, [sets, exercises]);

    // Weekly volume trend
    const weeklyVolume = useMemo(() => {
        const weeks: Record<string, number> = {};
        for (const set of sets) {
            const workout = workouts.find(w => w.id === set.workout_id);
            if (!workout) continue;
            const date = new Date(workout.started_at);
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            const weekKey = weekStart.toISOString().split('T')[0];
            weeks[weekKey] = (weeks[weekKey] || 0) + set.weight * set.reps;
        }
        return Object.entries(weeks)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-12)
            .map(([week, volume]) => ({
                week: formatDate(week),
                volume: Math.round(volume),
            }));
    }, [sets, workouts]);

    // Body weight chart data
    const weightChartData = useMemo(() => {
        return measurements.map(m => ({
            date: formatDate(m.date),
            weight: m.weight,
            bodyFat: m.body_fat_pct,
        }));
    }, [measurements]);

    const handleAddWeight = async () => {
        const weight = parseFloat(weightInput);
        if (!weight || weight <= 0) {
            toast.error('Enter a valid weight');
            return;
        }
        const bodyFat = bodyFatInput ? parseFloat(bodyFatInput) : null;
        await addMeasurement({
            weight,
            body_fat_pct: bodyFat,
            date: weightDateInput,
        });
        toast.success('Weight logged!');
        setWeightInput('');
        setBodyFatInput('');
        setShowWeightForm(false);
    };

    const handleDeleteWeight = async (id: string) => {
        if (confirm('Delete this measurement?')) {
            await deleteMeasurement(id);
            toast.success('Measurement deleted');
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Progress</h1>
                <p>Track your strength gains and progression over time</p>
            </div>

            {/* Body Weight Tracking */}
            <div className="progress-section">
                <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-md">
                        <Scale size={20} style={{ color: 'var(--info)' }} />
                        Body Weight
                    </h2>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowWeightForm(!showWeightForm)}
                    >
                        <Plus size={14} />
                        Log Weight
                    </button>
                </div>

                {showWeightForm && (
                    <div className="card weight-form animate-slide-up" style={{ marginTop: 'var(--space-md)' }}>
                        <div className="grid grid-3" style={{ gap: 'var(--space-md)' }}>
                            <div className="input-group">
                                <label>Weight (kg)</label>
                                <input
                                    className="input"
                                    type="number"
                                    step="0.1"
                                    placeholder="80.5"
                                    value={weightInput}
                                    onChange={e => setWeightInput(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="input-group">
                                <label>Body Fat % (optional)</label>
                                <input
                                    className="input"
                                    type="number"
                                    step="0.1"
                                    placeholder="15"
                                    value={bodyFatInput}
                                    onChange={e => setBodyFatInput(e.target.value)}
                                />
                            </div>
                            <div className="input-group">
                                <label>Date</label>
                                <input
                                    className="input"
                                    type="date"
                                    value={weightDateInput}
                                    onChange={e => setWeightDateInput(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex gap-md" style={{ marginTop: 'var(--space-md)' }}>
                            <button className="btn btn-primary" onClick={handleAddWeight}>Save</button>
                            <button className="btn btn-ghost" onClick={() => setShowWeightForm(false)}>Cancel</button>
                        </div>
                    </div>
                )}

                {weightChartData.length > 1 ? (
                    <div className="grid grid-2" style={{ marginTop: 'var(--space-lg)' }}>
                        <div className="card chart-card">
                            <h4>Weight Trend (kg)</h4>
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={weightChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8b8b9e' }} />
                                    <YAxis tick={{ fontSize: 11, fill: '#8b8b9e' }} domain={['dataMin - 2', 'dataMax + 2']} />
                                    <Tooltip
                                        contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }}
                                        labelStyle={{ color: '#f1f1f7' }}
                                    />
                                    <Line type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        {weightChartData.some(d => d.bodyFat) && (
                            <div className="card chart-card">
                                <h4>Body Fat % Trend</h4>
                                <ResponsiveContainer width="100%" height={250}>
                                    <LineChart data={weightChartData.filter(d => d.bodyFat)}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8b8b9e' }} />
                                        <YAxis tick={{ fontSize: 11, fill: '#8b8b9e' }} />
                                        <Tooltip
                                            contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }}
                                            labelStyle={{ color: '#f1f1f7' }}
                                        />
                                        <Line type="monotone" dataKey="bodyFat" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                ) : weightChartData.length === 1 ? (
                    <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-sm text-secondary">Latest: </span>
                                <strong>{measurements[measurements.length - 1].weight} kg</strong>
                                {measurements[measurements.length - 1].body_fat_pct && (
                                    <span className="text-sm text-secondary"> · {measurements[measurements.length - 1].body_fat_pct}% BF</span>
                                )}
                            </div>
                            <span className="text-sm text-secondary">Log more entries to see trends</span>
                        </div>
                    </div>
                ) : (
                    <p className="text-secondary text-sm" style={{ marginTop: 'var(--space-md)' }}>
                        Start logging your body weight to track trends over time
                    </p>
                )}

                {/* Recent measurements table */}
                {measurements.length > 0 && (
                    <div className="weight-history" style={{ marginTop: 'var(--space-lg)' }}>
                        <h4 className="text-sm text-secondary" style={{ marginBottom: 'var(--space-sm)' }}>Recent Entries</h4>
                        <div className="weight-entries">
                            {[...measurements].reverse().slice(0, 10).map(m => (
                                <div key={m.id} className="weight-entry">
                                    <span className="text-sm">{formatDate(m.date)}</span>
                                    <strong>{m.weight} kg</strong>
                                    {m.body_fat_pct && <span className="badge badge-primary">{m.body_fat_pct}% BF</span>}
                                    <button
                                        className="btn btn-ghost btn-icon btn-sm"
                                        onClick={() => handleDeleteWeight(m.id)}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* PRs Section */}
            <div className="progress-section">
                <h2 className="flex items-center gap-md">
                    <Trophy size={20} style={{ color: 'var(--warning)' }} />
                    Personal Records
                </h2>
                {records.length === 0 ? (
                    <p className="text-secondary text-sm">Complete workouts to start tracking PRs</p>
                ) : (
                    <div className="pr-grid">
                        {exercises
                            .filter(ex => records.some(r => r.exercise_id === ex.id))
                            .map(ex => {
                                const exRecords = records.filter(r => r.exercise_id === ex.id);
                                const maxWeight = exRecords.find(r => r.record_type === 'max_weight');
                                const maxReps = exRecords.find(r => r.record_type === 'max_reps');
                                const maxVolume = exRecords.find(r => r.record_type === 'max_volume');
                                return (
                                    <div key={ex.id} className="card pr-card">
                                        <h4>{ex.name}</h4>
                                        <span className={`badge ${MUSCLE_GROUP_BADGE_CLASS[ex.muscle_group] || 'badge-primary'}`}>
                                            {ex.muscle_group}
                                        </span>
                                        <div className="pr-values">
                                            {maxWeight && (
                                                <div className="pr-value">
                                                    <span className="pr-label">Max Weight</span>
                                                    <span className="pr-number">{maxWeight.value} kg</span>
                                                </div>
                                            )}
                                            {maxReps && (
                                                <div className="pr-value">
                                                    <span className="pr-label">Max Reps</span>
                                                    <span className="pr-number">{maxReps.value}</span>
                                                </div>
                                            )}
                                            {maxVolume && (
                                                <div className="pr-value">
                                                    <span className="pr-label">Best Set Vol</span>
                                                    <span className="pr-number">{maxVolume.value} kg</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                )}
            </div>

            {/* Exercise Progression Chart */}
            <div className="progress-section">
                <h2 className="flex items-center gap-md">
                    <TrendingUp size={20} style={{ color: 'var(--accent-primary)' }} />
                    Exercise Progression
                </h2>
                <select
                    className="input"
                    style={{ maxWidth: '300px', marginBottom: 'var(--space-lg)' }}
                    value={selectedExercise}
                    onChange={e => setSelectedExercise(e.target.value)}
                >
                    <option value="">Select an exercise...</option>
                    {exercises.map(ex => (
                        <option key={ex.id} value={ex.id}>{ex.name}</option>
                    ))}
                </select>

                {selectedExercise && progressionData.length > 0 ? (
                    <div className="grid grid-2">
                        <div className="card chart-card">
                            <h4>Max Weight (kg)</h4>
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={progressionData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8b8b9e' }} />
                                    <YAxis tick={{ fontSize: 11, fill: '#8b8b9e' }} />
                                    <Tooltip
                                        contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }}
                                        labelStyle={{ color: '#f1f1f7' }}
                                    />
                                    <Line type="monotone" dataKey="maxWeight" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="card chart-card">
                            <h4>Estimated 1RM (kg)</h4>
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={progressionData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8b8b9e' }} />
                                    <YAxis tick={{ fontSize: 11, fill: '#8b8b9e' }} />
                                    <Tooltip
                                        contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }}
                                        labelStyle={{ color: '#f1f1f7' }}
                                    />
                                    <Line type="monotone" dataKey="est1RM" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="card chart-card" style={{ gridColumn: '1 / -1' }}>
                            <h4>Total Volume per Session (kg)</h4>
                            <ResponsiveContainer width="100%" height={250}>
                                <AreaChart data={progressionData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8b8b9e' }} />
                                    <YAxis tick={{ fontSize: 11, fill: '#8b8b9e' }} />
                                    <Tooltip
                                        contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }}
                                        labelStyle={{ color: '#f1f1f7' }}
                                    />
                                    <Area type="monotone" dataKey="totalVolume" stroke="#22c55e" fill="rgba(34, 197, 94, 0.15)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ) : selectedExercise ? (
                    <p className="text-secondary text-sm">No data yet for this exercise. Log some workouts first!</p>
                ) : null}
            </div>

            {/* Volume Distribution */}
            {muscleDistribution.length > 0 && (
                <div className="progress-section">
                    <h2 className="flex items-center gap-md">
                        <BarChart3 size={20} style={{ color: 'var(--success)' }} />
                        Volume Distribution by Muscle Group
                    </h2>
                    <div className="grid grid-2">
                        <div className="card chart-card">
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={muscleDistribution}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        dataKey="value"
                                        label={({ name, percent }: any) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                        labelLine={false}
                                        fontSize={11}
                                    >
                                        {muscleDistribution.map((_, i) => (
                                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }}
                                        formatter={((value: any) => [`${Number(value).toLocaleString()} kg`, 'Volume']) as any}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {weeklyVolume.length > 0 && (
                            <div className="card chart-card">
                                <h4>Weekly Total Volume (kg)</h4>
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={weeklyVolume}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                        <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#8b8b9e' }} />
                                        <YAxis tick={{ fontSize: 11, fill: '#8b8b9e' }} />
                                        <Tooltip
                                            contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }}
                                            labelStyle={{ color: '#f1f1f7' }}
                                        />
                                        <Area type="monotone" dataKey="volume" stroke="#6366f1" fill="rgba(99, 102, 241, 0.15)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
