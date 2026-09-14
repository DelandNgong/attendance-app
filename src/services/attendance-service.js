// Firestore read/write logic for attendance records lives here.
// Built out in the "shared backend" session — this includes:
//   - creating a new session + rotating QR token
//   - writing an attendance record (append-only, hash-linked to the previous entry)
//   - reading a team's attendance history for export
//
// Keeping this logic separate from the UI (pages/) means the same functions
// can eventually be reused or referenced when porting the core flow to the
// native Android app.

export {};
