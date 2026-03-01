import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl === 'your_supabase_url_here') {
  console.warn('⚠️ Supabase URL not configured. Please update .env file.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          display_name?: string | null;
          avatar_url?: string | null;
        };
      };
      exercises: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          muscle_group: string;
          secondary_muscles: string[];
          equipment: string;
          instructions: string | null;
          source_url: string | null;
          is_global: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          muscle_group: string;
          secondary_muscles?: string[];
          equipment?: string;
          instructions?: string | null;
          source_url?: string | null;
          is_global?: boolean;
        };
        Update: {
          name?: string;
          muscle_group?: string;
          secondary_muscles?: string[];
          equipment?: string;
          instructions?: string | null;
          source_url?: string | null;
          is_global?: boolean;
        };
      };
      workout_templates: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          exercises: TemplateExercise[];
          program_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          description?: string | null;
          exercises: TemplateExercise[];
          program_name?: string | null;
        };
        Update: {
          name?: string;
          description?: string | null;
          exercises?: TemplateExercise[];
          program_name?: string | null;
        };
      };
      workouts: {
        Row: {
          id: string;
          user_id: string;
          template_id: string | null;
          name: string;
          started_at: string;
          completed_at: string | null;
          notes: string | null;
          duration_seconds: number | null;
        };
        Insert: {
          user_id: string;
          template_id?: string | null;
          name: string;
          started_at?: string;
          notes?: string | null;
        };
        Update: {
          name?: string;
          completed_at?: string | null;
          notes?: string | null;
          duration_seconds?: number | null;
        };
      };
      workout_sets: {
        Row: {
          id: string;
          workout_id: string;
          exercise_id: string;
          set_number: number;
          reps: number;
          weight: number;
          rpe: number | null;
          is_warmup: boolean;
          created_at: string;
        };
        Insert: {
          workout_id: string;
          exercise_id: string;
          set_number: number;
          reps: number;
          weight: number;
          rpe?: number | null;
          is_warmup?: boolean;
        };
        Update: {
          set_number?: number;
          reps?: number;
          weight?: number;
          rpe?: number | null;
          is_warmup?: boolean;
        };
      };
      personal_records: {
        Row: {
          id: string;
          user_id: string;
          exercise_id: string;
          record_type: 'max_weight' | 'max_reps' | 'max_volume';
          value: number;
          achieved_at: string;
          workout_id: string | null;
        };
        Insert: {
          user_id: string;
          exercise_id: string;
          record_type: 'max_weight' | 'max_reps' | 'max_volume';
          value: number;
          achieved_at?: string;
          workout_id?: string | null;
        };
        Update: {
          value?: number;
          achieved_at?: string;
        };
      };
      friendships: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: 'pending' | 'accepted' | 'declined' | 'blocked';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          requester_id: string;
          addressee_id: string;
          status?: 'pending' | 'accepted' | 'declined' | 'blocked';
        };
        Update: {
          status?: 'pending' | 'accepted' | 'declined' | 'blocked';
          updated_at?: string;
        };
      };
      workout_reactions: {
        Row: {
          id: string;
          workout_id: string;
          user_id: string;
          emoji: '💪' | '🔥' | '👏';
          created_at: string;
        };
        Insert: {
          workout_id: string;
          user_id: string;
          emoji: '💪' | '🔥' | '👏';
        };
        Update: Record<string, never>;
      };
      body_measurements: {
        Row: {
          id: string;
          user_id: string;
          weight: number;
          body_fat_pct: number | null;
          date: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          weight: number;
          body_fat_pct?: number | null;
          date?: string;
          notes?: string | null;
        };
        Update: {
          weight?: number;
          body_fat_pct?: number | null;
          date?: string;
          notes?: string | null;
        };
      };
      challenges: {
        Row: {
          id: string;
          creator_id: string;
          title: string;
          description: string | null;
          challenge_type: 'streak' | 'workout_count' | 'volume';
          target_value: number;
          start_date: string;
          end_date: string;
          created_at: string;
        };
        Insert: {
          creator_id: string;
          title: string;
          description?: string | null;
          challenge_type: 'streak' | 'workout_count' | 'volume';
          target_value: number;
          start_date: string;
          end_date: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          target_value?: number;
          end_date?: string;
        };
      };
      challenge_participants: {
        Row: {
          id: string;
          challenge_id: string;
          user_id: string;
          progress: number;
          joined_at: string;
        };
        Insert: {
          challenge_id: string;
          user_id: string;
          progress?: number;
        };
        Update: {
          progress?: number;
        };
      };
    };
  };
};

export type TemplateExercise = {
  exercise_id: string;
  exercise_name: string;
  target_sets: number;
  target_reps: string; // e.g. "8-12"
  notes?: string;
  order: number;
};

export type Exercise = Database['public']['Tables']['exercises']['Row'];
export type Workout = Database['public']['Tables']['workouts']['Row'];
export type WorkoutSet = Database['public']['Tables']['workout_sets']['Row'];
export type WorkoutTemplate = Database['public']['Tables']['workout_templates']['Row'];
export type PersonalRecord = Database['public']['Tables']['personal_records']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Friendship = Database['public']['Tables']['friendships']['Row'];
export type WorkoutReaction = Database['public']['Tables']['workout_reactions']['Row'];
export type BodyMeasurement = Database['public']['Tables']['body_measurements']['Row'];
export type Challenge = Database['public']['Tables']['challenges']['Row'];
export type ChallengeParticipant = Database['public']['Tables']['challenge_participants']['Row'];
