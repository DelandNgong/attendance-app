// Firestore read/write logic for attendance.
//
// Data model:
//   users/{uid}                    — { name, email, role: 'member'|'captain'|'coach', teamId }
//   teams/{teamId}                 — { name, venueLat, venueLng, geofenceRadiusMeters }
//   teams/{teamId}/meta/chainHead  — { lastHash }  (tracks the end of the hash chain)
//   sessions/{sessionId}           — { teamId, token, createdBy, createdAt, expiresAt }
//   attendance_records/{recordId}  — { teamId, sessionId, userId, timestamp, latitude,
//                                       longitude, withinGeofence, prevHash, recordHash,
//                                       verifiedByCaptain }

import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase-config.js";
import { computeRecordHash, GENESIS_HASH } from "../utils/hash-chain.js";

/**
 * Creates a new training session with a rotating QR token, valid for a
 * limited window (default 15 minutes) so it can't be shared and used later
 * from somewhere else.
 */
export async function createSession({ teamId, createdByUid, validForMinutes = 15 }) {
  const sessionRef = doc(collection(db, "sessions"));
  const token = crypto.randomUUID();
  const expiresAt = Timestamp.fromMillis(Date.now() + validForMinutes * 60 * 1000);

  await setDoc(sessionRef, {
    teamId,
    token,
    createdBy: createdByUid,
    createdAt: serverTimestamp(),
    expiresAt,
  });

  return { sessionId: sessionRef.id, token };
}

/**
 * Records attendance for a user, chaining the new record onto the team's
 * existing hash chain. Runs as a Firestore transaction so two simultaneous
 * check-ins can't both read the same "previous hash" and corrupt the chain —
 * the transaction guarantees they're serialized.
 */
export async function recordAttendance({
  teamId,
  sessionId,
  userId,
  latitude,
  longitude,
  withinGeofence,
  distanceMeters,
}) {
  const chainHeadRef = doc(db, "teams", teamId, "meta", "chainHead");
  const recordRef = doc(collection(db, "attendance_records"));

  await runTransaction(db, async (transaction) => {
    const chainHeadSnap = await transaction.get(chainHeadRef);
    const prevHash = chainHeadSnap.exists() ? chainHeadSnap.data().lastHash : GENESIS_HASH;

    const timestampMillis = Date.now();
    const recordHash = await computeRecordHash({
      prevHash,
      userId,
      sessionId,
      timestampMillis,
      withinGeofence,
    });

    transaction.set(recordRef, {
      teamId,
      sessionId,
      userId,
      timestampMillis,
      timestamp: serverTimestamp(),
      latitude,
      longitude,
      distanceMeters,
      withinGeofence,
      prevHash,
      recordHash,
      verifiedByCaptain: false,
    });

    transaction.set(chainHeadRef, { lastHash: recordHash, updatedAt: serverTimestamp() });
  });

  return recordRef.id;
}

/**
 * Fetches every attendance record for a team, in chronological order —
 * used for the captain's spot-check view and the semester CSV export.
 */
export async function getTeamAttendance(teamId) {
  const q = query(
    collection(db, "attendance_records"),
    where("teamId", "==", teamId),
    orderBy("timestampMillis", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
