/* Email OTP auth gate — prefers Worker /api/otp/* (Resend), falls back to local demo. */
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
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return String(1000 + (a[0] % 9000));
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

      const payload = {
        email: clean,
        name: name || users[clean]?.name || "",
        country: country || users[clean]?.country || "TJ",
        mode,
        consents: consents || null,
        lang: window.BRIDGE_I18N?.lang || "ru",
      };

      // Prefer server OTP (real email)
      let allowDemoFallback = false;
      try {
        const res = await fetch("/api/otp/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) throw new Error("rate_limited");
        if (res.ok && data.ok) {
          const pending = {
            email: clean,
            name: payload.name,
            country: payload.country,
            mode,
            consents: payload.consents,
            expires: Date.now() + (data.expiresIn || 600) * 1000,
            demo: !!data.demo,
            server: true,
            token: data.token || null,
            code: data.demo ? data.code : null,
          };
          saveJSON(OTP_KEY, pending);
          return pending;
        }
        // API exists but email not configured → demo; other errors → show to user
        if (res.status === 503 || data.error === "email_not_configured" || res.status === 404) {
          allowDemoFallback = true;
        } else {
          throw new Error(data.error === "send_failed" ? "send_failed" : data.error || "send_failed");
        }
      } catch (e) {
        if (
          e.message === "rate_limited" ||
          e.message === "send_failed" ||
          e.message === "bad_email" ||
          e.message === "exists" ||
          e.message === "not_found" ||
          e.message === "consents"
        ) {
          throw e;
        }
        // network / pure static host → demo
        allowDemoFallback = true;
      }

      if (!allowDemoFallback) throw new Error("send_failed");

      // Local demo fallback (static host / API missing only)
      const code = genCode();
      const pending = {
        email: clean,
        name: payload.name,
        country: payload.country,
        mode,
        consents: payload.consents,
        code,
        expires: Date.now() + 10 * 60 * 1000,
        demo: true,
        server: false,
      };
      saveJSON(OTP_KEY, pending);
      return pending;
    },
    async verifyOtp(code) {
      const pending = loadJSON(OTP_KEY, null);
      if (!pending) throw new Error("no_pending");
      if (Date.now() > pending.expires) {
        localStorage.removeItem(OTP_KEY);
        throw new Error("expired");
      }
      const typed = String(code).trim();

      if (pending.server && pending.token && !pending.demo) {
        const res = await fetch("/api/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: pending.email, code: typed, token: pending.token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          throw new Error(data.error === "expired" ? "expired" : "bad_code");
        }
      } else if (pending.server && pending.token && pending.demo) {
        // Demo with token: still verify via API when possible
        try {
          const res = await fetch("/api/otp/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: pending.email, code: typed, token: pending.token }),
          });
          if (res.ok) {
            /* ok */
          } else if (typed !== String(pending.code)) {
            throw new Error("bad_code");
          }
        } catch (e) {
          if (e.message === "bad_code" || e.message === "expired") throw e;
          if (typed !== String(pending.code)) throw new Error("bad_code");
        }
      } else if (typed !== String(pending.code)) {
        throw new Error("bad_code");
      }

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
