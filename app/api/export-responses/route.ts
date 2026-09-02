import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminSecret = process.env.EXPORT_ADMIN_SECRET;

if (!url || !serviceKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}
if (!adminSecret) {
  console.warn('EXPORT_ADMIN_SECRET is not set; export API will be inaccessible without secret');
}

const MAX_LIMIT = 5000;

export async function GET(req: Request) {
  try {
    const secret = req.headers.get('x-admin-secret');
    if (!secret || secret !== adminSecret) {
      return new Response('Forbidden', { status: 403 });
    }

    const u = new URL(req.url);
    const attraction_id = u.searchParams.get('attraction_id');
    const from = u.searchParams.get('from');
    const to = u.searchParams.get('to');
    const limitParam = parseInt(u.searchParams.get('limit') || '1000', 10);
    const limit = Math.min(isNaN(limitParam) ? 1000 : limitParam, MAX_LIMIT);

    const supabaseAdmin = createClient(url, serviceKey, {
      auth: { persistSession: false }
    });

    let query = supabaseAdmin
      .from('responses')
      .select('id,attraction_id,ratings,is_excluded,created_at,attractions(name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (attraction_id) query = query.eq('attraction_id', attraction_id);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data, error } = await query;
    if (error) {
      console.error('export-responses error:', error);
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

    // prepend UTF-8 BOM to help Excel recognize UTF-8
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');

    const filename = `responses_export_${new Date().toISOString().replace(/[:.]/g,'-')}.csv`;

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (e) {
    console.error('export-responses unexpected error', e);
    return new Response('Internal Server Error', { status: 500 });
  }
}
