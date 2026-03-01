import { useState } from 'react';
import { Flame, Dumbbell, ChevronRight, Check, Sparkles } from 'lucide-react';
import { useExercises } from '../lib/hooks';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './Onboarding.css';

const PRESET_EXERCISES = [
    // Chest
    { name: 'Bench Press', muscle_group: 'Chest', equipment: 'Barbell', secondary_muscles: ['Arms', 'Shoulders'] },
    { name: 'Incline Dumbbell Press', muscle_group: 'Chest', equipment: 'Dumbbell', secondary_muscles: ['Shoulders'] },
    { name: 'Cable Flyes', muscle_group: 'Chest', equipment: 'Cable', secondary_muscles: [] },
    { name: 'Push Ups', muscle_group: 'Chest', equipment: 'Bodyweight', secondary_muscles: ['Arms'] },
    // Back
    { name: 'Deadlift', muscle_group: 'Back', equipment: 'Barbell', secondary_muscles: ['Legs', 'Core'] },
    { name: 'Pull Ups', muscle_group: 'Back', equipment: 'Bodyweight', secondary_muscles: ['Arms'] },
    { name: 'Barbell Row', muscle_group: 'Back', equipment: 'Barbell', secondary_muscles: ['Arms'] },
    { name: 'Lat Pulldown', muscle_group: 'Back', equipment: 'Cable', secondary_muscles: ['Arms'] },
    { name: 'Seated Cable Row', muscle_group: 'Back', equipment: 'Cable', secondary_muscles: ['Arms'] },
    // Shoulders
    { name: 'Overhead Press', muscle_group: 'Shoulders', equipment: 'Barbell', secondary_muscles: ['Arms'] },
    { name: 'Lateral Raises', muscle_group: 'Shoulders', equipment: 'Dumbbell', secondary_muscles: [] },
    { name: 'Face Pulls', muscle_group: 'Shoulders', equipment: 'Cable', secondary_muscles: ['Back'] },
    // Arms
    { name: 'Barbell Curl', muscle_group: 'Arms', equipment: 'Barbell', secondary_muscles: [] },
    { name: 'Tricep Pushdown', muscle_group: 'Arms', equipment: 'Cable', secondary_muscles: [] },
    { name: 'Hammer Curl', muscle_group: 'Arms', equipment: 'Dumbbell', secondary_muscles: [] },
    { name: 'Skull Crushers', muscle_group: 'Arms', equipment: 'Barbell', secondary_muscles: [] },
    // Legs
    { name: 'Squat', muscle_group: 'Legs', equipment: 'Barbell', secondary_muscles: ['Core'] },
    { name: 'Romanian Deadlift', muscle_group: 'Legs', equipment: 'Barbell', secondary_muscles: ['Back'] },
    { name: 'Leg Press', muscle_group: 'Legs', equipment: 'Machine', secondary_muscles: [] },
    { name: 'Leg Curl', muscle_group: 'Legs', equipment: 'Machine', secondary_muscles: [] },
    { name: 'Leg Extension', muscle_group: 'Legs', equipment: 'Machine', secondary_muscles: [] },
    { name: 'Bulgarian Split Squat', muscle_group: 'Legs', equipment: 'Dumbbell', secondary_muscles: ['Core'] },
    { name: 'Calf Raises', muscle_group: 'Legs', equipment: 'Machine', secondary_muscles: [] },
    // Core
    { name: 'Plank', muscle_group: 'Core', equipment: 'Bodyweight', secondary_muscles: [] },
    { name: 'Cable Crunches', muscle_group: 'Core', equipment: 'Cable', secondary_muscles: [] },
    { name: 'Hanging Leg Raises', muscle_group: 'Core', equipment: 'Bodyweight', secondary_muscles: [] },
];

type Props = {
    onComplete: () => void;
};

