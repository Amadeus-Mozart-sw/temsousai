import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !anonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

const supabaseAdmin = createClient(url, anonKey);

export async function GET(req: Request) {
  const u = new URL(req.url);
  const attraction_id = u.searchParams.get('attraction_id');
  const from = u.searchParams.get('from');
  const to = u.searchParams.get('to');
  const limit = parseInt(u.searchParams.get('limit') || '1000', 10);

  let query = supabaseAdmin.from('responses').select('id,attraction_id,ratings,is_excluded,created_at,attractions(name)').order('created_at', { ascending: false }).limit(limit);
  if (attraction_id) query = query.eq('attraction_id', attraction_id);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  const { data, error } = await query;
  if (error) {
    return new Response('Error fetching data', { status: 500 });
  }

  // build CSV header
  const headers = ['id','attraction_id','attraction_name','is_excluded','created_at','ratings'];
  const rows = (data || []).map((r: any) => {
    return [
      r.id,
      r.attraction_id,
      r.attractions?.name ?? '',
      r.is_excluded ? '1' : '0',
      r.created_at,
      JSON.stringify(r.ratings)
    ].map((c: any) => `"${String(c || '').replace(/"/g, '""')}"`).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="responses_export.csv"`
    }
  });
}
