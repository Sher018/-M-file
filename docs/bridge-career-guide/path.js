(function () {
  const KEY = "bridge-path-v1";
  const LIMIT = 10;

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "null") || empty();
    } catch {
      return empty();
    }
  }
  function empty() {
    const user = window.BRIDGE_AUTH?.currentUser?.();
    return {
      version: 1,
      country: user?.country || "TJ",
      degree: "bachelor",
      intake_year: new Date().getMonth() > 5 ? new Date().getFullYear() + 1 : new Date().getFullYear(),
      unis: [],
      tasks: [],
      updated_at: new Date().toISOString(),
    };
  }
  function save(p) {
    p.updated_at = new Date().toISOString();
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      window.BRIDGE_APP?.toast?.("save_failed");
    }
    return p;
  }

  window.BRIDGE_PATH = {
    LIMIT,
    get: load,
    save,
    hasUni(id) {
      return load().unis.some((x) => x.uni_id === id);
    },
    addUni(id, scholarshipIds) {
      const p = load();
      if (p.unis.some((x) => x.uni_id === id)) return p;
      if (p.unis.length >= LIMIT) return { ...p, _limit: true };
      p.unis.push({
        uni_id: id,
        added_at: new Date().toISOString(),
        program_id: null,
        scholarship_ids: scholarshipIds || [],
      });
      return save(p);
    },
    removeUni(id) {
      const p = load();
      p.unis = p.unis.filter((x) => x.uni_id !== id);
      p.tasks = p.tasks.filter((t) => !t.key.startsWith(`uni:${id}`));
      return save(p);
    },
    toggleSch(uniId, schId) {
      let p = load();
      if (!p.unis.some((x) => x.uni_id === uniId)) p = this.addUni(uniId, [schId]);
      const row = p.unis.find((x) => x.uni_id === uniId);
      if (!row) return p;
      const set = new Set(row.scholarship_ids || []);
      if (set.has(schId)) set.delete(schId);
      else set.add(schId);
      row.scholarship_ids = [...set];
      return save(p);
    },
    taskDone(key) {
      const p = load();
      return p.tasks.find((t) => t.key === key && t.done_at);
    },
    toggleTask(key) {
      const p = load();
      const hit = p.tasks.find((t) => t.key === key);
      if (hit && hit.done_at) hit.done_at = null;
      else if (hit) hit.done_at = new Date().toISOString();
      else p.tasks.push({ key, done_at: new Date().toISOString() });
      return save(p);
    },
    documents(path) {
      const C = window.BRIDGE_CATALOG;
      const ids = new Set();
      const owners = {};
      (path.unis || []).forEach((row) => {
        const u = C.uni(row.uni_id);
        (u?.document_ids || []).forEach((id) => {
          ids.add(id);
          (owners[id] ||= []).push(u.short || u.id);
        });
        (row.scholarship_ids || []).forEach((sid) => {
          const s = C.scholarship(sid);
          (s?.requirements || []).forEach((r) => {
            if (r.document_id) {
              ids.add(r.document_id);
              (owners[r.document_id] ||= []).push(s.name?.ru || sid);
            }
          });
        });
      });
      return [...ids].map((id) => ({ id, doc: C.document(id), owners: owners[id] || [] })).filter((x) => x.doc);
    },
    progress(path) {
      const docs = this.documents(path);
      const applies = (path.unis || []).map((u) => `uni:${u.uni_id}:apply`);
      const keys = [...docs.map((d) => `doc:${d.id}`), ...applies];
      if (!keys.length) return 0;
      const done = keys.filter((k) => this.taskDone(k)).length;
      return Math.round((done / keys.length) * 100);
    },
  };
})();
