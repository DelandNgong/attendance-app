// Check-in screen: scan the session QR code, run the geofence check, then
// write an attendance record. This is the member-facing screen.

import { Html5Qrcode } from "html5-qrcode";
import { getValidSession, recordAttendance } from "../services/attendance-service.js";
import { getCurrentPosition, isWithinGeofence } from "../utils/geofence.js";
import { renderMyHistory } from "../components/my-history.js";

export function renderCheckin(container, { user, profile, team }) {
  container.innerHTML = `
    <div class="screen checkin-screen">
      <h1>Check In</h1>
      <p class="subtitle">Scan the QR code your captain shows at training</p>
      <div id="qr-reader"></div>
      <p id="status-text"></p>

      <section>
        <h2>My Recent Check-ins</h2>
        <div id="my-history"></div>
      </section>
    </div>
  `;

  renderMyHistory(container.querySelector("#my-history"), user.uid);

  const statusEl = container.querySelector("#status-text");
  const scanner = new Html5Qrcode("qr-reader");

  const setStatus = (msg, isError = false) => {
    statusEl.textContent = msg;
    statusEl.className = isError ? "error-text" : "status-text";
  };

  scanner
    .start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      async (decodedText) => {
        // Stop scanning immediately once we get a hit — avoids duplicate
        // triggers while we process this one.
        await scanner.stop();
        await handleScan(decodedText);
      },
      () => {} // per-frame scan failures are normal (no QR in view yet) — ignore
    )
    .catch((err) => {
      setStatus("Couldn't access the camera. Check permissions and reload.", true);
      console.error(err);
    });

  async function handleScan(sessionId) {
    try {
      setStatus("Verifying session...");
      const session = await getValidSession(sessionId);
      if (!session) {
        setStatus("This QR code has expired. Ask your captain for a new one.", true);
        return;
      }

      setStatus("Checking your location...");
      const { latitude, longitude } = await getCurrentPosition();
      const { withinGeofence, distanceMeters } = isWithinGeofence(
        latitude,
        longitude,
        team.venueLat,
        team.venueLng,
        team.geofenceRadiusMeters
      );

      if (!withinGeofence) {
        setStatus(
          `You appear to be ${Math.round(distanceMeters)}m from the venue — too far to check in.`,
          true
        );
        return;
      }

      setStatus("Recording attendance...");
      await recordAttendance({
        teamId: profile.teamId,
        sessionId,
        userId: user.uid,
        latitude,
        longitude,
        withinGeofence,
        distanceMeters,
      });

      setStatus("✓ Checked in successfully. See you on the mat!");
      renderMyHistory(container.querySelector("#my-history"), user.uid);
    } catch (err) {
      setStatus("Something went wrong. Try again or tell your captain.", true);
      console.error(err);
    }
  }
}