export default function Onboarding({ onComplete }: Props) {
    const { user } = useAuth();
    const { addExercise } = useExercises();
    const [step, setStep] = useState(0);
    const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || '');
    const [selectedExercises, setSelectedExercises] = useState<Set<number>>(new Set());
    const [saving, setSaving] = useState(false);

    const toggleExercise = (index: number) => {
        setSelectedExercises(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    const selectAll = () => {
        setSelectedExercises(new Set(PRESET_EXERCISES.map((_, i) => i)));
    };

    const handleFinish = async () => {
        setSaving(true);

        // Save display name to profile
        if (displayName.trim() && user) {
            const { supabase } = await import('../lib/supabase');
            await supabase.from('profiles').upsert({
                id: user.id,
                display_name: displayName.trim(),
            });
        }

        // Add selected exercises
        for (const idx of selectedExercises) {
            const ex = PRESET_EXERCISES[idx];
            await addExercise({
                name: ex.name,
                muscle_group: ex.muscle_group,
                equipment: ex.equipment,
                secondary_muscles: ex.secondary_muscles,
                instructions: null,
                source_url: null,
                is_global: false,
            });
        }

        toast.success(`Added ${selectedExercises.size} exercises! Let's get started 💪`);
        setSaving(false);
        onComplete();
    };

    const muscleGroups = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'];

    return (
        <div className="onboarding-overlay">
            <div className="onboarding-container animate-slide-up">
                {/* Progress */}
                <div className="onboarding-progress">
                    {[0, 1, 2].map(s => (
                        <div key={s} className={`onboarding-progress-dot ${s === step ? 'active' : s < step ? 'completed' : ''}`} />
                    ))}
                </div>

                {step === 0 && (
                    <div className="onboarding-step">
                        <div className="onboarding-icon-big">
                            <Flame size={48} />
                        </div>
                        <h1>Welcome to Chud2Chad! 🔥</h1>
                        <p>Let's set up your profile and get you ready to crush your workouts.</p>
                        <div className="input-group" style={{ marginTop: 'var(--space-xl)', width: '100%', maxWidth: '360px' }}>
                            <label>What should we call you?</label>
                            <input
                                className="input"
                                placeholder="Your name"
                                value={displayName}
                                onChange={e => setDisplayName(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <button
                            className="btn btn-primary btn-lg"
                            style={{ marginTop: 'var(--space-xl)' }}
                            onClick={() => setStep(1)}
                        >
                            Continue
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}

                {step === 1 && (
                    <div className="onboarding-step">
                        <div className="onboarding-icon-big">
                            <Dumbbell size={48} />
                        </div>
                        <h1>Pick Your Exercises</h1>
                        <p>Select the exercises you typically do. You can always add more later.</p>
                        <button className="btn btn-ghost btn-sm" onClick={selectAll} style={{ marginBottom: 'var(--space-md)' }}>
                            Select All ({PRESET_EXERCISES.length})
                        </button>
                        <div className="onboarding-exercises-grid">
                            {muscleGroups.map(mg => (
                                <div key={mg} className="onboarding-muscle-group">
                                    <h4>{mg}</h4>
                                    <div className="onboarding-exercise-list">
                                        {PRESET_EXERCISES.map((ex, idx) => ex.muscle_group === mg && (
                                            <button
                                                key={idx}
                                                className={`onboarding-exercise-chip ${selectedExercises.has(idx) ? 'selected' : ''}`}
                                                onClick={() => toggleExercise(idx)}
                                            >
                                                {selectedExercises.has(idx) && <Check size={14} />}
                                                {ex.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="onboarding-actions">
                            <button className="btn btn-ghost" onClick={() => setStep(0)}>Back</button>
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={() => setStep(2)}
                            >
                                Continue ({selectedExercises.size} selected)
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="onboarding-step">
                        <div className="onboarding-icon-big">
                            <Sparkles size={48} />
                        </div>
                        <h1>You're All Set!</h1>
                        <p>
                            {selectedExercises.size > 0
                                ? `We'll add ${selectedExercises.size} exercises to your library. You can start logging workouts right away!`
                                : `You can add exercises manually anytime from the Exercises page.`
                            }
                        </p>
                        <div className="onboarding-summary">
                            <div className="summary-stat">
                                <span className="summary-value">{displayName || 'Athlete'}</span>
                                <span className="summary-label">Display Name</span>
                            </div>
                            <div className="summary-stat">
                                <span className="summary-value">{selectedExercises.size}</span>
                                <span className="summary-label">Exercises</span>
                            </div>
                        </div>
                        <div className="onboarding-actions">
                            <button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={handleFinish}
                                disabled={saving}
                            >
                                {saving ? 'Setting up...' : "Let's Go! 🚀"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Skip */}
                {step < 2 && (
                    <button
                        className="btn btn-ghost btn-sm onboarding-skip"
                        onClick={() => { onComplete(); }}
                    >
                        Skip for now
                    </button>
                )}
            </div>
        </div>
    );
}
