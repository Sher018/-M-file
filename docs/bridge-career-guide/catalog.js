(function () {
  let bundle = null;
  const idx = { uni: {}, prog: {}, sch: {}, doc: {}, city: {}, dead: {} };

  function index(b) {
    const put = (map, list) => (list || []).forEach((x) => { map[x.id] = x; });
    put(idx.uni, b.universities);
    put(idx.prog, b.programs);
    put(idx.sch, b.scholarships);
    put(idx.doc, b.documents);
    put(idx.city, b.cities);
    put(idx.dead, b.deadlines);
  }

  window.BRIDGE_CATALOG = {
    async load() {
      if (bundle) return bundle;
      const res = await fetch("catalog.bundle.json", { cache: "no-store" });
      if (!res.ok) throw new Error("catalog_load_failed");
      bundle = await res.json();
      index(bundle);
      window.BRIDGE_UNIS = (bundle.universities || []).map((u) => {
        const progs = (u.program_ids || []).map((id) => idx.prog[id]).filter(Boolean);
        return {
          ...u,
          clusters: u.cluster_ids || [],
          tier: u.match_tier || u.tier,
          majors: progs.map((p) => p.name?.en || p.id),
          englishPrograms: progs.map((p) => p.name?.en || p.id),
          tuitionYear: progs.reduce((m, p) => {
            if (p.tuition_year == null) return m;
            return m == null ? p.tuition_year : Math.min(m, p.tuition_year);
          }, null),
        };
      });
      return bundle;
    },
    data() {
      return bundle;
    },
    uni: (id) => idx.uni[id],
    program: (id) => idx.prog[id],
    scholarship: (id) => idx.sch[id],
    document: (id) => idx.doc[id],
    city: (id) => idx.city[id],
    deadline: (id) => idx.dead[id],
    programsOf(uni) {
      return (uni?.program_ids || []).map((id) => idx.prog[id]).filter(Boolean);
    },
    minTuition(uni, degree) {
      const list = this.programsOf(uni).filter((p) => !degree || p.degree === degree);
      const nums = list.map((p) => p.tuition_year).filter((n) => n != null);
      return nums.length ? Math.min(...nums) : null;
    },
    counts() {
      return {
        unis: bundle?.universities?.length || 0,
        programs: bundle?.programs?.length || 0,
        scholarships: bundle?.scholarships?.length || 0,
        docs: bundle?.documents?.length || 0,
      };
    },
    filter(q) {
      const unis = bundle.universities || [];
      const text = (q.q || "").trim().toLowerCase();
      const degrees = q.degree ? q.degree.split(",").filter(Boolean) : [];
      const langs = q.lang ? q.lang.split(",").filter(Boolean) : [];
      const discs = q.disc ? q.disc.split(",").filter(Boolean) : [];
      const tiers = q.tier ? q.tier.split(",").filter(Boolean) : [];
      const intake = q.intake || "";
      const city = q.city || "";
      const priceMaxUsd = q.price_max ? Number(q.price_max) : null;
      const usd = window.BRIDGE_FX.USD_PER_CNY || 0.14;
      const clusters = (window.BRIDGE_AUTH.currentUser()?.result?.rankedClusters || []).slice(0, 3).map((c) => c.id);

      return unis.filter((u) => {
        const progs = this.programsOf(u);
        const matched = progs.filter((p) => {
          if (degrees.length && !degrees.includes(p.degree)) return false;
          if (langs.length && !langs.includes(p.language)) return false;
          if (discs.length && !discs.includes(p.discipline)) return false;
          if (intake && p.intake !== intake) return false;
          if (q.no_hsk === "1" && p.requirements?.hsk != null) return false;
          if (priceMaxUsd != null && p.tuition_year != null && p.tuition_year * usd > priceMaxUsd) return false;
          return true;
        });
        if (!matched.length) return false;
        if (city && u.city_id !== city) return false;
        if (tiers.length && !tiers.includes(u.tier)) return false;
        if (q.sch === "1" && !(u.scholarship_ids || []).length && !matched.some((p) => (p.scholarship_ids || []).length))
          return false;
        if (q.fits_test === "1") {
          if (!clusters.length) return false;
          if (!(u.cluster_ids || []).some((c) => clusters.includes(c))) return false;
        }
        if (text) {
          const cityName = this.city(u.city_id);
          const blob = [
            u.name?.ru, u.name?.en, u.name?.tg, u.short,
            cityName?.name?.ru, cityName?.name?.en,
            ...matched.map((p) => p.name?.en),
          ]
            .join(" ")
            .toLowerCase();
          if (!blob.includes(text)) return false;
        }
        u._matchedPrograms = matched;
        u._price = this.minTuition(u, degrees[0]);
        return true;
      });
    },
  };
})();
