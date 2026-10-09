/* Gorisont-inspired orientation scoring from career-orientation-test.design.json */
(function () {
  let designCache = null;

  async function loadDesign() {
    if (designCache) return designCache;
    const res = await fetch("career-orientation-test.design.json");
    designCache = await res.json();
    return designCache;
  }

  function scoreAnswers(design, answers) {
    const dims = {};
    const clusters = {};
    design.careerClusters.forEach((c) => {
      clusters[c.id] = 0;
    });

    design.questions.forEach((q) => {
      const ans = answers[q.id];
      if (ans == null) return;

      if (q.format === "likert5") {
        const v = Number(ans);
        const contrib = (v - 1) * 1; // 0..4
        Object.entries(q.weights || {}).forEach(([dim, w]) => {
          dims[dim] = (dims[dim] || 0) + contrib * w;
        });
      } else if (q.format === "forced4") {
        const opt = (q.options || []).find((o) => o.id === ans || o.k === ans);
        if (!opt) return;
        Object.entries(opt.weights || {}).forEach(([dim, w]) => {
          dims[dim] = (dims[dim] || 0) + Number(w);
        });
        Object.entries(opt.clusterBoost || {}).forEach(([cid, w]) => {
          clusters[cid] = (clusters[cid] || 0) + Number(w);
        });
      } else if (q.format === "pick2of4") {
        const picks = Array.isArray(ans) ? ans : [ans];
        picks.forEach((pid) => {
          const opt = (q.options || []).find((o) => o.id === pid || o.k === pid);
          if (!opt) return;
          Object.entries(opt.weights || {}).forEach(([dim, w]) => {
            dims[dim] = (dims[dim] || 0) + Number(w);
          });
          Object.entries(opt.clusterBoost || {}).forEach(([cid, w]) => {
            clusters[cid] = (clusters[cid] || 0) + Number(w);
          });
        });
      }
    });

    // Normalize dims roughly to 0–100 for affinity
    const dimScores = {};
    Object.entries(dims).forEach(([k, v]) => {
      dimScores[k] = Math.max(0, Math.min(100, (v / 16) * 100));
    });

    const matrix = design.scoring?.affinityMatrix?.matrix || {};
    const strength = design.scoring?.affinityMatrix?.affinityStrength || 12;
    Object.entries(matrix).forEach(([dim, map]) => {
      const ds = dimScores[dim] || 0;
      Object.entries(map).forEach(([cid, w]) => {
        clusters[cid] = (clusters[cid] || 0) + (ds / 100) * w * strength;
      });
    });

    const ranked = Object.entries(clusters)
      .map(([id, score]) => ({ id, score }))
      .sort((a, b) => b.score - a.score);

    return { dims: dimScores, clusters, ranked };
  }

  function narrative(topClusters, lang) {
    const labels = topClusters.map((c) => {
      const p = window.BRIDGE_PROFESSIONS[c.id];
      return p ? window.BRIDGE_I18N.loc(p.label) : c.id;
    });
    const pack = {
      ru: `Твой профиль ближе к: ${labels.join(", ")}. Ниже — профессии и вузы Китая под эти направления.`,
      en: `Your profile leans toward: ${labels.join(", ")}. Below — professions and China universities for these tracks.`,
      tg: `Профили ту наздиктар ба: ${labels.join(", ")}. Дар поён — касбҳо ва донишгоҳҳои Чин барои ин самтҳо.`,
    };
    return pack[lang] || pack.ru;
  }

  function recommendUnis(topClusterIds) {
    const unis = window.BRIDGE_UNIS || [];
    const tagScore = {};
    topClusterIds.forEach((cid, idx) => {
      const weight = 3 - idx;
      const tags = window.BRIDGE_PROFESSIONS[cid]?.uniTags || [];
      tags.forEach((t) => {
        tagScore[t] = (tagScore[t] || 0) + weight;
      });
    });

    return unis
      .map((u) => {
        let score = 0;
        const blob = [
          ...(u.majors || []),
          ...(u.englishPrograms || []),
          u.tier,
          window.BRIDGE_I18N.loc(u.blurb),
        ]
          .join(" ")
          .toLowerCase();
        Object.entries(tagScore).forEach(([tag, w]) => {
          if (blob.includes(tag) || (u._tags && u._tags.includes(tag))) score += w * 2;
          // heuristic keywords
          const map = {
            business: ["business", "management", "bba", "trade"],
            trade: ["trade", "export", "international"],
            media: ["communication", "media", "journalism", "gcm"],
            tech: ["computer", "software", "ai", "data", "it"],
            eng: ["engineering", "civil", "mechanical", "electrical", "construction"],
            creative: ["design", "creative", "art"],
            marketing: ["marketing", "brand"],
            communication: ["communication", "language", "diplomacy"],
            leadership: ["management", "mba", "leadership"],
          };
          (map[tag] || [tag]).forEach((kw) => {
            if (blob.includes(kw)) score += w;
          });
        });
        if (u.tier === "budget" && tagScore.budget) score += 2;
        return { u, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((x) => x.u.id);
  }

  function buildResult(design, answers) {
    const scored = scoreAnswers(design, answers);
    const top3 = scored.ranked.slice(0, 3);
    const lang = window.BRIDGE_I18N?.lang || "ru";
    const professions = [];
    top3.forEach((c) => {
      const pack = window.BRIDGE_PROFESSIONS[c.id];
      if (!pack) return;
      pack.professions.slice(0, 5).forEach((p) => {
        professions.push({
          cluster: c.id,
          clusterLabel: window.BRIDGE_I18N.loc(pack.label),
          name: window.BRIDGE_I18N.loc(p),
        });
      });
    });

    const uniIds = recommendUnis(top3.map((c) => c.id));

    return {
      at: new Date().toISOString(),
      dims: scored.dims,
      rankedClusters: scored.ranked.slice(0, 5).map((c) => ({
        id: c.id,
        score: Math.round(c.score * 10) / 10,
        label: window.BRIDGE_I18N.loc(window.BRIDGE_PROFESSIONS[c.id]?.label) || c.id,
      })),
      professions,
      uniIds,
      summary: narrative(top3, lang),
      answers,
    };
  }

  window.BRIDGE_TEST = { loadDesign, scoreAnswers, buildResult };
})();
