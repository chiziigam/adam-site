// Read-only report. Token needs Account > Workers KV Storage > Read.
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
const namespace = process.env.CLOUDFLARE_KV_NAMESPACE_ID || '64397b5896994ccb97a68448bf5782db';
const days = Number(process.argv[2] || 7);
if (!account || !token || !Number.isInteger(days) || days < 1 || days > 90) {
  console.error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN, then run npm run funnel -- 7 (1–90 days).');
  process.exit(1);
}
const first = new Date(); first.setUTCDate(first.getUTCDate() - days + 1);
const since = first.toISOString().slice(0, 10);
let cursor = '', records = [];
do {
  const query = new URLSearchParams({ prefix: 'a:', limit: '1000' });
  if (cursor) query.set('cursor', cursor);
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/storage/kv/namespaces/${encodeURIComponent(namespace)}/keys?${query}`, { headers: { Authorization: `Bearer ${token}` } });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error('Could not read funnel events. Check the account, namespace and token permissions.');
  records.push(...result.result.filter(key => key.name.slice(2, 12) >= since).map(key => key.metadata).filter(Boolean));
  cursor = result.result_info?.cursor || '';
} while (cursor);
const count = event => records.filter(record => record.event === event).length;
const views = count('page_view'), signups = count('signup_success');
console.log(`Adam funnel · ${since} to today (UTC, current day is partial)`);
console.table(['page_view', 'waitlist_view', 'waitlist_start', 'cta_click', 'signup_success', 'signup_error'].map(event => ({ event, count: count(event) })));
console.log(`New signups / page views: ${views ? (100 * signups / views).toFixed(1) + '%' : 'no page views yet'}`);
for (const field of ['source', 'device', 'placement', 'campaign']) {
  const groups = new Map();
  for (const record of records) {
    const key = record[field] || '(none)';
    if (!groups.has(key)) groups.set(key, { [field]: key, page_views: 0, form_views: 0, starts: 0, new_signups: 0, errors: 0 });
    const column = { page_view: 'page_views', waitlist_view: 'form_views', waitlist_start: 'starts', signup_success: 'new_signups', signup_error: 'errors' }[record.event];
    if (column) groups.get(key)[column]++;
  }
  console.table([...groups.values()]);
}
console.log('Counts are page events, not unique people. DNT/GPC browsers, blocked requests and bots affect totals. Existing-email submissions do not count as new signups. KV writes are eventually consistent.');
