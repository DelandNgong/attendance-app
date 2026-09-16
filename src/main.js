import './style.css';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './services/firebase-config.js';
import { getUserProfile } from './services/user-service.js';
import { doc, getDoc } from 'firebase/firestore';
import { renderLogin } from './pages/login.js';
import { renderCheckin } from './pages/checkin.js';
import { renderAdmin } from './pages/admin.js';

const app = document.querySelector('#app');

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    renderLogin(app);
    return;
  }

  try {
    const profile = await getUserProfile(user.uid);
    const teamSnap = await getDoc(doc(db, 'teams', profile.teamId));
    const team = teamSnap.exists() ? teamSnap.data() : null;

    if (!team) {
      app.innerHTML = `<p class="error-text">No team found for your account. Contact your captain.</p>`;
      return;
    }

    // Captains and coaches are players too — they get the admin dashboard,
    // which now includes their own check-in and history, not just team management.
    if (profile.role === 'captain' || profile.role === 'coach') {
      renderAdmin(app, { user, profile, team });
    } else {
      renderCheckin(app, { user, profile, team });
    }
  } catch (err) {
    app.innerHTML = `<p class="error-text">${err.message}</p>`;
    console.error(err);
  }
});
