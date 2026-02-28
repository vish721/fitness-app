import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Flame, TrendingUp, Dumbbell, Trophy, Play,
    ChevronRight, Calendar, Zap, Target
} from 'lucide-react';
import { useWorkouts } from '../lib/hooks';
import { useExercises } from '../lib/hooks';
import { usePersonalRecords } from '../lib/hooks';
import { formatDate, formatDuration, formatRelative, calculateStreak, getStreakData } from '../lib/utils';
import './Dashboard.css';

export default function Dashboard() {
    const navigate = useNavigate();
    const { workouts } = useWorkouts();
    const { exercises } = useExercises();
    const { records } = usePersonalRecords();
    const completedWorkouts = workouts.filter(w => w.completed_at);
    const workoutDates = completedWorkouts.map(w => new Date(w.started_at));
    const streak = calculateStreak(workoutDates);
    const streakData = getStreakData(workoutDates);

    // This week's workouts
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    const thisWeekWorkouts = completedWorkouts.filter(
        w => new Date(w.started_at) >= weekStart
    );

    // Total volume this week (would need sets data, showing count for now)
    const recentPRs = records.slice(0, 5);

    return (
        <div className="page-container">
            <div className="dashboard-hero animate-slide-up">
                <div className="hero-content">
                    <h1>Welcome back! 💪</h1>
                    <p>
                        {streak.current > 0
                            ? `You're on a ${streak.current}-day streak. Keep it going!`
                            : "Start a workout to begin your streak!"}
                    </p>
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={() => navigate('/workout')}
                    >
                        <Play size={20} />
                        Start Workout
                    </button>
                </div>
                <div className="hero-streak">
                    <div className="streak-number">
                        <Flame size={28} />
                        <span>{streak.current}</span>
                    </div>
                    <span className="streak-label">Day Streak</span>
                </div>
            </div>

            <div className="grid grid-4 dashboard-stats">
                <div className="stat-card animate-in">
                    <div className="stat-icon" style={{ background: 'var(--accent-primary-subtle)', color: 'var(--accent-primary)' }}>
                        <Dumbbell size={20} />
                    </div>
                    <span className="stat-label">Total Workouts</span>
                    <span className="stat-value">{completedWorkouts.length}</span>
                </div>
                <div className="stat-card animate-in">
                    <div className="stat-icon" style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>
                        <Calendar size={20} />
                    </div>
                    <span className="stat-label">This Week</span>
                    <span className="stat-value">{thisWeekWorkouts.length}</span>
                </div>
                <div className="stat-card animate-in">
                    <div className="stat-icon" style={{ background: 'var(--warning-subtle)', color: 'var(--warning)' }}>
                        <Target size={20} />
                    </div>
                    <span className="stat-label">Exercises</span>
                    <span className="stat-value">{exercises.length}</span>
                </div>
                <div className="stat-card animate-in">
                    <div className="stat-icon" style={{ background: 'var(--danger-subtle)', color: 'var(--danger)' }}>
                        <Trophy size={20} />
                    </div>
                    <span className="stat-label">Personal Records</span>
                    <span className="stat-value">{records.length}</span>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="card dashboard-calendar">
                    <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-lg)' }}>
                        <h3>Activity</h3>
                        <span className="text-sm text-secondary">Last 12 weeks</span>
                    </div>
                    <div className="streak-grid">
                        {streakData.map((day, i) => (
                            <div
                                key={i}
                                className={`streak-cell level-${day.level} ${day.isToday ? 'today' : ''}`}
                                title={`${formatDate(day.date)}: ${day.count} workout${day.count !== 1 ? 's' : ''}`}
                            />
                        ))}
                    </div>
                    <div className="streak-legend">
                        <span>Less</span>
                        <div className="streak-cell" />
                        <div className="streak-cell level-1" />
                        <div className="streak-cell level-2" />
                        <div className="streak-cell level-3" />
                        <div className="streak-cell level-4" />
                        <span>More</span>
                    </div>
                </div>

                <div className="card dashboard-recent">
                    <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-lg)' }}>
                        <h3>Recent Workouts</h3>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/history')}>
                            View All <ChevronRight size={14} />
                        </button>
                    </div>
                    {completedWorkouts.length === 0 ? (
                        <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                            <p style={{ marginBottom: 0 }}>No workouts yet. Start your first one!</p>
                        </div>
                    ) : (
                        <div className="recent-list">
                            {completedWorkouts.slice(0, 5).map(workout => (
                                <div key={workout.id} className="recent-item">
                                    <div className="recent-item-info">
                                        <span className="recent-item-name">{workout.name}</span>
                                        <span className="recent-item-date">{formatRelative(workout.started_at)}</span>
                                    </div>
                                    {workout.duration_seconds && (
                                        <span className="badge badge-primary">
                                            {formatDuration(workout.duration_seconds)}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {recentPRs.length > 0 && (
                    <div className="card dashboard-prs">
                        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-lg)' }}>
                            <h3>🏆 Recent PRs</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/progress')}>
                                View All <ChevronRight size={14} />
                            </button>
                        </div>
                        <div className="recent-list">
                            {recentPRs.map(pr => (
                                <div key={pr.id} className="recent-item">
                                    <div className="recent-item-info">
                                        <span className="recent-item-name">
                                            {exercises.find(e => e.id === pr.exercise_id)?.name || 'Unknown'}
                                        </span>
                                        <span className="recent-item-date">
                                            {pr.record_type === 'max_weight' ? `${pr.value} kg` :
                                                pr.record_type === 'max_reps' ? `${pr.value} reps` :
                                                    `${pr.value} kg vol`}
                                        </span>
                                    </div>
                                    <span className="badge badge-warning">{pr.record_type.replace('_', ' ')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {streak.longest > 0 && (
                <div className="card dashboard-longest-streak animate-in" style={{ marginTop: 'var(--space-lg)' }}>
                    <Zap size={20} style={{ color: 'var(--warning)' }} />
                    <span>Longest streak: <strong>{streak.longest} days</strong></span>
                </div>
            )}
        </div>
    );
}
