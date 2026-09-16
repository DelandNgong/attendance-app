// Firestore read/write logic for attendance.
//
// Data model:
//   users/{uid}                    — { name, email, role: 'member'|'captain'|'coach', teamId }
//   teams/{teamId}                 — { name, venueLat, venueLng, geofenceRadiusMeters }
//   teams/{teamId}/meta/chainHead  — { lastHash }
//   sessions/{sessionId}           — { teamId, token, createdBy, createdAt, expiresAt }
//   attendance_records/{recordId}  — { teamId, sessionId, userId, timestamp, latitude,
//                                       longitude, withinGeofence, prevHash, recordHash }
//   verifications/{verificationId} — { recordId, teamId, verifiedBy, verifiedAt, note }
//                                     (captain's spot-check — additive, never edits the
//                                     original record)

import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  addDoc,
  Timestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase-config.js";
import { computeRecordHash, GENESIS_HASH } from "../utils/hash-chain.js";

/** Creates a new training session with a rotating QR token. */
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

  return { sessionId: sessionRef.id, token, expiresAt };
}

/** Looks up a session by ID and checks it's still valid (exists, not expired). */
export async function getValidSession(sessionId) {
  const snap = await getDoc(doc(db, "sessions", sessionId));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (data.expiresAt.toMillis() < Date.now()) return null;
  return { id: snap.id, ...data };
}

/**
 * Records attendance for a user, chaining the new record onto the team's
 * hash chain. Runs as a transaction so simultaneous check-ins can't corrupt
 * the chain.
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
    });

    transaction.set(chainHeadRef, { lastHash: recordHash, updatedAt: serverTimestamp() });
  });

  return recordRef.id;
}

/** All attendance records for a team, chronological — spot-check view + export. */
export async function getTeamAttendance(teamId) {
  const q = query(
    collection(db, "attendance_records"),
    where("teamId", "==", teamId),
    orderBy("timestampMillis", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Attendance records for one specific session — used for the live roster view. */
export async function getSessionAttendance(sessionId) {
  const q = query(collection(db, "attendance_records"), where("sessionId", "==", sessionId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Records a captain's roster spot-check for a given attendance record.
 * Does NOT modify the original record — writes a separate, linked entry.
 */
export async function addVerification({ recordId, teamId, verifiedByUid, note = "" }) {
  await addDoc(collection(db, "verifications"), {
    recordId,
    teamId,
    verifiedBy: verifiedByUid,
    verifiedAt: serverTimestamp(),
    note,
  });
}

/** A single user's own recent check-ins — used for the "my attendance" view. */
export async function getUserAttendance(userId, count = 10) {
  const q = query(
    collection(db, "attendance_records"),
    where("userId", "==", userId),
    orderBy("timestampMillis", "desc"),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** All verifications for a team — used to cross-reference against records. */
export async function getTeamVerifications(teamId) {
  const q = query(collection(db, "verifications"), where("teamId", "==", teamId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
