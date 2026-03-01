import { useState } from 'react';
import { User, AtSign, Mail, Save, Sun, Moon, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import './Settings.css';

export default function Settings() {
    const { user, profile, signOut, refreshProfile } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [displayName, setDisplayName] = useState(profile?.display_name || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!user || !displayName.trim()) return;
        setSaving(true);

        const { error } = await supabase
            .from('profiles')
            .update({ display_name: displayName.trim() })
            .eq('id', user.id);

        if (error) {
            toast.error('Failed to update profile');
        } else {
            toast.success('Profile updated!');
            await refreshProfile();
        }
        setSaving(false);
    };

    return (
        <div className="page-container">
            <div className="page-header animate-slide-up">
                <h1>Settings</h1>
                <p>Manage your profile and preferences</p>
            </div>

            {/* Profile Section */}
            <div className="settings-section animate-slide-up">
                <h2 className="settings-section-title">Profile</h2>
                <div className="settings-card">
                    <div className="settings-avatar">
                        {(profile?.display_name || user?.email)?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="settings-fields">
                        <div className="input-group">
                            <label>Display Name</label>
                            <div className="input-with-icon">
                                <User size={18} className="input-icon" />
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="What should we call you?"
                                    value={displayName}
                                    onChange={e => setDisplayName(e.target.value)}
                                    style={{ paddingLeft: '44px' }}
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Username</label>
                            <div className="input-with-icon">
                                <AtSign size={18} className="input-icon" />
                                <input
                                    type="text"
                                    className="input input-readonly"
                                    value={profile?.username || 'Not set'}
                                    readOnly
                                    disabled
                                    style={{ paddingLeft: '44px' }}
                                />
                            </div>
                            <span className="input-hint" style={{ color: 'var(--text-tertiary)' }}>
                                Usernames can't be changed
                            </span>
                        </div>

                        <div className="input-group">
                            <label>Email</label>
                            <div className="input-with-icon">
                                <Mail size={18} className="input-icon" />
                                <input
                                    type="text"
                                    className="input input-readonly"
                                    value={user?.email || ''}
                                    readOnly
                                    disabled
                                    style={{ paddingLeft: '44px' }}
                                />
                            </div>
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={handleSave}
                            disabled={saving || !displayName.trim() || displayName.trim() === (profile?.display_name || '')}
                        >
                            <Save size={16} />
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Appearance Section */}
            <div className="settings-section animate-slide-up" style={{ animationDelay: '50ms' }}>
                <h2 className="settings-section-title">Appearance</h2>
                <div className="settings-card">
                    <div className="settings-option">
                        <div className="settings-option-info">
                            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                            <div>
                                <span className="settings-option-label">Theme</span>
                                <span className="settings-option-desc">
                                    Currently using {theme === 'dark' ? 'dark' : 'light'} mode
                                </span>
                            </div>
                        </div>
                        <button className="btn btn-ghost" onClick={toggleTheme}>
                            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Account Section */}
            <div className="settings-section animate-slide-up" style={{ animationDelay: '100ms' }}>
                <h2 className="settings-section-title">Account</h2>
                <div className="settings-card">
                    <div className="settings-option">
                        <div className="settings-option-info">
                            <LogOut size={20} />
                            <div>
                                <span className="settings-option-label">Sign Out</span>
                                <span className="settings-option-desc">Log out of your account</span>
                            </div>
                        </div>
                        <button className="btn btn-danger" onClick={signOut}>
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
