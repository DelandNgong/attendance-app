// Login screen — email/password sign-in.
// Accounts are created manually (by the captain, in person, at training —
// see the Firebase Console Authentication tab) rather than via open
// self-signup, so this page only handles signing IN, not signing up.

import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../services/firebase-config.js";

export function renderLogin(container) {
  container.innerHTML = `
    <div class="screen login-screen">
      <h1>Team Attendance</h1>
      <form id="login-form">
        <label for="email">Email</label>
        <input type="email" id="email" required autocomplete="username" />

        <label for="password">Password</label>
        <input type="password" id="password" required autocomplete="current-password" />

        <button type="submit">Sign In</button>
        <p id="login-error" class="error-text"></p>
      </form>
    </div>
  `;

  const form = container.querySelector("#login-form");
  const errorEl = container.querySelector("#login-error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";
    const email = container.querySelector("#email").value.trim();
    const password = container.querySelector("#password").value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Nothing else to do here — main.js listens for auth state changes
      // and will automatically route to the right screen once this resolves.
    } catch (err) {
      errorEl.textContent = "Sign-in failed. Check your email and password.";
      console.error(err);
    }
  });
}
