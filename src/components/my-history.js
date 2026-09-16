// Small shared piece of UI: a list of "my recent check-ins," used on both
// the member check-in screen and the captain dashboard (since captains are
// players too, and need to see their own history just like anyone else).

import { getUserAttendance } from "../services/attendance-service.js";

export async function renderMyHistory(container, userId) {
  const records = await getUserAttendance(userId, 10);

  if (records.length === 0) {
    container.innerHTML = `<p class="subtitle">No check-ins yet.</p>`;
    return;
  }

  container.innerHTML = `
    <ul class="history-list">
      ${records
        .map((r) => {
          const date = new Date(r.timestampMillis);
          return `<li>${date.toLocaleDateString()} — ${date.toLocaleTimeString()} ${
            r.withinGeofence ? "✓" : "⚠ off-site"
          }</li>`;
        })
        .join("")}
    </ul>
  `;
}
