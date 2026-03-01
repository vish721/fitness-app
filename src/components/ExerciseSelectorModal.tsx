import { useState, useMemo } from 'react';
import { Search, X, ChevronRight, ChevronDown, Plus, Dumbbell } from 'lucide-react';
import { useExercises } from '../lib/hooks';
import { MUSCLE_GROUP_BADGE_CLASS } from '../lib/utils';
import toast from 'react-hot-toast';
import './ExerciseSelectorModal.css';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (exerciseId: string) => void;
}

const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Full Body'];

export default function ExerciseSelectorModal({ isOpen, onClose, onSelect }: Props) {
    const { exercises, addExercise } = useExercises();
    const [search, setSearch] = useState('');
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // Custom exercise state
    const [creatingCustom, setCreatingCustom] = useState(false);
    const [customMuscleGroup, setCustomMuscleGroup] = useState(MUSCLE_GROUPS[0]);
    const [isSaving, setIsSaving] = useState(false);

    const toggleGroup = (group: string) => {
        setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
    };

    const handleCreateCustom = async () => {
        const name = search.trim();
        if (!name) return;
        setIsSaving(true);
        const newExercise = await addExercise({
            name,
            muscle_group: customMuscleGroup,
            equipment: 'Other',
            secondary_muscles: [],
            instructions: null,
            source_url: null,
            is_global: false
        });
        setIsSaving(false);
        if (newExercise) {
            toast.success(`Created custom exercise: ${name}`);
            setCreatingCustom(false);
            setSearch('');
            onSelect(newExercise.id);
        } else {
            toast.error('Failed to create custom exercise');
        }
    };

    const handleClose = () => {
        setSearch('');
        setCreatingCustom(false);
        onClose();
    };

    const filteredExercises = useMemo(() => {
        if (!search.trim()) return exercises;
        const lowerSearch = search.toLowerCase();
        return exercises.filter(e =>
            e.name.toLowerCase().includes(lowerSearch) ||
            e.muscle_group.toLowerCase().includes(lowerSearch)
        );
    }, [exercises, search]);

    const groupedExercises = useMemo(() => {
        const groups: Record<string, typeof exercises> = {};
        for (const ex of filteredExercises) {
            const mg = ex.muscle_group;
            if (!groups[mg]) groups[mg] = [];
            groups[mg].push(ex);
        }
        return groups;
    }, [filteredExercises]);

    const hasExactMatch = search.trim() !== '' && exercises.some(e => e.name.toLowerCase() === search.trim().toLowerCase());
    const isSearching = search.trim() !== '';

    if (!isOpen) return null;

    return (
        <div className="selector-modal-overlay" onClick={handleClose}>
            <div className="selector-modal" onClick={e => e.stopPropagation()}>
                <div className="selector-modal-header">
                    <h2>Select Exercise</h2>
                    <button className="btn btn-ghost btn-icon" onClick={handleClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="selector-search-container">
                    <Search className="selector-search-icon" size={18} />
                    <input
                        type="text"
                        className="selector-search-input"
                        placeholder="Search for an exercise..."
                        value={search}
                        onChange={e => {
                            setSearch(e.target.value);
                            setCreatingCustom(false);
                        }}
                        autoFocus
                    />
                    {search && (
                        <button className="btn btn-ghost btn-icon clear-search" onClick={() => setSearch('')}>
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="selector-content">
                    {/* Custom Exercise Flow */}
                    {isSearching && !hasExactMatch && (
                        <div className="custom-exercise-banner">
                            <p>Couldn't find exactly "<strong>{search}</strong>"?</p>

                            {!creatingCustom ? (
                                <button className="btn btn-primary btn-sm mt-sm" onClick={() => setCreatingCustom(true)}>
                                    <Plus size={14} /> Create Custom Exercise
                                </button>
                            ) : (
                                <div className="custom-exercise-form">
                                    <label className="text-sm text-secondary">Select Muscle Group</label>
                                    <select
                                        className="input"
                                        value={customMuscleGroup}
                                        onChange={e => setCustomMuscleGroup(e.target.value)}
                                        style={{ marginBottom: 'var(--space-sm)' }}
                                    >
                                        {MUSCLE_GROUPS.map(mg => (
                                            <option key={mg} value={mg}>{mg}</option>
                                        ))}
                                    </select>
                                    <div className="flex gap-sm">
                                        <button
                                            className="btn btn-primary flex-1"
                                            onClick={handleCreateCustom}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? 'Saving...' : 'Save & Select'}
                                        </button>
                                        <button
                                            className="btn btn-ghost flex-1"
                                            onClick={() => setCreatingCustom(false)}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Exercise Groups */}
                    {Object.keys(groupedExercises).length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon"><Dumbbell size={24} /></div>
                            <p>No exercises found.</p>
                        </div>
                    ) : (
                        <div className="exercise-groups">
                            {Object.entries(groupedExercises)
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([group, groupExercises]) => {
                                    // Auto-expand if searching
                                    const isExpanded = isSearching || expandedGroups[group];

                                    return (
                                        <div key={group} className="exercise-group">
                                            <button
                                                className="exercise-group-header"
                                                onClick={() => toggleGroup(group)}
                                            >
                                                <div className="flex items-center gap-sm">
                                                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                    <span className={`badge ${MUSCLE_GROUP_BADGE_CLASS[group] || 'badge-primary'}`}>
                                                        {group}
                                                    </span>
                                                </div>
                                                <span className="text-sm text-secondary">{groupExercises.length}</span>
                                            </button>

                                            {isExpanded && (
                                                <div className="exercise-group-list animate-slide-up">
                                                    {groupExercises.sort((a, b) => a.name.localeCompare(b.name)).map(ex => (
                                                        <button
                                                            key={ex.id}
                                                            className="exercise-item-btn"
                                                            onClick={() => onSelect(ex.id)}
                                                        >
                                                            <div className="exercise-item-name">{ex.name}</div>
                                                            {ex.equipment && <div className="exercise-item-meta">{ex.equipment}</div>}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
