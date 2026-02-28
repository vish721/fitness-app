import { useState } from 'react';
import { Link, ExternalLink, Clipboard, Plus, Check, Loader2, Sparkles } from 'lucide-react';
import { useExercises, useTemplates } from '../lib/hooks';
import { MUSCLE_GROUPS, EQUIPMENT_OPTIONS } from '../lib/utils';
import toast from 'react-hot-toast';
import './Import.css';

type ParsedExercise = {
    name: string;
    muscle_group: string;
    equipment: string;
    sets?: number;
    reps?: string;
    selected: boolean;
};

export default function Import() {
    const { addExercise } = useExercises();
    const { addTemplate } = useTemplates();

    const [mode, setMode] = useState<'url' | 'paste'>('paste');
    const [url, setUrl] = useState('');
    const [pasteText, setPasteText] = useState('');
    const [loading, setLoading] = useState(false);
    const [parsedExercises, setParsedExercises] = useState<ParsedExercise[]>([]);
    const [templateName, setTemplateName] = useState('');
    const [imported, setImported] = useState(false);

    const parseExercisesFromText = (text: string): ParsedExercise[] => {
        const lines = text.split('\n').filter(l => l.trim());
        const exercises: ParsedExercise[] = [];

        for (const line of lines) {
            const cleaned = line.trim().replace(/^[-•*\d.)\s]+/, '');
            if (!cleaned || cleaned.length < 3) continue;

            // Try to extract sets x reps pattern
            const setsRepsMatch = cleaned.match(/(\d+)\s*[x×X]\s*(\d+[-–]?\d*)/);
            const nameMatch = cleaned.replace(/\d+\s*[x×X]\s*\d+[-–]?\d*/g, '').replace(/\s*[-–:]\s*$/, '').trim();

            if (nameMatch && nameMatch.length > 2) {
                // Try to guess muscle group from exercise name
                const lower = nameMatch.toLowerCase();
                let guessedMuscle = 'Full Body';
                if (/bench|chest|fly|push.?up|pec/i.test(lower)) guessedMuscle = 'Chest';
                else if (/row|pull.?up|lat|deadlift|back/i.test(lower)) guessedMuscle = 'Back';
                else if (/shoulder|delt|press|ohp|lateral raise/i.test(lower)) guessedMuscle = 'Shoulders';
                else if (/bicep|tricep|curl|extension|arm/i.test(lower)) guessedMuscle = 'Arms';
                else if (/squat|leg|lunge|hamstring|quad|calf|glute|hip/i.test(lower)) guessedMuscle = 'Legs';
                else if (/ab|core|plank|crunch|sit.?up/i.test(lower)) guessedMuscle = 'Core';
                else if (/run|cardio|bike|swim|jump/i.test(lower)) guessedMuscle = 'Cardio';

                let guessedEquipment = 'Bodyweight';
                if (/barbell|bar\b/i.test(lower)) guessedEquipment = 'Barbell';
                else if (/dumbbell|db/i.test(lower)) guessedEquipment = 'Dumbbell';
                else if (/machine/i.test(lower)) guessedEquipment = 'Machine';
                else if (/cable/i.test(lower)) guessedEquipment = 'Cable';
                else if (/kettle/i.test(lower)) guessedEquipment = 'Kettlebell';
                else if (/band/i.test(lower)) guessedEquipment = 'Band';

                exercises.push({
                    name: nameMatch,
                    muscle_group: guessedMuscle,
                    equipment: guessedEquipment,
                    sets: setsRepsMatch ? parseInt(setsRepsMatch[1]) : 3,
                    reps: setsRepsMatch ? setsRepsMatch[2] : '10',
                    selected: true,
                });
            }
        }

        return exercises;
    };

    const handleParse = () => {
        const text = mode === 'paste' ? pasteText : '';
        if (!text.trim()) {
            toast.error('Enter some text to parse');
            return;
        }

        const parsed = parseExercisesFromText(text);
        if (parsed.length === 0) {
            toast.error('Could not find any exercises in the text');
            return;
        }

        setParsedExercises(parsed);
        toast.success(`Found ${parsed.length} exercises!`);
    };

    const handleFetchUrl = async () => {
        if (!url.trim()) {
            toast.error('Enter a URL');
            return;
        }
        toast.error('URL fetching requires a Supabase Edge Function. Please paste the caption text instead.');
        setMode('paste');
    };

    const toggleExercise = (index: number) => {
        setParsedExercises(prev => prev.map((ex, i) =>
            i === index ? { ...ex, selected: !ex.selected } : ex
        ));
    };

    const updateParsedExercise = (index: number, field: keyof ParsedExercise, value: string) => {
        setParsedExercises(prev => prev.map((ex, i) =>
            i === index ? { ...ex, [field]: value } : ex
        ));
    };

    const handleImport = async () => {
        const selected = parsedExercises.filter(ex => ex.selected);
        if (selected.length === 0) {
            toast.error('Select at least one exercise');
            return;
        }

        setLoading(true);
        const addedExercises: { id: string; name: string; sets: number; reps: string }[] = [];

        for (const ex of selected) {
            const result = await addExercise({
                name: ex.name,
                muscle_group: ex.muscle_group,
                equipment: ex.equipment,
                instructions: null,
                secondary_muscles: [],
                source_url: url || null,
            });
            if (result) {
                addedExercises.push({
                    id: result.id,
                    name: result.name,
                    sets: ex.sets || 3,
                    reps: ex.reps || '10',
                });
            }
        }

        // Create template if name provided
        if (templateName.trim() && addedExercises.length > 0) {
            await addTemplate({
                name: templateName,
                description: url ? `Imported from ${url}` : 'Imported workout',
                exercises: addedExercises.map((ex, i) => ({
                    exercise_id: ex.id,
                    exercise_name: ex.name,
                    target_sets: ex.sets,
                    target_reps: ex.reps,
                    order: i,
                })),
                program_name: null,
            });
        }

        setLoading(false);
        setImported(true);
        toast.success(`Imported ${addedExercises.length} exercises!`);
    };

    if (imported) {
        return (
            <div className="page-container">
                <div className="import-success animate-slide-up">
                    <div className="import-success-icon">
                        <Check size={40} />
                    </div>
                    <h2>Import Complete!</h2>
                    <p>Exercises have been added to your library{templateName ? ` and a template "${templateName}" was created` : ''}.</p>
                    <div className="flex gap-md">
                        <button className="btn btn-primary" onClick={() => { setImported(false); setParsedExercises([]); setPasteText(''); setUrl(''); setTemplateName(''); }}>
                            Import More
                        </button>
                        <button className="btn btn-secondary" onClick={() => window.location.href = '/exercises'}>
                            View Exercises
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Import Exercises</h1>
                <p>Paste workout text from Instagram reels, posts, or any source</p>
            </div>

            {/* Mode Toggle */}
            <div className="import-mode-toggle">
                <button
                    className={`btn ${mode === 'paste' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setMode('paste')}
                >
                    <Clipboard size={16} /> Paste Text
                </button>
                <button
                    className={`btn ${mode === 'url' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setMode('url')}
                >
                    <Link size={16} /> From URL
                </button>
            </div>

            {parsedExercises.length === 0 ? (
                <div className="card import-input-card animate-slide-up">
                    {mode === 'paste' ? (
                        <div className="input-group">
                            <label>Paste workout description</label>
                            <textarea
                                className="input"
                                placeholder={`Paste workout text here, e.g.:\n\nBench Press 4x8\nIncline DB Press 3x12\nCable Flyes 3x15\nTricep Pushdowns 3x12\nOverhead Tricep Extension 3x10`}
                                value={pasteText}
                                onChange={e => setPasteText(e.target.value)}
                                rows={10}
                                style={{ minHeight: '200px' }}
                            />
                        </div>
                    ) : (
                        <div className="input-group">
                            <label>Instagram Post/Reel URL</label>
                            <input
                                className="input"
                                placeholder="https://www.instagram.com/reel/..."
                                value={url}
                                onChange={e => setUrl(e.target.value)}
                            />
                            <span className="text-sm text-secondary">
                                Note: URL fetching requires a Supabase Edge Function setup. For now, paste the caption text instead.
                            </span>
                        </div>
                    )}

                    <button
                        className="btn btn-primary btn-lg w-full"
                        onClick={mode === 'paste' ? handleParse : handleFetchUrl}
                        disabled={loading}
                    >
                        {loading ? <Loader2 size={18} className="spin" /> : <Sparkles size={18} />}
                        {loading ? 'Parsing...' : 'Extract Exercises'}
                    </button>
                </div>
            ) : (
                <div className="animate-slide-up">
                    {/* Template name */}
                    <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                        <div className="input-group">
                            <label>Create a template? (optional)</label>
                            <input
                                className="input"
                                placeholder="e.g. Instagram Push Workout"
                                value={templateName}
                                onChange={e => setTemplateName(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Parsed exercises */}
                    <div className="parsed-exercises">
                        {parsedExercises.map((ex, i) => (
                            <div key={i} className={`card parsed-exercise-card ${!ex.selected ? 'deselected' : ''}`}>
                                <div className="parsed-exercise-header">
                                    <label className="parsed-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={ex.selected}
                                            onChange={() => toggleExercise(i)}
                                        />
                                        <span className="checkmark" />
                                    </label>
                                    <input
                                        className="input input-sm"
                                        value={ex.name}
                                        onChange={e => updateParsedExercise(i, 'name', e.target.value)}
                                        style={{ flex: 1 }}
                                    />
                                </div>
                                <div className="parsed-exercise-details">
                                    <select
                                        className="input input-sm"
                                        value={ex.muscle_group}
                                        onChange={e => updateParsedExercise(i, 'muscle_group', e.target.value)}
                                    >
                                        {MUSCLE_GROUPS.map(mg => <option key={mg} value={mg}>{mg}</option>)}
                                    </select>
                                    <select
                                        className="input input-sm"
                                        value={ex.equipment}
                                        onChange={e => updateParsedExercise(i, 'equipment', e.target.value)}
                                    >
                                        {EQUIPMENT_OPTIONS.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                                    </select>
                                    <span className="text-sm text-secondary">{ex.sets} × {ex.reps}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="import-actions">
                        <button className="btn btn-secondary" onClick={() => setParsedExercises([])}>
                            Back
                        </button>
                        <button className="btn btn-primary btn-lg" onClick={handleImport} disabled={loading}>
                            {loading ? <Loader2 size={18} className="spin" /> : <Plus size={18} />}
                            Import {parsedExercises.filter(e => e.selected).length} Exercises
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
