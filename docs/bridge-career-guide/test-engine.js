/* Gorisont-inspired orientation scoring + university matching model */
(function () {
  let designCache = null;

  async function loadDesign() {
    if (designCache) return designCache;
    const res = await fetch("career-orientation-test.design.json");
    if (!res.ok) throw new Error("design_load_failed");
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
        const contrib = v - 1;
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

    // comboHints (lightweight)
    const valueRank = Object.entries(dimScores)
      .filter(([k]) => k.startsWith("val_"))
      .sort((a, b) => b[1] - a[1]);
    const motRank = Object.entries(dimScores)
      .filter(([k]) => k.startsWith("mot_"))
      .sort((a, b) => b[1] - a[1]);
    const discRank = ["dominance", "influence", "steadiness", "compliance"]
      .map((k) => [k, dimScores[k] || 0])
      .sort((a, b) => b[1] - a[1]);
    (design.scoring?.comboHints || []).forEach((hint) => {
      const when = hint.when || {};
      let ok = true;
      if (when.valuesTop && valueRank[0]?.[0] !== when.valuesTop) ok = false;
      if (when.motivationTop && motRank[0]?.[0] !== when.motivationTop) ok = false;
      if (when.discTop && discRank[0]?.[0] !== when.discTop) ok = false;
      if (ok) {
        Object.entries(hint.boost || {}).forEach(([cid, w]) => {
          clusters[cid] = (clusters[cid] || 0) + Number(w);
        });
      }
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
      ru: `Твой профиль ближе к: ${labels.join(", ")}. Ниже — профессии и вузы Китая, подобранные по результатам теста.`,
      en: `Your profile leans toward: ${labels.join(", ")}. Below — careers and China universities matched to your test.`,
      tg: `Профили ту наздиктар ба: ${labels.join(", ")}. Дар поён — касбҳо ва донишгоҳҳои Чин аз рӯи натиҷаи тест.`,
    };
    return pack[lang] || pack.ru;
  }

  /** Match model: cluster overlap + program keywords + tier diversity */
  function recommendUnis(topClusterIds, dims) {
    const unis = window.BRIDGE_UNIS || [];
    const clusterWeight = {};
    topClusterIds.forEach((cid, idx) => {
      clusterWeight[cid] = 5 - idx; // 5,4,3...
    });

    const keywordMap = {
      business: ["business", "management", "bba", "trade", "marketing", "e-commerce", "gcm", "economics"],
      finance: ["finance", "economics", "trade", "accounting"],
      media: ["communication", "media", "journalism", "gcm", "brand"],
      design: ["design", "architecture", "creative", "art"],
      it: ["computer", "software", "ai", "data", "it", "digital"],
      engineering: ["engineering", "civil", "mechanical", "electrical", "automation", "construction", "aerospace"],
      medicine: ["medicine", "mbbs", "health", "pharma"],
      law: ["law", "legal"],
      education: ["education", "teaching", "language"],
      hospitality: ["tourism", "hospitality", "hotel"],
      logistics: ["logistics", "supply", "transport"],
      international_relations: ["international", "diplomacy", "language", "relations", "gcm"],
    };

    const budgetLean = (dims?.mot_extrinsic || 0) < 40 && (dims?.val_security || 0) > 55;

    const scored = unis.map((u) => {
      let score = 0;
      const reasons = [];
      (u.clusters || []).forEach((cid) => {
        if (clusterWeight[cid]) {
          score += clusterWeight[cid] * 4;
          reasons.push(cid);
        }
      });
      const blob = [
        ...(u.majors || []),
        ...(u.englishPrograms || []),
        window.BRIDGE_I18N?.loc?.(u.blurb) || "",
      ]
        .join(" ")
        .toLowerCase();

      Object.entries(clusterWeight).forEach(([cid, w]) => {
        const tags = window.BRIDGE_PROFESSIONS[cid]?.uniTags || [];
        tags.forEach((tag) => {
          (keywordMap[cid] || keywordMap[tag] || [tag]).forEach((kw) => {
            if (blob.includes(kw)) score += w;
          });
        });
        (keywordMap[cid] || []).forEach((kw) => {
          if (blob.includes(kw)) score += w * 0.8;
        });
      });

      if (budgetLean && u.tier === "budget") {
        score += 3;
        reasons.push("budget");
      }
      if (!budgetLean && u.tier === "dream") score += 1;

      // Always give a small base so list is never empty for odd profiles
      score += 0.1;
      return { u, score, reasons };
    });

    scored.sort((a, b) => b.score - a.score);

    // Diversify tiers: take top, ensure at least one budget/real if available
    const picked = [];
    const usedTiers = new Set();
    for (const row of scored) {
      if (picked.length >= 6) break;
      picked.push(row);
      usedTiers.add(row.u.tier);
    }
    ["budget", "real"].forEach((tier) => {
      if (picked.length >= 6) return;
      if (![...picked].some((p) => p.u.tier === tier)) {
        const extra = scored.find((s) => s.u.tier === tier && !picked.includes(s));
        if (extra) {
          picked.pop();
          picked.push(extra);
        }
      }
    });

    return {
      uniIds: picked.slice(0, 6).map((p) => p.u.id),
      matchMeta: picked.slice(0, 6).map((p) => ({
        id: p.u.id,
        score: Math.round(p.score * 10) / 10,
        reasons: p.reasons.slice(0, 3),
      })),
    };
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

    const match = recommendUnis(
      top3.map((c) => c.id),
      scored.dims
    );

    return {
      at: new Date().toISOString(),
      dims: scored.dims,
      rankedClusters: scored.ranked.slice(0, 5).map((c) => ({
        id: c.id,
        score: Math.round(c.score * 10) / 10,
        label: window.BRIDGE_I18N.loc(window.BRIDGE_PROFESSIONS[c.id]?.label) || c.id,
      })),
      professions,
      uniIds: match.uniIds,
      matchMeta: match.matchMeta,
      summary: narrative(top3, lang),
      answers,
    };
  }

  window.BRIDGE_TEST = { loadDesign, scoreAnswers, buildResult, recommendUnis };
})();
