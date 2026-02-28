-- ============================================
-- Social Features Schema
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Friendships table
create table if not exists public.friendships (
  id uuid default gen_random_uuid() primary key,
  requester_id uuid references auth.users on delete cascade not null,
  addressee_id uuid references auth.users on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'blocked')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint unique_friendship unique (requester_id, addressee_id),
  constraint no_self_friend check (requester_id != addressee_id)
);

-- Workout Reactions table
create table if not exists public.workout_reactions (
  id uuid default gen_random_uuid() primary key,
  workout_id uuid references public.workouts on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  emoji text not null check (emoji in ('💪', '🔥', '👏')),
  created_at timestamptz default now() not null,
  constraint unique_reaction unique (workout_id, user_id, emoji)
);

-- Indexes
create index if not exists idx_friendships_requester on public.friendships(requester_id);
create index if not exists idx_friendships_addressee on public.friendships(addressee_id);
create index if not exists idx_friendships_status on public.friendships(status);
create index if not exists idx_reactions_workout on public.workout_reactions(workout_id);
create index if not exists idx_reactions_user on public.workout_reactions(user_id);

-- ============================================
-- Row Level Security
-- ============================================

alter table public.friendships enable row level security;
alter table public.workout_reactions enable row level security;

-- Friendships: users can see friendships they are part of
create policy "Users can view own friendships"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Friendships: users can send friend requests (as requester)
create policy "Users can send friend requests"
  on public.friendships for insert
  with check (auth.uid() = requester_id);

-- Friendships: users can update friendships they are involved in (accept/decline/block)
create policy "Users can update own friendships"
  on public.friendships for update
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Friendships: users can delete friendships they are part of (unfriend)
create policy "Users can delete own friendships"
  on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Reactions: users can see reactions on workouts visible to them
create policy "Users can view reactions"
  on public.workout_reactions for select
  using (true);

-- Reactions: users can add their own reactions
create policy "Users can add reactions"
  on public.workout_reactions for insert
  with check (auth.uid() = user_id);

-- Reactions: users can remove their own reactions
create policy "Users can remove reactions"
  on public.workout_reactions for delete
  using (auth.uid() = user_id);

-- ============================================
-- Allow friends to read each other's profiles
-- ============================================
create policy "Friends can view profiles"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1 from public.friendships
      where status = 'accepted'
      and (
        (requester_id = auth.uid() and addressee_id = id)
        or (addressee_id = auth.uid() and requester_id = id)
      )
    )
  );

-- ============================================
-- Allow friends to read each other's completed workouts
-- ============================================
create policy "Friends can view completed workouts"
  on public.workouts for select
  using (
    auth.uid() = user_id
    or (
      completed_at is not null
      and exists (
        select 1 from public.friendships
        where status = 'accepted'
        and (
          (requester_id = auth.uid() and addressee_id = user_id)
          or (addressee_id = auth.uid() and requester_id = user_id)
        )
      )
    )
  );

-- ============================================
-- Allow friends to read each other's personal records
-- ============================================
create policy "Friends can view personal records"
  on public.personal_records for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.friendships
      where status = 'accepted'
      and (
        (requester_id = auth.uid() and addressee_id = user_id)
        or (addressee_id = auth.uid() and requester_id = user_id)
      )
    )
  );

-- ============================================
-- Allow friends to read each other's workout sets (for feed details)
-- ============================================
create policy "Friends can view workout sets"
  on public.workout_sets for select
  using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_id
      and (
        w.user_id = auth.uid()
        or (
          w.completed_at is not null
          and exists (
            select 1 from public.friendships
            where status = 'accepted'
            and (
              (requester_id = auth.uid() and addressee_id = w.user_id)
              or (addressee_id = auth.uid() and requester_id = w.user_id)
            )
          )
        )
      )
    )
  );

-- ============================================
-- Allow users to search profiles by email (for friend search)
-- We need a function for this since email is in auth.users
-- ============================================
create or replace function public.search_user_by_email(search_email text)
returns table (id uuid, display_name text, avatar_url text) as $$
begin
  return query
  select p.id, p.display_name, p.avatar_url
  from auth.users u
  join public.profiles p on p.id = u.id
  where u.email = lower(search_email)
  and u.id != auth.uid();
end;
$$ language plpgsql security definer;
