-- Supabase schema for 天爽祭 voting app
-- Run in Supabase SQL editor (or psql). Assumes extensions available.

-- 1) Tables
create extension if not exists "pgcrypto";

-- attractions
create table if not exists attractions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  group_name text,
  room text,
  time_slot text,
  category text,
  department text,
  block text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- questions
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  description text,
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- responses
create table if not exists responses (
  id uuid primary key default gen_random_uuid(),
  attraction_id uuid not null references attractions(id) on delete cascade,
  ratings jsonb not null, -- e.g. {"question_uuid": 5, ...}
  is_excluded boolean default false,
  created_at timestamptz default now()
);

-- attraction_stats (pre-aggregated)
create table if not exists attraction_stats (
  attraction_id uuid primary key references attractions(id) on delete cascade,
  response_count bigint default 0 not null,
  total_score_sum numeric default 0 not null,
  average_score numeric default 0 not null,
  ratings_sum jsonb default '{}' not null,   -- {question_id: sum}
  ratings_count jsonb default '{}' not null, -- {question_id: count}
  updated_at timestamptz default now()
);

-- 2) Indexes
create index if not exists idx_responses_attraction_created on responses(attraction_id, created_at);
create index if not exists idx_responses_is_excluded on responses(is_excluded);
create index if not exists idx_attractions_department on attractions(department);
create index if not exists idx_attractions_block on attractions(block);

-- 3) Helper functions: add JSON numeric maps
create or replace function merge_add_jsonb_numeric(existing jsonb, additions jsonb)
returns jsonb language plpgsql as $$
declare
  k text;
  v jsonb;
  cur numeric;
begin
  if existing is null then
    existing := '{}'::jsonb;
  end if;
  if additions is null then
    return existing;
  end if;
  for k, v in select * from jsonb_each(additions)
  loop
    -- existing->>k might be null
    cur := coalesce((existing ->> k)::numeric, 0);
    existing := jsonb_set(existing, array[k], to_jsonb(cur + (v::text)::numeric), true);
  end loop;
  return existing;
end;
$$;

create or replace function jsonb_one_counts(r jsonb)
returns jsonb language plpgsql as $$
declare
  k text;
  v jsonb;
  res jsonb := '{}'::jsonb;
begin
  if r is null then return res; end if;
  for k, v in select * from jsonb_each(r)
  loop
    res := jsonb_set(res, array[k], '1'::jsonb, true);
  end loop;
  return res;
end;
$$;

-- 4) Trigger for INSERT: incorporate new response into attraction_stats (only if is_excluded = false)
create or replace function responses_stats_after_insert()
returns trigger language plpgsql as $$
declare
  new_sum numeric := 0;
  counts jsonb;
begin
  if new.is_excluded then
    -- excluded responses don't affect stats
    return new;
  end if;

  select coalesce(sum((value::text)::numeric),0) into new_sum
  from jsonb_each(new.ratings);

  counts := jsonb_one_counts(new.ratings);

  insert into attraction_stats(attraction_id, response_count, total_score_sum, average_score, ratings_sum, ratings_count, updated_at)
  values (
    new.attraction_id,
    1,
    new_sum,
    new_sum,  -- average when single response equals the sum (overall average semantics depend on definition)
    new.ratings,
    counts,
    now()
  )
  on conflict (attraction_id) do update
  set
    response_count = attraction_stats.response_count + 1,
    total_score_sum = attraction_stats.total_score_sum + excluded.total_score_sum,
    ratings_sum = merge_add_jsonb_numeric(attraction_stats.ratings_sum, excluded.ratings_sum),
    ratings_count = merge_add_jsonb_numeric(attraction_stats.ratings_count, excluded.ratings_count),
    average_score = (attraction_stats.total_score_sum + excluded.total_score_sum) / (attraction_stats.response_count + 1),
    updated_at = now()
  ;
  return new;
end;
$$;

