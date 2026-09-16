// Captain/coach screen: generate the rotating session QR code, do the
// manual roster spot-check (as a separate verification entry, never
// touching the original record), and export the semester CSV report.

import QRCode from "qrcode";
import {
  createSession,
  getSessionAttendance,
  getTeamAttendance,
  addVerification,
  recordAttendance,
} from "../services/attendance-service.js";
import { getTeamMembers, upsertMember } from "../services/user-service.js";
import { exportAttendanceToCSV } from "../utils/csv-export.js";
import { getCurrentPosition, isWithinGeofence } from "../utils/geofence.js";
import { renderMyHistory } from "../components/my-history.js";

export function renderAdmin(container, { user, profile, team }) {
  const teamId = profile.teamId;
  let currentSession = null;

  container.innerHTML = `
    <div class="screen admin-screen">
      <h1>Captain Dashboard</h1>

      <section>
        <button id="new-session-btn">Start New Session</button>
        <div id="qr-display"></div>
        <p id="session-status"></p>
        <button id="self-checkin-btn" disabled>I'm training too — Check Myself In</button>
        <p id="self-checkin-status"></p>
      </section>

      <section>
        <div class="section-header">
          <h2>Checked In</h2>
          <button id="refresh-btn" disabled>Refresh</button>
        </div>
        <ul id="roster-list"></ul>
      </section>

      <section>
        <button id="export-btn">Export Semester CSV</button>
      </section>

      <section>
        <h2>My Recent Check-ins</h2>
        <div id="my-history"></div>
      </section>

      <section>
        <h2>Add / Update Member</h2>
        <p class="subtitle">
          The member's Auth account must already exist (create it in Firebase Console →
          Authentication first, then paste their UID here).
        </p>
        <form id="member-form">
          <label for="m-uid">User UID</label>
          <input type="text" id="m-uid" required />

          <label for="m-name">Name</label>
          <input type="text" id="m-name" required />

          <label for="m-email">Email</label>
          <input type="email" id="m-email" required />

          <label for="m-role">Role</label>
          <select id="m-role">
            <option value="member">Member</option>
            <option value="captain">Captain</option>
            <option value="coach">Coach</option>
          </select>

          <label for="m-schoolid">School ID</label>
          <input type="text" id="m-schoolid" />

          <label for="m-idnumber">National ID / Passport Number</label>
          <input type="text" id="m-idnumber" />

          <label for="m-height">Height (cm)</label>
          <input type="number" id="m-height" />

          <label for="m-weight">Weight (kg)</label>
          <input type="number" id="m-weight" />

          <label for="m-dob">Date of Birth</label>
          <input type="date" id="m-dob" />

          <button type="submit">Save Member</button>
          <p id="member-status"></p>
        </form>
      </section>
    </div>
  `;

  renderMyHistory(container.querySelector("#my-history"), user.uid);

  const qrDisplay = container.querySelector("#qr-display");
  const sessionStatus = container.querySelector("#session-status");
  const refreshBtn = container.querySelector("#refresh-btn");
  const rosterList = container.querySelector("#roster-list");
  const selfCheckinBtn = container.querySelector("#self-checkin-btn");
  const selfCheckinStatus = container.querySelector("#self-checkin-status");

  container.querySelector("#new-session-btn").addEventListener("click", async () => {
    sessionStatus.textContent = "Creating session...";
    try {
      currentSession = await createSession({ teamId, createdByUid: user.uid });

      qrDisplay.innerHTML = `<canvas id="qr-canvas"></canvas>`;
      const canvas = container.querySelector("#qr-canvas");
      // The QR encodes the session ID — that's what checkin.js scans and
      // looks up to validate the session.
      await QRCode.toCanvas(canvas, currentSession.sessionId, { width: 240 });

      sessionStatus.textContent = `Session active — expires ${currentSession.expiresAt
        .toDate()
        .toLocaleTimeString()}`;
      refreshBtn.disabled = false;
      selfCheckinBtn.disabled = false;
      selfCheckinStatus.textContent = "";
      rosterList.innerHTML = "";
    } catch (err) {
      sessionStatus.textContent = "Couldn't create session — check console.";
      console.error(err);
    }
  });

  selfCheckinBtn.addEventListener("click", async () => {
    if (!currentSession || !team) return;
    selfCheckinStatus.textContent = "Checking your location...";
    try {
      const { latitude, longitude } = await getCurrentPosition();
      const { withinGeofence, distanceMeters } = isWithinGeofence(
        latitude,
        longitude,
        team.venueLat,
        team.venueLng,
        team.geofenceRadiusMeters
      );

      if (!withinGeofence) {
        selfCheckinStatus.textContent = `You appear to be ${Math.round(
          distanceMeters
        )}m from the venue — too far to check in.`;
        return;
      }

      await recordAttendance({
        teamId,
        sessionId: currentSession.sessionId,
        userId: user.uid,
        latitude,
        longitude,
        withinGeofence,
        distanceMeters,
      });

      selfCheckinStatus.textContent = "✓ You're checked in too.";
      renderMyHistory(container.querySelector("#my-history"), user.uid);
    } catch (err) {
      selfCheckinStatus.textContent = "Something went wrong. Try again.";
      console.error(err);
    }
  });

  refreshBtn.addEventListener("click", async () => {
    if (!currentSession) return;
    const records = await getSessionAttendance(currentSession.sessionId);
    const members = await getTeamMembers(teamId);
    const nameById = Object.fromEntries(members.map((m) => [m.id, m.name || m.email]));

    rosterList.innerHTML = records
      .map(
        (r) => `
        <li>
          ${nameById[r.userId] || r.userId}
          — ${r.withinGeofence ? "✓ on-site" : "⚠ off-site"}
          <button class="verify-btn" data-record-id="${r.id}">Verify</button>
        </li>
      `
      )
      .join("");

    rosterList.querySelectorAll(".verify-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await addVerification({
          recordId: btn.dataset.recordId,
          teamId,
          verifiedByUid: user.uid,
        });
        btn.textContent = "Verified ✓";
        btn.disabled = true;
      });
    });
  });

  container.querySelector("#export-btn").addEventListener("click", async () => {
    const [records, members] = await Promise.all([
      getTeamAttendance(teamId),
      getTeamMembers(teamId),
    ]);
    exportAttendanceToCSV(records, members);
  });

  const memberForm = container.querySelector("#member-form");
  const memberStatus = container.querySelector("#member-status");

  memberForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    memberStatus.textContent = "Saving...";
    try {
      await upsertMember({
        uid: container.querySelector("#m-uid").value.trim(),
        teamId,
        name: container.querySelector("#m-name").value.trim(),
        email: container.querySelector("#m-email").value.trim(),
        role: container.querySelector("#m-role").value,
        schoolId: container.querySelector("#m-schoolid").value.trim(),
        idNumber: container.querySelector("#m-idnumber").value.trim(),
        heightCm: Number(container.querySelector("#m-height").value) || null,
        weightKg: Number(container.querySelector("#m-weight").value) || null,
        dob: container.querySelector("#m-dob").value,
      });
      memberStatus.textContent = "✓ Member saved.";
      memberForm.reset();
    } catch (err) {
      memberStatus.textContent = "Couldn't save — check console.";
      console.error(err);
    }
  });
}
