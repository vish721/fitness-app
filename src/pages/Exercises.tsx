import { useState } from 'react';
import { Search, Plus, Trash2, Edit2, Dumbbell } from 'lucide-react';
import { useExercises } from '../lib/hooks';
import { MUSCLE_GROUPS, EQUIPMENT_OPTIONS, MUSCLE_GROUP_BADGE_CLASS, cn } from '../lib/utils';
import toast from 'react-hot-toast';
import './Exercises.css';

export default function Exercises() {
    const { exercises, loading, addExercise, updateExercise, deleteExercise } = useExercises();
    const [search, setSearch] = useState('');
    const [filterMuscle, setFilterMuscle] = useState<string>('');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [muscleGroup, setMuscleGroup] = useState('');
    const [equipment, setEquipment] = useState('');
    const [instructions, setInstructions] = useState('');
    const [secondaryMuscles, setSecondaryMuscles] = useState<string[]>([]);

    const filtered = exercises.filter(ex => {
        const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
        const matchesMuscle = !filterMuscle || ex.muscle_group === filterMuscle;
        return matchesSearch && matchesMuscle;
    });

    const resetForm = () => {
        setName('');
        setMuscleGroup('');
        setEquipment('');
        setInstructions('');
        setSecondaryMuscles([]);
        setEditingId(null);
        setShowForm(false);
    };

    const startEdit = (ex: typeof exercises[0]) => {
        setName(ex.name);
        setMuscleGroup(ex.muscle_group);
        setEquipment(ex.equipment);
        setInstructions(ex.instructions || '');
        setSecondaryMuscles(ex.secondary_muscles || []);
        setEditingId(ex.id);
        setShowForm(true);
    };

    const handleSubmit = async () => {
        if (!name || !muscleGroup) {
            toast.error('Name and muscle group are required');
            return;
        }

        if (editingId) {
            const success = await updateExercise(editingId, {
                name, muscle_group: muscleGroup, equipment, instructions, secondary_muscles: secondaryMuscles,
            });
            if (success) toast.success('Exercise updated!');
        } else {
            const result = await addExercise({
                name, muscle_group: muscleGroup, equipment: equipment || 'Bodyweight',
                instructions, secondary_muscles: secondaryMuscles, source_url: null,
                is_global: false
            });
            if (result) toast.success('Exercise added!');
        }
        resetForm();
    };

    const handleDelete = async (id: string, exerciseName: string) => {
        if (confirm(`Delete "${exerciseName}"?`)) {
            const success = await deleteExercise(id);
            if (success) toast.success('Exercise deleted');
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="flex items-center justify-between">
                    <div>
                        <h1>Exercise Library</h1>
                        <p>{exercises.length} exercises in your library</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
                        <Plus size={18} />
                        Add Exercise
                    </button>
                </div>
            </div>

            {/* Search + Filter */}
            <div className="exercises-toolbar">
                <div className="search-bar" style={{ flex: 1 }}>
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        className="input"
                        placeholder="Search exercises..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ paddingLeft: '44px' }}
                    />
                </div>
                <div className="muscle-filters">
                    <button
                        className={cn('btn btn-sm', !filterMuscle ? 'btn-primary' : 'btn-secondary')}
                        onClick={() => setFilterMuscle('')}
                    >
                        All
                    </button>
                    {MUSCLE_GROUPS.map(mg => (
                        <button
                            key={mg}
                            className={cn('btn btn-sm', filterMuscle === mg ? 'btn-primary' : 'btn-secondary')}
                            onClick={() => setFilterMuscle(filterMuscle === mg ? '' : mg)}
                        >
                            {mg}
                        </button>
                    ))}
                </div>
            </div>

            {/* Exercise Form Modal */}
            {showForm && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) resetForm(); }}>
                    <div className="modal">
                        <div className="modal-header">
                            <h2>{editingId ? 'Edit Exercise' : 'Add New Exercise'}</h2>
                            <button className="btn btn-ghost btn-icon" onClick={resetForm}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="input-group">
                                <label>Exercise Name *</label>
                                <input className="input" placeholder="e.g. Bench Press" value={name} onChange={e => setName(e.target.value)} />
                            </div>
                            <div className="input-group">
                                <label>Primary Muscle Group *</label>
                                <select className="input" value={muscleGroup} onChange={e => setMuscleGroup(e.target.value)}>
                                    <option value="">Select muscle group</option>
                                    {MUSCLE_GROUPS.map(mg => <option key={mg} value={mg}>{mg}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Equipment</label>
                                <select className="input" value={equipment} onChange={e => setEquipment(e.target.value)}>
                                    <option value="">Select equipment</option>
                                    {EQUIPMENT_OPTIONS.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Instructions (optional)</label>
                                <textarea className="input" placeholder="Describe the exercise..." value={instructions} onChange={e => setInstructions(e.target.value)} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={resetForm}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSubmit}>
                                {editingId ? 'Save Changes' : 'Add Exercise'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Exercise Grid */}
            {loading ? (
                <div className="empty-state"><p>Loading exercises...</p></div>
            ) : filtered.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon"><Dumbbell size={32} /></div>
                    <h3>{search || filterMuscle ? 'No exercises found' : 'No exercises yet'}</h3>
                    <p>{search || filterMuscle ? 'Try adjusting your search or filters' : 'Add your first exercise to get started'}</p>
                    {!search && !filterMuscle && (
                        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                            <Plus size={18} /> Add Exercise
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-auto">
                    {filtered.map(ex => (
                        <div key={ex.id} className="card card-interactive exercise-card">
                            <div className="exercise-card-header">
                                <h3>{ex.name}</h3>
                                <div className="exercise-card-actions">
                                    {!ex.is_global && (
                                        <>
                                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => startEdit(ex)} title="Edit custom exercise">
                                                <Edit2 size={14} />
                                            </button>
                                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(ex.id, ex.name)} title="Delete custom exercise">
                                                <Trash2 size={14} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="exercise-card-badges">
                                <span className={`badge ${MUSCLE_GROUP_BADGE_CLASS[ex.muscle_group] || 'badge-primary'}`}>
                                    {ex.muscle_group}
                                </span>
                                {ex.equipment && (
                                    <span className="badge badge-primary">{ex.equipment}</span>
                                )}
                                {ex.is_global ? (
                                    <span className="badge" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>Global</span>
                                ) : (
                                    <span className="badge" style={{ background: 'var(--accent-primary-subtle)', color: 'var(--accent-primary)' }}>Custom</span>
                                )}
                            </div>
                            {ex.instructions && (
                                <p className="exercise-card-instructions">{ex.instructions}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
