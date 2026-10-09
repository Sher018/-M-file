/* Email OTP auth gate (demo-local + optional /api/send-otp worker). */
(function () {
  const USERS_KEY = "bridge-users-v2";
  const SESSION_KEY = "bridge-session-v2";
  const OTP_KEY = "bridge-otp-pending";

  function loadJSON(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }
  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function genCode() {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  const Auth = {
    getUsers() {
      return loadJSON(USERS_KEY, {});
    },
    saveUsers(u) {
      saveJSON(USERS_KEY, u);
    },
    getSession() {
      return loadJSON(SESSION_KEY, null);
    },
    setSession(user) {
      if (!user) localStorage.removeItem(SESSION_KEY);
      else saveJSON(SESSION_KEY, { email: user.email, name: user.name });
      window.dispatchEvent(new CustomEvent("bridge:auth"));
    },
    currentUser() {
      const s = this.getSession();
      if (!s) return null;
      return this.getUsers()[s.email] || null;
    },
    isAuthed() {
      return !!this.currentUser();
    },
    logout(clearAll) {
      if (clearAll) {
        localStorage.removeItem(USERS_KEY);
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(OTP_KEY);
        Object.keys(localStorage)
          .filter((k) => k.startsWith("bridge-check-") || k.startsWith("bridge-result-"))
          .forEach((k) => localStorage.removeItem(k));
      } else {
        this.setSession(null);
      }
      window.dispatchEvent(new CustomEvent("bridge:auth"));
    },
    async requestOtp({ email, name, country, mode, consents }) {
      const clean = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
        throw new Error("bad_email");
      }
      const users = this.getUsers();
      if (mode === "register") {
        if (users[clean]) throw new Error("exists");
        if (!consents?.pd || !consents?.age || !consents?.terms) throw new Error("consents");
      } else if (!users[clean]) {
        throw new Error("not_found");
      }

      const code = genCode();
      const pending = {
        email: clean,
        name: name || users[clean]?.name || "",
        country: country || users[clean]?.country || "TJ",
        mode,
        consents: consents || null,
        code,
        expires: Date.now() + 10 * 60 * 1000,
        demo: true,
      };

      // Try server endpoint; fall back to demo display
      try {
        const res = await fetch("/api/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: clean, code, lang: window.BRIDGE_I18N?.lang || "ru" }),
        });
        if (res.ok) pending.demo = false;
      } catch {
        /* offline / static host */
      }

      saveJSON(OTP_KEY, pending);
      return pending;
    },
    verifyOtp(code) {
      const pending = loadJSON(OTP_KEY, null);
      if (!pending) throw new Error("no_pending");
      if (Date.now() > pending.expires) {
        localStorage.removeItem(OTP_KEY);
        throw new Error("expired");
      }
      if (String(code).trim() !== String(pending.code)) throw new Error("bad_code");

      const users = this.getUsers();
      let user = users[pending.email];
      if (pending.mode === "register" || !user) {
        user = {
          email: pending.email,
          name: pending.name || pending.email.split("@")[0],
          country: pending.country || "TJ",
          createdAt: new Date().toISOString(),
          consents: {
            ...(pending.consents || { pd: true, age: true, terms: true }),
            at: new Date().toISOString(),
          },
          result: user?.result || null,
        };
      }
      users[pending.email] = user;
      this.saveUsers(users);
      localStorage.removeItem(OTP_KEY);
      this.setSession(user);
      return user;
    },
    peekPending() {
      return loadJSON(OTP_KEY, null);
    },
    saveUserResult(result) {
      const user = this.currentUser();
      if (!user) return;
      const users = this.getUsers();
      users[user.email].result = result;
      this.saveUsers(users);
    },
  };

  window.BRIDGE_AUTH = Auth;
})();
