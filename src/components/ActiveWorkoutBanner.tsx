import { useActiveWorkout } from '../contexts/WorkoutContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Play, Timer } from 'lucide-react';
import { formatTimerDisplay } from '../lib/utils';
import { useEffect, useState } from 'react';

export default function ActiveWorkoutBanner() {
    const { isActive, workoutName, startedAt } = useActiveWorkout();
    const location = useLocation();
    const navigate = useNavigate();

    // We only need to force a re-render for the timer display
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        let interval: number | undefined;
        if (isActive && startedAt) {
            // Update immediately and then every second
            const updateTimer = () => {
                setElapsed(Math.floor((Date.now() - startedAt) / 1000));
            };
            updateTimer();
            interval = window.setInterval(updateTimer, 1000);
        } else {
            setElapsed(0);
        }
        return () => clearInterval(interval);
    }, [isActive, startedAt]);

    if (!isActive || location.pathname === '/workout') {
        return null;
    }

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '16px',
                left: '256px', // Sidebar width compensation on desktop, we can override with a global CSS rule if needed
                right: '16px',
                zIndex: 40,
                display: 'flex',
                justifyContent: 'center',
                pointerEvents: 'none'
            }}
            className="active-workout-banner-container"
        >
            <div
                style={{
                    background: 'var(--accent-primary)',
                    color: '#fff',
                    padding: '12px 20px',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 8px 32px rgba(255, 62, 0, 0.3)',
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    maxWidth: '400px',
                    width: '100%'
                }}
                onClick={() => navigate('/workout')}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
                <div style={{
                    background: 'rgba(255,255,255,0.2)',
                    minWidth: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Play size={18} fill="currentColor" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Active: {workoutName}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 600 }}>
                    <Timer size={16} />
                    {formatTimerDisplay(elapsed)}
                </div>
            </div>
            <style>{`
                @media (max-width: 768px) {
                    .active-workout-banner-container {
                        left: 16px !important;
                        bottom: 80px !important; /* Above bottom nav */
                    }
                }
            `}</style>
        </div>
    );
}
