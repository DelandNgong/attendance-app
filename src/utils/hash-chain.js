// Hash-chaining logic for tamper-evident attendance records.
// Each record will store a hash of the previous record's contents, so any
// silent edit to a past entry breaks the chain and becomes detectable —
// the same core idea behind chain-of-custody in digital forensics.
//
// Built out in the "shared backend" session.

export {};
