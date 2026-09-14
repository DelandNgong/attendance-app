# Taekwondo Attendance System

A secure, tamper-evident attendance tracker built for the USIU-Africa Taekwondo team —
replacing manual attendance with a check-in system that's hard to fake and easy for the
coach to review at the end of the semester.

Built as a personal project (Fall semester), with plans to expand it into the
Information Systems Project capstone the following spring.

## Why this exists

Manual attendance is easy to fake — someone can claim they were there without showing up.
This system layers a few checks together instead of relying on just one:

1. **Rotating session QR code** — a new, time-limited code each training session
2. **GPS geofence check** — confirms the device is actually at the training venue
3. **Captain spot-check** — a manual roster review that catches anything the automated
   checks miss
4. **Tamper-evident log** — each attendance record stores a hash of the previous record,
   so a silent edit to past data breaks the chain and becomes detectable

## Tech stack

- **Frontend:** Vite + vanilla JavaScript (web app — works on any phone's browser,
  Android and iOS, installable to the home screen)
- **Backend:** Firebase (Authentication + Firestore) — no server to maintain
- **QR scanning:** [html5-qrcode](https://github.com/mebjas/html5-qrcode)
- **Geolocation:** browser's built-in Geolocation API

A separate native Android version (Kotlin) is being built in parallel for the Mobile
Application Development course, sharing the same Firebase backend.

## Project structure

```
src/
  main.js                    — entry point
  services/
    firebase-config.js       — Firebase connection (config added in setup step)
    attendance-service.js    — reads/writes to Firestore
  utils/
    hash-chain.js            — tamper-evident logging logic
    geofence.js              — GPS distance check
  pages/
    checkin.js                — check-in screen (team members)
    admin.js                  — admin screen (captain/coach)
```

## Getting started

```bash
# install dependencies
npm install

# run the dev server
npm run dev
```

## Roadmap

- [x] Project scaffold + repo setup
- [ ] Firebase project setup (Auth + Firestore + security rules)
- [ ] Data model implementation
- [ ] Check-in flow (QR scan + geofence)
- [ ] Hash-chained attendance log
- [ ] Admin panel (QR generation, roster spot-check)
- [ ] CSV export for coach
- [ ] Deploy to Firebase Hosting
- [ ] Native Android version (course deliverable)
- [ ] Spring: expand into multi-team / campus-wide platform (Information Systems Project)

## Author

Ngong Deland Ngong — USIU-Africa, Information Systems Technology
