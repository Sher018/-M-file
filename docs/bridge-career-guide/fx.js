/* Exchange rates for display (update periodically). Base: CNY */
window.BRIDGE_FX = {
  updated: "2026-10-09",
  USD_PER_CNY: 0.14,
  TJS_PER_CNY: 1.55,
  format(cny) {
    const n = Number(cny) || 0;
    const usd = n * this.USD_PER_CNY;
    const tjs = n * this.TJS_PER_CNY;
    return {
      cny: Math.round(n),
      usd: Math.round(usd),
      tjs: Math.round(tjs),
      label: `${Math.round(n).toLocaleString("ru-RU")} CNY · $${Math.round(usd).toLocaleString("en-US")} · ${Math.round(tjs).toLocaleString("ru-RU")} TJS`,
    };
  },
};
