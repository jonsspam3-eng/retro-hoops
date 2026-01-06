/* =========================================================
   File: hoops_patch.js
   Load this BEFORE the game script(s).

   <script src="hoops_patch.js"></script>
   <script src="hoops_hud_patch_v2.js"></script>
   <script src="html5game/RetroBowl.js"></script>

   What it does:
   - Intercepts loading of LanguageUS.txt & Achievements.txt via fetch/XHR
   - Applies Retro Bowl -> Retro Hoops + football->basketball wording swaps
   - Patches document title + DOM text nodes containing "Retro Bowl"
   ========================================================= */
(() => {
  "use strict";

  const BRAND_FROM_RE = /Retro\s*Bowl/gi;
  const BRAND_TO = "Retro Hoops";

  const FILE_MATCH_RE = /(LanguageUS\.txt|Achievements\.txt)$/i;

  const REPLACEMENTS = [
    [BRAND_FROM_RE, BRAND_TO],

    [/\bTOUCHDOWN\b/g, "BASKET"],
    [/\bTouchdown\b/g, "Basket"],
    [/\bFIELD GOAL\b/g, "3-POINT SHOT"],
    [/\bField Goal\b/g, "3-Point Shot"],
    [/\bPAT\b/g, "FREE THROW"],
    [/\bP\.?A\.?T\.?\b/g, "FT"],
    [/\bKICKOFF\b/g, "TIP-OFF"],
    [/\bKickoff\b/g, "Tip-off"],
    [/\bPUNT\b/g, "TURNOVER"],
    [/\bPunt\b/g, "Turnover"],
    [/\bINTERCEPTION\b/g, "STEAL"],
    [/\bInterception\b/g, "Steal"],
    [/\bSACK\b/g, "STUFF"],
    [/\bSack\b/g, "Stuff"],
    [/\bTACKLE\b/g, "STOP"],
    [/\bTackle\b/g, "Stop"],

    [/\bYARDS\b/g, "FEET"],
    [/\bYard\b/g, "Foot"],
    [/\bYards\b/g, "Feet"],
    [/\bYDS\b/g, "FT"],

    [/\bDOWN\b/g, "POSS"],
    [/\bDown\b/g, "Poss"],

    [/\bQB\b/g, "PG"],
    [/\bRB\b/g, "SG"],
    [/\bWR\b/g, "SF"],
    [/\bTE\b/g, "PF"],
    [/\bOL\b/g, "C"]
  ];

  function applyReskin(text) {
    if (typeof text !== "string" || text.length === 0) return text;
    let out = text;
    for (const [re, to] of REPLACEMENTS) out = out.replace(re, to);
    return out;
  }

  function getUrlFromFetchInput(input) {
    if (typeof input === "string") return input;
    if (input && typeof input === "object" && typeof input.url === "string") return input.url;
    return "";
  }

  function shouldPatchUrl(url) {
    if (!url) return false;
    const clean = url.split("?")[0];
    return FILE_MATCH_RE.test(clean);
  }

  function patchBrandingInDom() {
    try {
      document.title = String(document.title || "").replace(BRAND_FROM_RE, BRAND_TO);
    } catch (_) {}

    try {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const n of nodes) {
        if (n.nodeValue && BRAND_FROM_RE.test(n.nodeValue)) {
          n.nodeValue = n.nodeValue.replace(BRAND_FROM_RE, BRAND_TO);
        }
      }
    } catch (_) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", patchBrandingInDom, { once: true });
  } else {
    patchBrandingInDom();
  }

  // fetch() interception
  if (typeof window.fetch === "function") {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = getUrlFromFetchInput(input);
      const res = await originalFetch(input, init);
      if (!shouldPatchUrl(url)) return res;

      try {
        const text = await res.text();
        const patched = applyReskin(text);

        const headers = new Headers();
        try {
          res.headers.forEach((v, k) => headers.set(k, v));
        } catch (_) {}
        if (!headers.has("content-type")) headers.set("content-type", "text/plain; charset=utf-8");

        return new Response(patched, {
          status: res.status,
          statusText: res.statusText,
          headers
        });
      } catch (_) {
        return res;
      }
    };
  }

  // XMLHttpRequest interception
  if (typeof window.XMLHttpRequest === "function") {
    const XHRProto = window.XMLHttpRequest.prototype;
    const originalOpen = XHRProto.open;
    const originalSend = XHRProto.send;

    XHRProto.open = function (method, url, async, user, password) {
      try {
        this.__hoops_url = typeof url === "string" ? url : "";
      } catch (_) {
        this.__hoops_url = "";
      }
      return originalOpen.call(this, method, url, async, user, password);
    };

    XHRProto.send = function (body) {
      const xhr = this;
      const url = xhr.__hoops_url || "";

      if (shouldPatchUrl(url)) {
        const onReady = () => {
          if (xhr.readyState !== 4) return;
          try {
            const raw = xhr.responseText;
            const patched = applyReskin(raw);

            try {
              Object.defineProperty(xhr, "responseText", { configurable: true, get: () => patched });
            } catch (_) {}
            try {
              Object.defineProperty(xhr, "response", { configurable: true, get: () => patched });
            } catch (_) {}
          } catch (_) {}
        };

        try {
          xhr.addEventListener("readystatechange", onReady);
        } catch (_) {
          const prev = xhr.onreadystatechange;
          xhr.onreadystatechange = function (e) {
            try { onReady(); } catch (_) {}
            if (typeof prev === "function") return prev.call(xhr, e);
          };
        }
      }

      return originalSend.call(xhr, body);
    };
  }
})();
