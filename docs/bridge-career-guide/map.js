window.BRIDGE_MAP = {
  project(lng, lat, w, h) {
    return {
      x: ((lng - 73) / (135 - 73)) * w,
      y: ((53.5 - lat) / (53.5 - 18)) * h,
    };
  },
  render({ city, width = 320, height = 210 }) {
    const w = 620;
    const h = 400;
    const pt = city ? this.project(city.lng, city.lat, w, h) : null;
    return `
      <div class="map-box" style="max-width:${width}px">
        <svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${city ? (city.name?.en || city.id) : "China"}">
          <use href="assets/china-map.svg#cn"></use>
        </svg>
        <svg viewBox="0 0 ${w} ${h}" style="position:absolute;inset:12px;width:calc(100% - 24px);height:calc(100% - 24px);pointer-events:none">
        </svg>
      </div>`;
  },
  inline({ city, width = 320 }) {
    const w = 620;
    const h = 400;
    const land = document.getElementById("chinaLandTpl")?.innerHTML || "";
    const pt = city ? this.project(city.lng, city.lat, w, h) : null;
    return `
      <div class="map-box" style="position:relative;max-width:${width}px">
        <svg viewBox="0 0 ${w} ${h}" role="img">
          <path fill="#D1F2EB" stroke="#0B6E4F" stroke-width="2" d="${window.BRIDGE_MAP_PATH || ""}"/>
          ${
            pt
              ? `<circle class="map-pulse" cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="16"/>
                 <circle class="map-dot" cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="7"/>`
              : ""
          }
        </svg>
        ${city ? `<p class="muted" style="margin:8px 0 0">${window.BRIDGE_I18N.loc(city.name)}</p>` : ""}
      </div>`;
  },
};

window.BRIDGE_MAP_PATH = "M5.0,157.7 L20.0,185.9 L50.0,202.8 L70.0,259.2 L90.0,298.6 L150.0,293.0 L180.0,290.7 L240.0,332.4 L255.0,354.9 L280.0,360.6 L310.0,349.3 L350.0,360.6 L365.0,397.7 L375.0,377.5 L390.0,360.6 L405.0,354.9 L415.0,349.3 L440.0,338.0 L460.0,321.1 L485.0,326.8 L490.0,270.4 L480.0,247.9 L495.0,251.3 L488.0,231.0 L492.0,185.9 L495.0,157.7 L510.0,152.1 L525.0,149.9 L550.0,129.6 L580.0,95.8 L615.0,56.3 L570.0,56.3 L520.0,5.6 L480.0,5.6 L460.0,39.4 L440.0,45.1 L430.0,84.5 L390.0,95.8 L380.0,118.3 L320.0,129.6 L270.0,123.9 L180.0,95.8 L140.0,50.7 L70.0,95.8 L20.0,152.1 Z";
