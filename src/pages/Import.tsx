import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Check, Loader2, Sparkles,
    ChevronDown, ChevronUp, Trash2, RefreshCw,
    Instagram, FileText, Timer, Repeat, Dumbbell, RotateCcw
} from 'lucide-react';
import { useExercises, useTemplates } from '../lib/hooks';
import { MUSCLE_GROUPS, EQUIPMENT_OPTIONS } from '../lib/utils';
import toast from 'react-hot-toast';
import './Import.css';

// ─── Types ──────────────────────────────────────────────────────────────────

type WorkoutFormat = 'straight' | 'circuit';

type ParsedExercise = {
    name: string;
    muscle_group: string;
    equipment: string;
    // straight sets
    sets: number;
    reps: string;
    rest_seconds?: number;
    // circuit — reps per round
    reps_per_round?: string;
    selected: boolean;
};

type ParsedWorkout = {
    name: string;
    format: WorkoutFormat;
    exercises: ParsedExercise[];
    // circuit fields
    rounds?: number;
    rest_between_rounds_seconds?: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function guessExerciseDetails(name: string): { muscle_group: string; equipment: string } {
    const lower = name.toLowerCase();
    let muscle_group = 'Full Body';
    if (/bench|chest|fly|push.?up|pec|dip/i.test(lower)) muscle_group = 'Chest';
    else if (/row|pull.?up|lat|deadlift|back|pulldown/i.test(lower)) muscle_group = 'Back';
    else if (/shoulder|delt|ohp|lateral raise|face pull/i.test(lower)) muscle_group = 'Shoulders';
    else if (/bicep|tricep|curl|extension|skullcrusher|hammer|arm/i.test(lower)) muscle_group = 'Arms';
    else if (/squat|leg|lunge|hamstring|quad|calf|glute|hip|rdl|leg press/i.test(lower)) muscle_group = 'Legs';
    else if (/ab|core|plank|crunch|sit.?up|hollow|v.?up/i.test(lower)) muscle_group = 'Core';
    else if (/run|cardio|bike|swim|jump|sprint|burpee/i.test(lower)) muscle_group = 'Cardio';

    let equipment = 'Bodyweight';
    if (/barbell|bar\b/i.test(lower)) equipment = 'Barbell';
    else if (/dumbbell|\bdb\b/i.test(lower)) equipment = 'Dumbbell';
    else if (/machine/i.test(lower)) equipment = 'Machine';
    else if (/cable/i.test(lower)) equipment = 'Cable';
    else if (/kettle/i.test(lower)) equipment = 'Kettlebell';
    else if (/band/i.test(lower)) equipment = 'Band';

    return { muscle_group, equipment };
}

function parseRestSeconds(str: string): number {
    const minMatch = str.match(/(\d+)\s*min/i);
    const secMatch = str.match(/(\d+)\s*s(?:ec)?/i);
    if (minMatch) return parseInt(minMatch[1]) * 60;
    if (secMatch) return parseInt(secMatch[1]);
    const plain = str.match(/(\d+)/);
    if (plain) return parseInt(plain[1]) > 10 ? parseInt(plain[1]) : parseInt(plain[1]) * 60;
    return 60;
}

/** Detect if a body of text is more likely a circuit vs straight-set workout */
function detectFormat(text: string): WorkoutFormat {
    const lower = text.toLowerCase();
    const circuitSignals = [
        /\b(\d+)\s*(rounds?|circuits?|times|laps?)\b/i,
        /\bamrap\b/i,
        /\bemom\b/i,
        /repeat\s+\d+/i,
        /do\s+this\s+\d+/i,
        /then\s+rest.*then\s+repeat/i,
    ];
    for (const re of circuitSignals) {
        if (re.test(lower)) return 'circuit';
    }
    return 'straight';
}

function parseWorkoutText(text: string): ParsedWorkout {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const format = detectFormat(text);

    let workoutName = 'Imported Workout';
    let rounds: number | undefined;
    let rest_between_rounds_seconds: number | undefined;
    const exercises: ParsedExercise[] = [];

    for (const line of lines) {
        // ── Global metadata (always parse these first) ────────────────────────

        // Rounds / repeat count
        const roundsMatch = line.match(/(\d+)\s*(rounds?|times|circuits?)/i);
        if (roundsMatch && !rounds) { rounds = parseInt(roundsMatch[1]); }

        // Rest time on any line — capture for rest_between_rounds
        const restLineMatch = line.match(/rest[:\s]+([\d]+\s*(?:min(?:utes?)?|sec(?:onds?)?|s\b)?)/i)
            || line.match(/([\d]+\s*(?:min(?:utes?)?))\s+rest/i)
            || line.match(/([\d]+\s*sec(?:onds?)?)\s+rest/i);
        if (restLineMatch && !rest_between_rounds_seconds) {
            rest_between_rounds_seconds = parseRestSeconds(restLineMatch[1]);
        }

        // ── Skip non-exercise lines ───────────────────────────────────────────
        const stripped = line
            .replace(/^[-•*✅✔️🔥💪→·▸▪]\s*/, '')
            .replace(/^\d+[.)]\s*/, '')
            .trim();

        // RULE 1: Line is purely a rest instruction
        // e.g. "rest 2 min", "Rest: 60 seconds", "2 min rest", "90s rest between rounds"
        if (/^rest\b/i.test(stripped)) continue;
        if (/\brest\b.*(min|sec|second|minute)/i.test(stripped) && !/\d+\s*[x×X]/.test(stripped)) continue;
        if (/^\d+\s*(min(?:utes?)?|sec(?:onds?)?|s\b)\s+rest/i.test(stripped)) continue;

        // RULE 2: Line is only a time value (e.g. "2 min", "90 seconds", "60s")
        if (/^\d+\s*(min(?:utes?)?|sec(?:onds?)?|s)\s*\.?$/i.test(stripped)) continue;

        // RULE 3: Round announcements / headers
        // e.g. "8 rounds:", "Round 1", "Circuit:", "Repeat 5 times"
        if (/^(\d+\s*)?(rounds?|circuits?|times?|laps?)\s*[:\-]?$/i.test(stripped)) continue;
        if (/^round\s*\d/i.test(stripped)) continue;
        if (/^repeat\b/i.test(stripped)) continue;
        if (/do\s+(all\s+)?(this|these)\s+again/i.test(stripped)) continue;

        // RULE 4: Social / instructional filler
        if (/^(save this|follow|like|comment|tag|credit|dm me|check out|link in bio|swipe|watch|📌|🔗)/i.test(stripped)) continue;
        if (/^(note|tip|reminder|important|warning)[:\s]/i.test(stripped)) continue;
        if (/^(warm.?up|cool.?down|stretch(?:ing)?)[:\s]?$/i.test(stripped)) continue;

        // RULE 5: Purely descriptive workout headers with no exercise info
        // e.g. "Push Day 💪", "Workout A", "Day 1:" (only skip if NO number×reps pattern)
        if (/^(workout|day\s*\d|week\s*\d)[:\s]/i.test(stripped) && !/\d+\s*[x×X]/.test(stripped)) continue;

        // ── Exercise extraction ──────────────────────────────────────────────

        // Sets × reps pattern: 4x8, 3 x 12-15, 4×10 reps
        const setsRepsMatch = stripped.match(/(\d+)\s*[x×X]\s*(\d+(?:[–\-]\d+)?(?:\s*reps?)?)/i);

        // Reps-only pattern: "10 reps push-ups", "5 pull-ups"
        const repsOnlyMatch = !setsRepsMatch && stripped.match(/^(\d+)\s*(?:reps?\s+)?(.+)|(.+?)\s+[–-]?\s*(\d+)\s*reps?/i);

        // Extract exercise name
        let nameCandidate = stripped
            .replace(/^\d+\s*[x×X]\s*\d+[-–]?\d*\s*(?:reps?)?/gi, '')
            .replace(/\d+\s*[x×X]\s*\d+[-–]?\d*\s*(?:reps?)?/gi, '')
            .replace(/rest[:\s]+\d+\s*(?:sec|s|min|m)/gi, '')
            .replace(/\s*[-–:]\s*$/, '')
            .trim();

        // If reps-only format, extract name from the other part
        if (!setsRepsMatch && repsOnlyMatch) {
            const repNum = repsOnlyMatch[1] || repsOnlyMatch[4];
            const exName = repsOnlyMatch[2] || repsOnlyMatch[3];
            if (exName && exName.trim().length > 2) {
                nameCandidate = exName.trim();
            } else if (repNum && !exName) {
                continue;
            }
        }

        if (!nameCandidate || nameCandidate.length < 3) continue;

        // Final guard: if the resulting name is still just a time word, skip
        if (/^(min(?:utes?)?|sec(?:onds?)?|rest|repeat|round|circuit|times?)$/i.test(nameCandidate)) continue;

        const { muscle_group, equipment } = guessExerciseDetails(nameCandidate);

        if (format === 'circuit') {
            // In circuit mode, sets = 1 (one pass per round), reps = reps in that pass
            const reps = setsRepsMatch
                ? setsRepsMatch[2].replace(/\s*reps?/i, '').trim()
                : repsOnlyMatch
                    ? (repsOnlyMatch[1] || repsOnlyMatch[4] || '10')
                    : '10';

            exercises.push({
                name: nameCandidate,
                muscle_group,
                equipment,
                sets: 1,
                reps: reps,
                reps_per_round: reps,
                selected: true,
            });
        } else {
            exercises.push({
                name: nameCandidate,
                muscle_group,
                equipment,
                sets: setsRepsMatch ? parseInt(setsRepsMatch[1]) : 3,
                reps: setsRepsMatch ? setsRepsMatch[2].replace(/\s*reps?/i, '').trim() : '10',
                selected: true,
            });
        }
    }

    // Detect name from first short non-exercise line
    const titleLine = lines.find(l => {
        const stripped = l.replace(/^[-•*✅✔️🔥💪→·]\s*/, '').trim();
        return stripped.length > 3 && stripped.length < 70 && !/\d+\s*[x×X]\s*\d+/.test(stripped)
            && !/\d+\s*reps?/i.test(stripped) && !/rounds?|circuits?/i.test(stripped);
    });
    if (titleLine) workoutName = titleLine.replace(/^[-•*✅✔️🔥💪→·]\s*/, '').trim();

    return { name: workoutName, format, exercises, rounds, rest_between_rounds_seconds };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Import() {
    const navigate = useNavigate();
    const { addExercise } = useExercises();
    const { addTemplate } = useTemplates();

    const [pasteText, setPasteText] = useState('');
    const [loading, setLoading] = useState(false);
    const [parsedWorkout, setParsedWorkout] = useState<ParsedWorkout | null>(null);
    const [imported, setImported] = useState(false);
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

    const handleParse = () => {
        if (!pasteText.trim()) { toast.error('Paste some workout text first'); return; }
        const result = parseWorkoutText(pasteText);
        if (result.exercises.length === 0) {
            toast.error('Could not find any exercises — try pasting the full text.');
            return;
        }
        setParsedWorkout(result);
        toast.success(`Found ${result.exercises.length} exercises as a ${result.format === 'circuit' ? 'circuit' : 'straight-set'} workout!`);
    };

    const updateExercise = (idx: number, field: keyof ParsedExercise, value: string | number | boolean) => {
        if (!parsedWorkout) return;
        setParsedWorkout(prev => ({
            ...prev!,
            exercises: prev!.exercises.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex),
        }));
    };

    const removeExercise = (idx: number) => {
        if (!parsedWorkout) return;
        setParsedWorkout(prev => ({
            ...prev!,
            exercises: prev!.exercises.filter((_, i) => i !== idx),
        }));
    };

    const switchFormat = (format: WorkoutFormat) => {
        if (!parsedWorkout) return;
        setParsedWorkout(prev => ({
            ...prev!,
            format,
            rounds: format === 'circuit' ? (prev!.rounds || 3) : undefined,
            rest_between_rounds_seconds: format === 'circuit' ? (prev!.rest_between_rounds_seconds || 120) : undefined,
        }));
    };

    const handleSave = async () => {
        if (!parsedWorkout) return;
        const selected = parsedWorkout.exercises.filter(ex => ex.selected);
        if (selected.length === 0) { toast.error('Select at least one exercise'); return; }
        if (!parsedWorkout.name.trim()) { toast.error('Give the workout a name'); return; }

        setLoading(true);

        const addedExercises: { id: string; name: string; sets: number; reps: string }[] = [];
        for (const ex of selected) {
            const result = await addExercise({
                name: ex.name,
                muscle_group: ex.muscle_group,
                equipment: ex.equipment,
                instructions: null,
                secondary_muscles: [],
                source_url: null,
            });
            if (result) {
                addedExercises.push({
                    id: result.id,
                    name: result.name,
                    sets: parsedWorkout.format === 'circuit' ? (parsedWorkout.rounds || 1) : ex.sets,
                    reps: parsedWorkout.format === 'circuit' ? (ex.reps_per_round || ex.reps) : ex.reps,
                });
            }
        }

        const descParts: string[] = [];
        if (parsedWorkout.format === 'circuit') {
            descParts.push(`Circuit — ${parsedWorkout.rounds || '?'} rounds`);
            if (parsedWorkout.rest_between_rounds_seconds) {
                const m = Math.floor(parsedWorkout.rest_between_rounds_seconds / 60);
                const s = parsedWorkout.rest_between_rounds_seconds % 60;
                descParts.push(`${m > 0 ? `${m}m ` : ''}${s > 0 ? `${s}s` : ''} rest between rounds`);
            }
        } else {
            descParts.push('Straight sets');
        }

        await addTemplate({
            name: parsedWorkout.name.trim(),
            description: descParts.join(' · '),
            exercises: addedExercises.map((ex, i) => ({
                exercise_id: ex.id,
                exercise_name: ex.name,
                target_sets: ex.sets,
                target_reps: ex.reps,
                order: i,
            })),
            program_name: parsedWorkout.format === 'circuit' ? 'Circuit' : null,
        });

        setLoading(false);
        setImported(true);
        toast.success('Workout saved as a template!');
    };

    const reset = () => {
        setParsedWorkout(null);
        setPasteText('');
        setImported(false);
        setExpandedIdx(null);
    };

    // ─── Success Screen ────────────────────────────────────────────────────────
    if (imported) {
        return (
            <div className="page-container">
                <div className="import-success animate-slide-up">
                    <div className="import-success-icon">
                        <Check size={40} />
                    </div>
                    <h2>Workout Imported!</h2>
                    <p>
                        <strong>{parsedWorkout?.name}</strong> has been saved as a template.
                        You can start it anytime from the Templates section.
                    </p>
                    <div className="flex gap-md" style={{ justifyContent: 'center' }}>
                        <button className="btn btn-primary" onClick={() => navigate('/templates')}>
                            View Templates
                        </button>
                        <button className="btn btn-secondary" onClick={reset}>
                            Import Another
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Review Screen ─────────────────────────────────────────────────────────
    if (parsedWorkout) {
        const isCircuit = parsedWorkout.format === 'circuit';

        return (
            <div className="page-container">
                <div className="page-header">
                    <h1>Review Workout</h1>
                    <p>Check the details and tweak anything before saving as a template.</p>
                </div>

                {/* ── Meta Card ─────────────────────────────────────────────── */}
                <div className="card import-meta-card animate-slide-up">
                    <div className="import-meta-row">
                        <div className="input-group" style={{ flex: 2 }}>
                            <label>Workout Name</label>
                            <input
                                className="input"
                                value={parsedWorkout.name}
                                onChange={e => setParsedWorkout(p => ({ ...p!, name: e.target.value }))}
                                placeholder="e.g. Push Day A"
                            />
                        </div>
                    </div>

                    {/* Format Toggle */}
                    <div className="import-format-row">
                        <span className="import-format-label">Workout Format</span>
                        <div className="import-format-toggle">
                            <button
                                className={`import-fmt-btn ${!isCircuit ? 'active' : ''}`}
                                onClick={() => switchFormat('straight')}
                            >
                                <Dumbbell size={14} /> Straight Sets
                            </button>
                            <button
                                className={`import-fmt-btn ${isCircuit ? 'active' : ''}`}
                                onClick={() => switchFormat('circuit')}
                            >
                                <RotateCcw size={14} /> Circuit / Rounds
                            </button>
                        </div>
                    </div>

                    {/* Circuit params */}
                    {isCircuit && (
                        <div className="import-circuit-params animate-slide-up">
                            <div className="input-group">
                                <label><Repeat size={12} /> Rounds</label>
                                <input
                                    className="input input-sm"
                                    type="number"
                                    min={1}
                                    value={parsedWorkout.rounds ?? 3}
                                    onChange={e => setParsedWorkout(p => ({ ...p!, rounds: parseInt(e.target.value) || 1 }))}
                                />
                            </div>
                            <div className="input-group">
                                <label><Timer size={12} /> Rest between rounds (secs)</label>
                                <input
                                    className="input input-sm"
                                    type="number"
                                    min={0}
                                    value={parsedWorkout.rest_between_rounds_seconds ?? 120}
                                    onChange={e => setParsedWorkout(p => ({ ...p!, rest_between_rounds_seconds: parseInt(e.target.value) || 0 }))}
                                />
                            </div>
                        </div>
                    )}

                    <div className="import-meta-badges">
                        {isCircuit ? (
                            <>
                                <span className="badge badge-warning"><RotateCcw size={10} /> {parsedWorkout.rounds ?? 3} rounds</span>
                                <span className="badge badge-primary"><Sparkles size={10} /> {parsedWorkout.exercises.filter(e => e.selected).length} exercises per round</span>
                                {parsedWorkout.rest_between_rounds_seconds && (
                                    <span className="badge badge-warning"><Timer size={10} /> {parsedWorkout.rest_between_rounds_seconds}s rest between rounds</span>
                                )}
                            </>
                        ) : (
                            <span className="badge badge-primary">
                                <Sparkles size={10} /> {parsedWorkout.exercises.filter(e => e.selected).length} exercises
                            </span>
                        )}
                    </div>
                </div>

                {/* ── Circuit visual preview ─────────────────────────────────── */}
                {isCircuit && (
                    <div className="circuit-preview-banner animate-slide-up">
                        <div className="circuit-banner-inner">
                            <div className="circuit-round-label">Round 1 of {parsedWorkout.rounds ?? 3}</div>
                            <div className="circuit-flow">
                                {parsedWorkout.exercises.filter(e => e.selected).map((ex, i) => (
                                    <span key={i} className="circuit-flow-item">
                                        <strong>{ex.reps_per_round || ex.reps}</strong> × {ex.name}
                                    </span>
                                ))}
                            </div>
                            <div className="circuit-rest-label">
                                <Timer size={12} /> Rest {parsedWorkout.rest_between_rounds_seconds ?? 120}s → Repeat
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Exercise List ──────────────────────────────────────────── */}
                <div className="parsed-exercises">
                    {parsedWorkout.exercises.map((ex, i) => (
                        <div key={i} className={`card parsed-exercise-card ${!ex.selected ? 'deselected' : ''}`}>
                            <div className="parsed-exercise-header">
                                <label className="parsed-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={ex.selected}
                                        onChange={() => updateExercise(i, 'selected', !ex.selected)}
                                    />
                                </label>
                                <input
                                    className="input input-sm"
                                    value={ex.name}
                                    onChange={e => updateExercise(i, 'name', e.target.value)}
                                    style={{ flex: 1, fontWeight: 600 }}
                                />
                                <div className="parsed-ex-quick-info">
                                    {isCircuit ? (
                                        <span className="badge badge-warning">
                                            <Repeat size={10} /> {ex.reps_per_round || ex.reps} reps/round
                                        </span>
                                    ) : (
                                        <span className="badge badge-primary">{ex.sets}×{ex.reps}</span>
                                    )}
                                    {!isCircuit && ex.rest_seconds && (
                                        <span className="badge badge-warning">
                                            <Timer size={10} /> {ex.rest_seconds}s rest
                                        </span>
                                    )}
                                </div>
                                <button
                                    className="btn btn-ghost btn-icon btn-sm"
                                    onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                                >
                                    {expandedIdx === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                                <button
                                    className="btn btn-ghost btn-icon btn-sm"
                                    onClick={() => removeExercise(i)}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            {expandedIdx === i && (
                                <div className="parsed-exercise-details animate-slide-up">
                                    <div className="parsed-detail-row">
                                        {isCircuit ? (
                                            <div className="input-group" style={{ flex: 1 }}>
                                                <label>Reps per Round</label>
                                                <input
                                                    className="input input-sm"
                                                    value={ex.reps_per_round || ex.reps}
                                                    onChange={e => {
                                                        updateExercise(i, 'reps_per_round', e.target.value);
                                                        updateExercise(i, 'reps', e.target.value);
                                                    }}
                                                    placeholder="e.g. 10 or 8-12"
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <div className="input-group" style={{ flex: 1 }}>
                                                    <label>Sets</label>
                                                    <input
                                                        className="input input-sm"
                                                        type="number"
                                                        value={ex.sets}
                                                        onChange={e => updateExercise(i, 'sets', parseInt(e.target.value) || 1)}
                                                    />
                                                </div>
                                                <div className="input-group" style={{ flex: 1 }}>
                                                    <label>Reps</label>
                                                    <input
                                                        className="input input-sm"
                                                        value={ex.reps}
                                                        onChange={e => updateExercise(i, 'reps', e.target.value)}
                                                        placeholder="e.g. 10 or 8-12"
                                                    />
                                                </div>
                                                <div className="input-group" style={{ flex: 1 }}>
                                                    <label>Rest (secs)</label>
                                                    <input
                                                        className="input input-sm"
                                                        type="number"
                                                        value={ex.rest_seconds || ''}
                                                        onChange={e => updateExercise(i, 'rest_seconds', parseInt(e.target.value) || 0)}
                                                        placeholder="e.g. 60"
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="parsed-detail-row">
                                        <div className="input-group" style={{ flex: 1 }}>
                                            <label>Muscle Group</label>
                                            <select
                                                className="input input-sm"
                                                value={ex.muscle_group}
                                                onChange={e => updateExercise(i, 'muscle_group', e.target.value)}
                                            >
                                                {MUSCLE_GROUPS.map(mg => <option key={mg} value={mg}>{mg}</option>)}
                                            </select>
                                        </div>
                                        <div className="input-group" style={{ flex: 1 }}>
                                            <label>Equipment</label>
                                            <select
                                                className="input input-sm"
                                                value={ex.equipment}
                                                onChange={e => updateExercise(i, 'equipment', e.target.value)}
                                            >
                                                {EQUIPMENT_OPTIONS.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="import-actions">
                    <button className="btn btn-secondary" onClick={() => setParsedWorkout(null)}>
                        <RefreshCw size={16} /> Re-parse
                    </button>
                    <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={loading}>
                        {loading ? <Loader2 size={18} className="spin" /> : <Check size={18} />}
                        {loading ? 'Saving...' : 'Save as Template'}
                    </button>
                </div>
            </div>
        );
    }

    // ─── Input Screen ──────────────────────────────────────────────────────────
    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Import Workout</h1>
                <p>Paste the caption or text from an Instagram reel, post, or any source</p>
            </div>

            <div className="import-how-it-works">
                <div className="import-step">
                    <div className="import-step-num">1</div>
                    <div>
                        <strong>Copy the text</strong>
                        <p>Instagram caption, a message, or anything with exercises written out</p>
                    </div>
                </div>
                <div className="import-step">
                    <div className="import-step-num">2</div>
                    <div>
                        <strong>Paste &amp; extract</strong>
                        <p>We auto-detect if it's a circuit or straight-set workout</p>
                    </div>
                </div>
                <div className="import-step">
                    <div className="import-step-num">3</div>
                    <div>
                        <strong>Review &amp; save</strong>
                        <p>Tweak the format, rounds, reps — then save as a reusable template</p>
                    </div>
                </div>
            </div>

            {/* Format examples */}
            <div className="import-format-examples">
                <div className="import-example-card">
                    <div className="import-example-header">
                        <Dumbbell size={14} /> <strong>Straight Sets</strong>
                    </div>
                    <pre className="import-example-text">{`Bench Press 4x8
Incline DB Press 3x12
Cable Fly 3x15
Rest 60s between sets`}</pre>
                </div>
                <div className="import-example-card">
                    <div className="import-example-header">
                        <RotateCcw size={14} /> <strong>Circuit / Rounds</strong>
                    </div>
                    <pre className="import-example-text">{`8 rounds:
5 pull-ups
10 push-ups
15 air squats
Rest 2 min between rounds`}</pre>
                </div>
            </div>

            <div className="card import-input-card animate-slide-up">
                <div className="input-group">
                    <label>
                        <Instagram size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                        Paste workout text
                    </label>
                    <textarea
                        className="input"
                        placeholder="Paste any workout text here..."
                        value={pasteText}
                        onChange={e => setPasteText(e.target.value)}
                        rows={12}
                        style={{ minHeight: '240px', fontFamily: 'monospace', fontSize: '0.875rem' }}
                    />
                </div>

                <button
                    className="btn btn-primary btn-lg w-full"
                    onClick={handleParse}
                    disabled={loading || !pasteText.trim()}
                >
                    <Sparkles size={18} />
                    Extract Workout
                </button>
            </div>

            <div className="import-tips">
                <FileText size={14} />
                <span>
                    <strong>Works with:</strong> bullet points, numbered lists, sets×reps (e.g. 3x10),
                    round-based circuits, AMRAP, EMOM, rest times, and free-form text.
                    You can also manually switch the format after parsing.
                </span>
            </div>
        </div>
    );
}
