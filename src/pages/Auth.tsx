import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Flame, Mail, Lock, User, ArrowRight, AtSign, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import './Auth.css';

export default function Auth() {
    const { signIn, signUp } = useAuth();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [username, setUsername] = useState('');
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [checkingUsername, setCheckingUsername] = useState(false);
    const [loading, setLoading] = useState(false);
    const [emailOrUsername, setEmailOrUsername] = useState('');
    const usernameTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Real-time username availability check (debounced)
    useEffect(() => {
        if (!isSignUp || !username.trim() || username.trim().length < 2) {
            setUsernameAvailable(null);
            return;
        }

        setCheckingUsername(true);
        if (usernameTimeout.current) clearTimeout(usernameTimeout.current);

        usernameTimeout.current = setTimeout(async () => {
            const { data, error } = await supabase.rpc('check_username_available', {
                desired_username: username.trim(),
            });
            if (!error) {
                setUsernameAvailable(data as boolean);
            }
            setCheckingUsername(false);
        }, 400);

        return () => {
            if (usernameTimeout.current) clearTimeout(usernameTimeout.current);
        };
    }, [username, isSignUp]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isSignUp) {
                if (username.trim().length < 2) {
                    toast.error('Username must be at least 2 characters');
                    return;
                }
                if (username.trim().length > 15) {
                    toast.error('Username must be 15 characters or less');
                    return;
                }
                if (usernameAvailable === false) {
                    toast.error('That username is already taken');
                    return;
                }

                const { error } = await signUp(email, password, displayName, username.trim());
                if (error) {
                    if (error.message.toLowerCase().includes('email limit exceeded')) {
                        toast.error('The signup limit for the default email service has been reached. Please try again in an hour or check the console for instructions on how to fix this.', { duration: 6000 });
                        console.warn('Fix for "Email limit exceeded": You are hitting the Supabase default SMTP limits. To fix this, disable "Confirm email" in Authentication -> Settings -> Email Auth in your Supabase dashboard, or set up a custom SMTP provider like Resend.');
                    } else {
                        toast.error(error.message);
                    }
                } else {
                    toast.success('Account created! Sign in to continue.');
                }
            } else {
                const { error } = await signIn(emailOrUsername, password);
                if (error) {
                    toast.error(error.message);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-bg-gradient" />

            <div className="auth-container animate-slide-up">
                <div className="auth-header">
                    <div className="auth-logo">
                        <Flame size={32} />
                    </div>
                    <h1>Chud2Chad</h1>
                    <p>Your personal workout companion</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {isSignUp && (
                        <>
                            <div className="input-group">
                                <label>Display Name</label>
                                <div className="input-with-icon">
                                    <User size={18} className="input-icon" />
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Your name"
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
                                        className={`input ${usernameAvailable === true ? 'input-valid' : usernameAvailable === false ? 'input-invalid' : ''}`}
                                        placeholder="Pick a unique username"
                                        value={username}
                                        onChange={e => setUsername(e.target.value.slice(0, 15))}
                                        required
                                        maxLength={15}
                                        style={{ paddingLeft: '44px', paddingRight: '40px' }}
                                    />
                                    {username.trim().length >= 2 && (
                                        <span className="input-status-icon">
                                            {checkingUsername ? (
                                                <span className="spinner-small" />
                                            ) : usernameAvailable === true ? (
                                                <Check size={16} className="text-success" />
                                            ) : usernameAvailable === false ? (
                                                <X size={16} className="text-danger" />
                                            ) : null}
                                        </span>
                                    )}
                                </div>
                                {username.trim().length >= 2 && !checkingUsername && usernameAvailable === false && (
                                    <span className="input-hint text-danger">Username is taken</span>
                                )}
                                {username.trim().length >= 2 && !checkingUsername && usernameAvailable === true && (
                                    <span className="input-hint text-success">Username is available!</span>
                                )}
                            </div>
                        </>
                    )}

                    <div className="input-group">
                        <label>{isSignUp ? 'Email' : 'Email or Username'}</label>
                        <div className="input-with-icon">
                            <Mail size={18} className="input-icon" />
                            {isSignUp ? (
                                <input
                                    type="email"
                                    className="input"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    style={{ paddingLeft: '44px' }}
                                />
                            ) : (
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="you@example.com or username"
                                    value={emailOrUsername}
                                    onChange={e => setEmailOrUsername(e.target.value)}
                                    required
                                    style={{ paddingLeft: '44px' }}
                                />
                            )}
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Password</label>
                        <div className="input-with-icon">
                            <Lock size={18} className="input-icon" />
                            <input
                                type="password"
                                className="input"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                minLength={6}
                                style={{ paddingLeft: '44px' }}
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading || (isSignUp && usernameAvailable === false)}>
                        {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
                        <ArrowRight size={18} />
                    </button>
                </form>

                <div className="auth-switch">
                    <span>{isSignUp ? 'Already have an account?' : "Don't have an account?"}</span>
                    <button
                        className="btn btn-ghost"
                        onClick={() => setIsSignUp(!isSignUp)}
                    >
                        {isSignUp ? 'Sign In' : 'Sign Up'}
                    </button>
                </div>
            </div>
        </div>
    );
}
