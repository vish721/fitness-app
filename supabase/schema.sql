-- ============================================
-- FitForge Database Schema
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Exercises table
create table if not exists public.exercises (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  muscle_group text not null,
  secondary_muscles text[] default '{}',
  equipment text default 'Bodyweight',
  instructions text,
  source_url text,
  created_at timestamptz default now() not null
);

-- Workout Templates table
create table if not exists public.workout_templates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  description text,
  exercises jsonb default '[]'::jsonb not null,
  program_name text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Workouts table
create table if not exists public.workouts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  template_id uuid references public.workout_templates on delete set null,
  name text not null,
  started_at timestamptz default now() not null,
  completed_at timestamptz,
  notes text,
  duration_seconds integer
);

-- Workout Sets table
create table if not exists public.workout_sets (
  id uuid default gen_random_uuid() primary key,
  workout_id uuid references public.workouts on delete cascade not null,
  exercise_id uuid references public.exercises on delete cascade not null,
  set_number integer not null,
  reps integer not null,
  weight numeric not null default 0,
  rpe integer check (rpe between 1 and 10),
  is_warmup boolean default false,
  created_at timestamptz default now() not null
);

-- Personal Records table
create table if not exists public.personal_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  exercise_id uuid references public.exercises on delete cascade not null,
  record_type text not null check (record_type in ('max_weight', 'max_reps', 'max_volume')),
  value numeric not null,
  achieved_at timestamptz default now() not null,
  workout_id uuid references public.workouts on delete set null
);

-- Indexes
create index if not exists idx_exercises_user on public.exercises(user_id);
create index if not exists idx_workouts_user on public.workouts(user_id);
create index if not exists idx_workouts_started on public.workouts(started_at desc);
create index if not exists idx_workout_sets_workout on public.workout_sets(workout_id);
create index if not exists idx_workout_sets_exercise on public.workout_sets(exercise_id);
create index if not exists idx_personal_records_user on public.personal_records(user_id);
create index if not exists idx_personal_records_exercise on public.personal_records(exercise_id);
create index if not exists idx_templates_user on public.workout_templates(user_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_templates enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;
alter table public.personal_records enable row level security;

-- Profiles: users can only read/update their own profile
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Exercises: users can CRUD their own exercises
create policy "Users can view own exercises" on public.exercises for select using (auth.uid() = user_id);
create policy "Users can insert own exercises" on public.exercises for insert with check (auth.uid() = user_id);
create policy "Users can update own exercises" on public.exercises for update using (auth.uid() = user_id);
create policy "Users can delete own exercises" on public.exercises for delete using (auth.uid() = user_id);

-- Templates: users can CRUD their own templates
create policy "Users can view own templates" on public.workout_templates for select using (auth.uid() = user_id);
create policy "Users can insert own templates" on public.workout_templates for insert with check (auth.uid() = user_id);
create policy "Users can update own templates" on public.workout_templates for update using (auth.uid() = user_id);
create policy "Users can delete own templates" on public.workout_templates for delete using (auth.uid() = user_id);

-- Workouts: users can CRUD their own workouts
create policy "Users can view own workouts" on public.workouts for select using (auth.uid() = user_id);
create policy "Users can insert own workouts" on public.workouts for insert with check (auth.uid() = user_id);
create policy "Users can update own workouts" on public.workouts for update using (auth.uid() = user_id);
create policy "Users can delete own workouts" on public.workouts for delete using (auth.uid() = user_id);

-- Workout Sets: users can CRUD sets for workouts they own
create policy "Users can view own workout sets" on public.workout_sets for select
  using (exists (select 1 from public.workouts where id = workout_id and user_id = auth.uid()));
create policy "Users can insert own workout sets" on public.workout_sets for insert
  with check (exists (select 1 from public.workouts where id = workout_id and user_id = auth.uid()));
create policy "Users can update own workout sets" on public.workout_sets for update
  using (exists (select 1 from public.workouts where id = workout_id and user_id = auth.uid()));
create policy "Users can delete own workout sets" on public.workout_sets for delete
  using (exists (select 1 from public.workouts where id = workout_id and user_id = auth.uid()));

-- Personal Records: users can CRUD their own records
create policy "Users can view own records" on public.personal_records for select using (auth.uid() = user_id);
create policy "Users can insert own records" on public.personal_records for insert with check (auth.uid() = user_id);
create policy "Users can update own records" on public.personal_records for update using (auth.uid() = user_id);
create policy "Users can delete own records" on public.personal_records for delete using (auth.uid() = user_id);

-- ============================================
-- Auto-create profile on signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for auto-creating profiles
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
