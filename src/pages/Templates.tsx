import { useState } from 'react';
import { Plus, ClipboardList, Trash2, Edit2, Copy, Play } from 'lucide-react';
import { useTemplates, useExercises } from '../lib/hooks';
import { useNavigate } from 'react-router-dom';

import type { TemplateExercise } from '../lib/supabase';
import toast from 'react-hot-toast';
import ExerciseSelectorModal from '../components/ExerciseSelectorModal';
import './Templates.css';

export default function Templates() {
    const navigate = useNavigate();
    const { templates, loading, addTemplate, updateTemplate, deleteTemplate } = useTemplates();
    const { exercises } = useExercises();
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);

    const [templateName, setTemplateName] = useState('');
    const [description, setDescription] = useState('');
    const [programName, setProgramName] = useState('');
    const [templateExercises, setTemplateExercises] = useState<TemplateExercise[]>([]);

    const resetForm = () => {
        setTemplateName('');
        setDescription('');
        setProgramName('');
        setTemplateExercises([]);
        setEditingId(null);
        setShowForm(false);
    };

    const addExerciseToTemplate = (exerciseId: string) => {
        const ex = exercises.find(e => e.id === exerciseId);
        if (!ex) return;
        const exists = templateExercises.some(te => te.exercise_id === exerciseId);
        if (exists) {
            toast.error('Exercise already in template');
            return;
        }
        setTemplateExercises(prev => [...prev, {
            exercise_id: ex.id,
            exercise_name: ex.name,
            target_sets: 3,
            target_reps: '8-12',
            order: prev.length,
        }]);
    };

    const removeExerciseFromTemplate = (index: number) => {
        setTemplateExercises(prev => prev.filter((_, i) => i !== index));
    };

    const updateTemplateExercise = (index: number, field: keyof TemplateExercise, value: string | number) => {
        setTemplateExercises(prev => prev.map((te, i) =>
            i === index ? { ...te, [field]: value } : te
        ));
    };

    const startEdit = (template: typeof templates[0]) => {
        setTemplateName(template.name);
        setDescription(template.description || '');
        setProgramName(template.program_name || '');
        setTemplateExercises(template.exercises || []);
        setEditingId(template.id);
        setShowForm(true);
    };

    const duplicateTemplate = async (template: typeof templates[0]) => {
        await addTemplate({
            name: `${template.name} (Copy)`,
            description: template.description,
            exercises: template.exercises,
            program_name: template.program_name,
        });
        toast.success('Template duplicated!');
    };

    const handleSubmit = async () => {
        if (!templateName) {
            toast.error('Template name is required');
            return;
        }

        if (editingId) {
            await updateTemplate(editingId, {
                name: templateName,
                description: description || null,
                exercises: templateExercises,
                program_name: programName || null,
            });
            toast.success('Template updated!');
        } else {
            await addTemplate({
                name: templateName,
                description: description || null,
                exercises: templateExercises,
                program_name: programName || null,
            });
            toast.success('Template created!');
        }
        resetForm();
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Delete template "${name}"?`)) {
            await deleteTemplate(id);
            toast.success('Template deleted');
        }
    };

    const startWorkoutFromTemplate = (template: typeof templates[0]) => {
        navigate('/workout', { state: { template } });
    };

    // Group by program
    const programs = [...new Set(templates.filter(t => t.program_name).map(t => t.program_name))];
    const ungrouped = templates.filter(t => !t.program_name);

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="flex items-center justify-between">
                    <div>
                        <h1>Workout Templates</h1>
                        <p>Create and manage reusable workout plans</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
                        <Plus size={18} />
                        New Template
                    </button>
                </div>
            </div>

            {/* Template Form Modal */}
            {showForm && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) resetForm(); }}>
                    <div className="modal" style={{ maxWidth: '640px' }}>
                        <div className="modal-header">
                            <h2>{editingId ? 'Edit Template' : 'New Template'}</h2>
                            <button className="btn btn-ghost btn-icon" onClick={resetForm}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="input-group">
                                <label>Template Name *</label>
                                <input className="input" placeholder="e.g. Push Day" value={templateName} onChange={e => setTemplateName(e.target.value)} />
                            </div>
                            <div className="input-group">
                                <label>Description</label>
                                <textarea className="input" placeholder="Optional description..." value={description} onChange={e => setDescription(e.target.value)} />
                            </div>
                            <div className="input-group">
                                <label>Program Name (optional, for grouping)</label>
                                <input className="input" placeholder="e.g. PPL, Upper/Lower" value={programName} onChange={e => setProgramName(e.target.value)} />
                            </div>

                            <div className="template-exercises-section">
                                <label>Exercises</label>
                                <button
                                    className="btn btn-secondary w-full"
                                    onClick={() => setIsSelectorOpen(true)}
                                    style={{ marginBottom: 'var(--space-md)' }}
                                >
                                    <Plus size={16} /> Add Exercise
                                </button>

                                {templateExercises.length > 0 && (
                                    <div className="template-exercise-list">
                                        {templateExercises.map((te, i) => (
                                            <div key={i} className="template-exercise-row">
                                                <span className="te-order">{i + 1}</span>
                                                <span className="te-name">{te.exercise_name}</span>
                                                <input
                                                    className="input input-sm te-input"
                                                    type="number"
                                                    value={te.target_sets}
                                                    onChange={e => updateTemplateExercise(i, 'target_sets', parseInt(e.target.value) || 0)}
                                                    min={1}
                                                    style={{ width: '60px' }}
                                                />
                                                <span className="text-secondary text-sm">sets ×</span>
                                                <input
                                                    className="input input-sm te-input"
                                                    value={te.target_reps}
                                                    onChange={e => updateTemplateExercise(i, 'target_reps', e.target.value)}
                                                    placeholder="8-12"
                                                    style={{ width: '70px' }}
                                                />
                                                <span className="text-secondary text-sm">reps</span>
                                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeExerciseFromTemplate(i)}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={resetForm}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSubmit}>
                                {editingId ? 'Save Changes' : 'Create Template'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ExerciseSelectorModal
                isOpen={isSelectorOpen}
                onClose={() => setIsSelectorOpen(false)}
                onSelect={(id) => {
                    addExerciseToTemplate(id);
                    setIsSelectorOpen(false);
                }}
            />

            {/* Templates List */}
            {loading ? (
                <div className="empty-state"><p>Loading templates...</p></div>
            ) : templates.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon"><ClipboardList size={32} /></div>
                    <h3>No templates yet</h3>
                    <p>Create workout templates for your regular routines</p>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                        <Plus size={18} /> New Template
                    </button>
                </div>
            ) : (
                <>
                    {programs.map(program => (
                        <div key={program} className="program-section">
                            <h2 className="program-title">{program}</h2>
                            <div className="grid grid-auto">
                                {templates.filter(t => t.program_name === program).map(template => (
                                    <TemplateCard
                                        key={template.id}
                                        template={template}
                                        onStart={() => startWorkoutFromTemplate(template)}
                                        onEdit={() => startEdit(template)}
                                        onDuplicate={() => duplicateTemplate(template)}
                                        onDelete={() => handleDelete(template.id, template.name)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                    {ungrouped.length > 0 && (
                        <div className="program-section">
                            {programs.length > 0 && <h2 className="program-title">Other Templates</h2>}
                            <div className="grid grid-auto">
                                {ungrouped.map(template => (
                                    <TemplateCard
                                        key={template.id}
                                        template={template}
                                        onStart={() => startWorkoutFromTemplate(template)}
                                        onEdit={() => startEdit(template)}
                                        onDuplicate={() => duplicateTemplate(template)}
                                        onDelete={() => handleDelete(template.id, template.name)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function TemplateCard({ template, onStart, onEdit, onDuplicate, onDelete }: {
    template: any;
    onStart: () => void;
    onEdit: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
}) {
    return (
        <div className="card card-interactive card-glow template-card">
            <div className="template-card-header">
                <h3>{template.name}</h3>
                <div className="template-card-actions">
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={onEdit} title="Edit"><Edit2 size={14} /></button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={onDuplicate} title="Duplicate"><Copy size={14} /></button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={onDelete} title="Delete"><Trash2 size={14} /></button>
                </div>
            </div>
            {template.description && (
                <p className="template-card-desc">{template.description}</p>
            )}
            <div className="template-card-exercises">
                {(template.exercises || []).map((te: TemplateExercise, i: number) => (
                    <div key={i} className="te-preview">
                        <span>{te.exercise_name}</span>
                        <span className="text-secondary text-sm">{te.target_sets} × {te.target_reps}</span>
                    </div>
                ))}
            </div>
            <button className="btn btn-primary w-full" onClick={onStart} style={{ marginTop: 'var(--space-lg)' }}>
                <Play size={16} /> Start Workout
            </button>
        </div>
    );
}
