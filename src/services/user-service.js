// Fetches a signed-in user's profile document — this is where we find out
// their role ('member' | 'captain' | 'coach') and which team they belong to,
// used by main.js to decide which screen to show.

import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase-config.js";

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) {
    throw new Error(
      "No profile found for this account. Ask your captain to set up your user record in Firestore."
    );
  }
  return snap.data();
}

/** All members of a team — used by the admin screen for the roster spot-check. */
export async function getTeamMembers(teamId) {
  const q = query(collection(db, "users"), where("teamId", "==", teamId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Adds or updates a team member's profile. Writes to two separate documents:
 * `users` (basic, visible to any teammate) and `member_details` (sensitive,
 * restricted to the member themselves and captains/coaches — see
 * firestore.rules for why these are split).
 *
 * `uid` must already exist as a Firebase Auth account (created manually via
 * the console) — this function only writes the Firestore profile data.
 */
export async function upsertMember({
  uid,
  teamId,
  name,
  email,
  role = "member",
  schoolId = "",
  idNumber = "",
  heightCm = null,
  weightKg = null,
  dob = "",
}) {
  await setDoc(doc(db, "users", uid), { name, email, role, teamId }, { merge: true });
  await setDoc(
    doc(db, "member_details", uid),
    { teamId, schoolId, idNumber, heightCm, weightKg, dob },
    { merge: true }
  );
}

/** Fetches a member's sensitive details — only succeeds for the member themselves or a captain/coach. */
export async function getMemberDetails(uid) {
  const snap = await getDoc(doc(db, "member_details", uid));
  return snap.exists() ? snap.data() : null;
}
