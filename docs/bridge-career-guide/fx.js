window.BRIDGE_FX = {
  updated: "2026-10-09",
  USD_PER_CNY: 0.14,
  stale: true,
  format(cny) {
    const n = Number(cny);
    if (!Number.isFinite(n)) return { cny: null, usd: null, label: "—" };
    const usd = n * this.USD_PER_CNY;
    const loc = window.BRIDGE_I18N?.lang === "en" ? "en-GB" : "ru-RU";
    return {
      cny: Math.round(n),
      usd: Math.round(usd),
      label: `¥${Math.round(n).toLocaleString(loc)} · ≈ $${Math.round(usd).toLocaleString("en-US")}`,
    };
  },
  async refresh() {
    try {
      const res = await fetch("/api/fx", { cache: "no-store" });
      const data = await res.json();
      if (data?.usd) {
        this.USD_PER_CNY = Number(data.usd);
        this.updated = data.updated_at || this.updated;
        this.stale = !!data.stale;
      }
    } catch {
      /* fallback stays */
    }
  },
};
