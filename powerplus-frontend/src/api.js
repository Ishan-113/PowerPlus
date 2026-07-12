const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function request(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json();
}

export const api = {
  getLive: (group) => request(`/api/live${group ? `?group=${encodeURIComponent(group)}` : ''}`),
  getTags: () => request('/api/tags'),
  getHistory: (tagIds, start, end) =>
    request(`/api/history?tag_ids=${tagIds.join(',')}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`),
  getReport: (granularity, start, end, tagIds) =>
    request(
      `/api/report?granularity=${granularity}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}` +
      (tagIds && tagIds.length ? `&tag_ids=${tagIds.join(',')}` : '')
    ),
  getConsumption: (date) => request(`/api/consumption?date=${date}`),
  ask: (question) => fetch(`${BASE_URL}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  }).then(async res => {
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }),
};
