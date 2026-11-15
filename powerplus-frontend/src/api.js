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
  getHealth: () => request('/health/db'),
  ask: (question) => {
    // Abort after 90s so the spinner can never hang forever (Render's proxy
    // kills the request around 100s anyway).
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 90000)
    return fetch(`${BASE_URL}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
      signal: controller.signal,
    }).then(async res => {
      clearTimeout(timer)
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        let msg = body
        try { msg = JSON.parse(body).detail ?? body } catch { /* keep raw text */ }
        throw new Error(msg)
      }
      return res.json()
    }).catch(e => {
      clearTimeout(timer)
      if (e.name === 'AbortError') throw new Error('Request timed out — the model took too long to answer. Please try again.')
      throw e
    })
  },
};
