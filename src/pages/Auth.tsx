import { useState, type FormEvent } from 'react';
import { Flame, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './Auth.css';

export default function Auth() {
    const { signIn, signUp } = useAuth();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isSignUp) {
                const { error } = await signUp(email, password, displayName);
                if (error) {
                    toast.error(error.message);
                } else {
                    toast.success('Account created! Check your email for confirmation.');
                }
            } else {
                const { error } = await signIn(email, password);
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
                    )}

                    <div className="input-group">
                        <label>Email</label>
                        <div className="input-with-icon">
                            <Mail size={18} className="input-icon" />
                            <input
                                type="email"
                                className="input"
                                placeholder="you@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                style={{ paddingLeft: '44px' }}
                            />
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

                    <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
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
