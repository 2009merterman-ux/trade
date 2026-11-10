/* Left Field answer matching: normalises what was typed, then forgives typos. */
(function (root) {
  function norm(s) {
    return String(s).toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, " and ")
      .replace(/['’`.]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/^(the|a|an) /, "");
  }
  function key(s) { return norm(s).replace(/ /g, ""); }
  /* Rough sound-alike form, used only to break ties between equally close answers. */
  function sound(k) {
    return k.replace(/ph/g, "f").replace(/[cq]/g, "k").replace(/z/g, "s").replace(/y/g, "i").replace(/(.)\1+/g, "$1");
  }

  /* Damerau-Levenshtein (adjacent swaps count as one), with an early exit above max. */
  function distance(a, b, max) {
    var al = a.length, bl = b.length;
    if (Math.abs(al - bl) > max) return max + 1;
    var prev2 = null, prev = [], cur, i, j;
    for (j = 0; j <= bl; j++) prev[j] = j;
    for (i = 1; i <= al; i++) {
      cur = [i];
      var best = cur[0];
      for (j = 1; j <= bl; j++) {
        var cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        var v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
        cur[j] = v;
        if (v < best) best = v;
      }
      if (best > max) return max + 1;
      prev2 = prev; prev = cur;
    }
    return prev[bl];
  }

  /* How many slips we forgive for a target of this length. */
  function allowance(len) {
    if (len <= 2) return 0;
    if (len <= 5) return 1;
    if (len <= 7) return 2;
    return 3;
  }

  /* Turn a raw category into {answers:[{name, tier, keys}], index:{key -> answer}}. */
  function compile(cat) {
    var answers = [], index = Object.create(null);
    cat.t.forEach(function (list, tier) {
      list.split(",").forEach(function (entry) {
        var forms = entry.split("|").map(function (s) { return s.trim(); }).filter(Boolean);
        if (!forms.length) return;
        var keys = [];
        forms.forEach(function (f) { var k = key(f); if (k && !index[k] && keys.indexOf(k) < 0) keys.push(k); });
        if (!keys.length || index[keys[0]]) return;
        var ans = { name: forms[0], tier: tier, keys: keys };
        keys.forEach(function (k) { index[k] = ans; });
        answers.push(ans);
      });
    });
    return { answers: answers, index: index };
  }

  /* Find the accepted answer for what was typed. `allowed` optionally limits the answers in play.
     Returns {answer, how: "exact" | "typo"} or null. */
  function find(input, compiled, allowed) {
    var k = key(input);
    if (!k) return null;
    function ok(a) { return a && (!allowed || allowed.indexOf(a) >= 0); }
    var tries = [k, k + "s"];
    if (k.length > 3 && /ies$/.test(k)) tries.push(k.slice(0, -3) + "y");
    if (k.length > 3 && /es$/.test(k)) tries.push(k.slice(0, -2));
    if (k.length > 2 && /s$/.test(k)) tries.push(k.slice(0, -1));
    for (var i = 0; i < tries.length; i++) {
      if (ok(compiled.index[tries[i]])) return { answer: compiled.index[tries[i]], how: "exact" };
    }
    var best = null, bestScore = Infinity;
    var pool = allowed || compiled.answers;
    pool.forEach(function (a) {
      a.keys.forEach(function (t) {
        var max = Math.min(allowance(t.length), allowance(k.length));
        var d = max ? distance(k, t, max) : 99;
        /* a long-enough start of the answer also counts: "hippopot" for hippopotamus */
        if (d > max && k.length >= 4 && k.length * 2 >= t.length && t.indexOf(k) === 0) d = max;
        if (d > max) return;
        var score = d * 10 + distance(sound(k), sound(t), 3) * 2 + (k[0] === t[0] ? 0 : 4) + a.tier * 0.1;
        if (score < bestScore) { bestScore = score; best = a; }
      });
    });
    if (best) return { answer: best, how: "typo" };
    /* "abe lincon" -> try the last word on its own */
    var words = norm(input).split(" ");
    var last = words[words.length - 1];
    if (words.length > 1 && last.length >= 5) return find(last, compiled, allowed);
    return null;
  }

  var api = { norm: norm, key: key, distance: distance, compile: compile, find: find };
  root.LF_match = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