-- 5) Trigger for UPDATE: handle is_excluded toggles and rating edits (simple approach: compute delta between old and new)
create or replace function responses_stats_after_update()
returns trigger language plpgsql as $$
declare
  old_sum numeric := 0;
  new_sum numeric := 0;
  delta_sum numeric := 0;
  delta_counts jsonb := '{}'::jsonb;
  delta_ratings jsonb := '{}'::jsonb;
  k text;
  v jsonb;
begin
  -- If neither ratings nor is_excluded changed, nothing to do
  if (old.ratings is not distinct from new.ratings) and (old.is_excluded is not distinct from new.is_excluded) then
    return new;
  end if;

  -- compute sums
  select coalesce(sum((value::text)::numeric),0) into old_sum from jsonb_each(old.ratings);
  select coalesce(sum((value::text)::numeric),0) into new_sum from jsonb_each(new.ratings);

  if old.is_excluded = false and new.is_excluded = true then
    -- subtract old
    delta_sum := - old_sum;
    for k, v in select * from jsonb_each(old.ratings)
    loop
      delta_ratings := jsonb_set(delta_ratings, array[k], to_jsonb(- (v::text)::numeric), true);
      delta_counts := jsonb_set(delta_counts, array[k], to_jsonb(-1), true);
    end loop;
  elsif old.is_excluded = true and new.is_excluded = false then
    -- add new
    delta_sum := new_sum;
    for k, v in select * from jsonb_each(new.ratings)
    loop
      delta_ratings := jsonb_set(delta_ratings, array[k], to_jsonb((v::text)::numeric), true);
      delta_counts := jsonb_set(delta_counts, array[k], to_jsonb(1), true);
    end loop;
  else
    -- ratings edited while both not excluded (or both excluded -> no effect)
    if old.is_excluded = false and new.is_excluded = false then
      delta_sum := new_sum - old_sum;
      -- compute per-question deltas
      for k, v in select * from jsonb_each(new.ratings)
      loop
        delta_ratings := jsonb_set(delta_ratings, array[k], to_jsonb((v::text)::numeric - coalesce((old.ratings ->> k)::numeric, 0)), true);
        -- count: if old had key and new has key, delta 0; if old missing and new present -> +1; if new missing and old present -> -1
        delta_counts := jsonb_set(delta_counts, array[k], to_jsonb( (case when (old.ratings ? k) then 0 else 1 end) ), true);
      end loop;
      -- also handle keys removed in new
      for k, v in select * from jsonb_each(old.ratings)
      where not (new.ratings ? key)
      loop
        delta_ratings := jsonb_set(delta_ratings, array[k], to_jsonb(- (v::text)::numeric), true);
        delta_counts := jsonb_set(delta_counts, array[k], to_jsonb(-1), true);
      end loop;
    else
      -- both excluded or other combos have no effect
      return new;
    end if;
  end if;

  -- apply delta to attraction_stats
  update attraction_stats
  set
    response_count = greatest(0, response_count + (case when delta_counts = '{}'::jsonb then (case when delta_sum <> 0 then (case when delta_sum > 0 then 1 when delta_sum < 0 then -1 else 0 end) else 0 end) else 0 end)),
    total_score_sum = total_score_sum + delta_sum,
    ratings_sum = merge_add_jsonb_numeric(ratings_sum, delta_ratings),
    ratings_count = merge_add_jsonb_numeric(ratings_count, delta_counts),
    average_score = case when response_count + 0 > 0 then (total_score_sum + delta_sum) / (response_count + 0) else 0 end,
    updated_at = now()
  where attraction_id = new.attraction_id;

  return new;
end;
$$;

-- 6) Attach triggers
drop trigger if exists trg_responses_after_insert on responses;
create trigger trg_responses_after_insert
after insert on responses
for each row execute function responses_stats_after_insert();

drop trigger if exists trg_responses_after_update on responses;
create trigger trg_responses_after_update
after update on responses
for each row execute function responses_stats_after_update();

-- End of schema
