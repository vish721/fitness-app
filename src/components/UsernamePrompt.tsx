import { useState, useEffect, useRef } from 'react';
import { AtSign, Check, X, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './UsernamePrompt.css';

export default function UsernamePrompt() {
    const { user, refreshProfile } = useAuth();
    const [username, setUsername] = useState('');
    const [available, setAvailable] = useState<boolean | null>(null);
    const [checking, setChecking] = useState(false);
    const [saving, setSaving] = useState(false);
    const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!username.trim() || username.trim().length < 2) {
            setAvailable(null);
            return;
        }

        setChecking(true);
        if (timeout.current) clearTimeout(timeout.current);

        timeout.current = setTimeout(async () => {
            const { data, error } = await supabase.rpc('check_username_available', {
                desired_username: username.trim(),
            });
            if (!error) setAvailable(data as boolean);
            setChecking(false);
        }, 400);

        return () => {
            if (timeout.current) clearTimeout(timeout.current);
        };
    }, [username]);

    const handleSave = async () => {
        if (!user || !username.trim() || available !== true) return;
        setSaving(true);

        const { error } = await supabase
            .from('profiles')
            .update({ username: username.toLowerCase().trim() })
            .eq('id', user.id);

        if (error) {
            if (error.message.includes('unique') || error.message.includes('duplicate')) {
                toast.error('That username was just taken! Try another.');
                setAvailable(false);
            } else {
                toast.error('Failed to save username');
            }
        } else {
            toast.success('Username set! 🎉');
            await refreshProfile();
        }
        setSaving(false);
    };

    return (
        <div className="username-prompt-overlay">
            <div className="username-prompt-card animate-slide-up">
                <div className="username-prompt-icon">
                    <Sparkles size={36} />
                </div>
                <h2>Pick a Username</h2>
                <p>Choose a unique username so your friends can find you easily.</p>

                <div className="input-group" style={{ width: '100%', maxWidth: '320px', marginTop: 'var(--space-lg)' }}>
                    <div className="input-with-icon">
                        <AtSign size={18} className="input-icon" />
                        <input
                            type="text"
                            className={`input ${available === true ? 'input-valid' : available === false ? 'input-invalid' : ''}`}
                            placeholder="your_username"
                            value={username}
                            onChange={e => setUsername(e.target.value.slice(0, 15))}
                            maxLength={15}
                            autoFocus
                            style={{ paddingLeft: '44px', paddingRight: '40px' }}
                        />
                        {username.trim().length >= 2 && (
                            <span className="input-status-icon">
                                {checking ? (
                                    <span className="spinner-small" />
                                ) : available === true ? (
                                    <Check size={16} className="text-success" />
                                ) : available === false ? (
                                    <X size={16} className="text-danger" />
                                ) : null}
                            </span>
                        )}
                    </div>
                    {username.trim().length >= 2 && !checking && available === false && (
                        <span className="input-hint text-danger">Username is taken</span>
                    )}
                    {username.trim().length >= 2 && !checking && available === true && (
                        <span className="input-hint text-success">Username is available!</span>
                    )}
                </div>

                <button
                    className="btn btn-primary btn-lg"
                    style={{ marginTop: 'var(--space-xl)' }}
                    onClick={handleSave}
                    disabled={saving || available !== true || username.trim().length < 2}
                >
                    {saving ? 'Saving...' : 'Set Username'}
                </button>
            </div>
        </div>
    );
}
