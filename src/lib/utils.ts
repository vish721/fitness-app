import { format, formatDistanceToNow, differenceInDays, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameDay, subWeeks } from 'date-fns';

export const MUSCLE_GROUPS = [
    'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio', 'Full Body'
] as const;

export type MuscleGroup = typeof MUSCLE_GROUPS[number];

export const EQUIPMENT_OPTIONS = [
    'Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Kettlebell', 'Band', 'Other'
] as const;

export const MUSCLE_GROUP_BADGE_CLASS: Record<string, string> = {
    'Chest': 'badge-chest',
    'Back': 'badge-back',
    'Shoulders': 'badge-shoulders',
    'Arms': 'badge-arms',
    'Legs': 'badge-legs',
    'Core': 'badge-core',
    'Cardio': 'badge-cardio',
    'Full Body': 'badge-full-body',
};

export function formatDate(date: string | Date): string {
    return format(new Date(date), 'MMM d, yyyy');
}

export function formatTime(date: string | Date): string {
    return format(new Date(date), 'h:mm a');
}

export function formatRelative(date: string | Date): string {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDuration(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
}

export function formatTimerDisplay(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function calculateOneRepMax(weight: number, reps: number): number {
    if (reps === 1) return weight;
    // Brzycki formula
    return Math.round(weight * (36 / (37 - reps)));
}

export function calculateVolume(weight: number, reps: number, sets: number = 1): number {
    return weight * reps * sets;
}

export function getStreakData(workoutDates: Date[], weeks: number = 12) {
    const endDate = new Date();
    const startDate = subWeeks(startOfWeek(endDate, { weekStartsOn: 1 }), weeks - 1);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return days.map(day => {
        const workoutsOnDay = workoutDates.filter(d => isSameDay(d, day));
        return {
            date: day,
            count: workoutsOnDay.length,
            isToday: isToday(day),
            level: workoutsOnDay.length === 0 ? 0 :
                workoutsOnDay.length === 1 ? 1 :
                    workoutsOnDay.length === 2 ? 2 :
                        workoutsOnDay.length >= 3 ? 3 : 4,
        };
    });
}

export function calculateStreak(workoutDates: Date[]): { current: number; longest: number } {
    if (workoutDates.length === 0) return { current: 0, longest: 0 };

    const sorted = [...workoutDates].sort((a, b) => b.getTime() - a.getTime());
    const uniqueDays = sorted.reduce<Date[]>((acc, date) => {
        if (acc.length === 0 || !isSameDay(acc[acc.length - 1], date)) {
            acc.push(date);
        }
        return acc;
    }, []);

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    const today = new Date();
    const daysSinceLastWorkout = differenceInDays(today, uniqueDays[0]);

    if (daysSinceLastWorkout <= 1) {
        currentStreak = 1;
        for (let i = 1; i < uniqueDays.length; i++) {
            if (differenceInDays(uniqueDays[i - 1], uniqueDays[i]) <= 1) {
                currentStreak++;
            } else {
                break;
            }
        }
    }

    for (let i = 1; i < uniqueDays.length; i++) {
        if (differenceInDays(uniqueDays[i - 1], uniqueDays[i]) <= 1) {
            tempStreak++;
        } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
        }
    }
    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

    return { current: currentStreak, longest: longestStreak };
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
    return classes.filter(Boolean).join(' ');
}
