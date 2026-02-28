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
        };
        Update: {
          name?: string;
          muscle_group?: string;
          secondary_muscles?: string[];
          equipment?: string;
          instructions?: string | null;
          source_url?: string | null;
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
