(() => {
  if (globalThis.PointResizePicker) return;
  const MEDIA = "img,video,canvas,picture,svg";
  const ROOTS = new Set(["HTML", "BODY", "SCRIPT", "STYLE", "LINK", "META", "HEAD", "NOSCRIPT"]);
  const TEXT = /^(P|H[1-6]|SPAN|A|LI|LABEL|BUTTON|BLOCKQUOTE|FIGCAPTION|TD|TH)$/;
  const containsPoint = (r, x, y) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  const rectOK = r => r.width >= 12 && r.height >= 12;
  const textAttribute = "data-point-resize-text";
  const parentOf = element => element.parentElement || element.getRootNode().host || null;
  function openRoots(exclude) {
    const roots = [document];
    for (let index = 0; index < roots.length; index++) {
      for (const element of roots[index].querySelectorAll("*")) {
        if (element !== exclude && element.shadowRoot) roots.push(element.shadowRoot);
      }
    }
    return roots;
  }
  function rootsFor(rule) {
    let roots = [document];
    for (const selector of rule.shadowPath || []) {
      roots = roots.flatMap(root => [...root.querySelectorAll(selector)].map(element => element.shadowRoot).filter(Boolean));
    }
    return roots;
  }
  const queryRule = rule => rootsFor(rule).flatMap(root => [...root.querySelectorAll(rule.selector)]);
  function locatorFor(element, similar = false) {
    const shadowPath = [];
    for (let root = element.getRootNode(); root.host; root = root.host.getRootNode()) shadowPath.unshift(selectorFor(root.host, similar));
    return { selector: selectorFor(element, similar), ...(shadowPath.length ? { shadowPath } : {}) };
  }
  function hitLayers(x, y, host) {
    const layers = [], seen = new Set();
    function visit(root) {
      for (const element of root.elementsFromPoint(x, y)) {
        if (element === host || seen.has(element)) continue;
        seen.add(element);
        if (element.shadowRoot) visit(element.shadowRoot);
        if (!ROOTS.has(element.tagName)) layers.push(element);
      }
    }
    visit(document); return layers;
  }
  function textSlots(element) {
    return [...element.childNodes].filter(node => node.nodeType === Node.TEXT_NODE ? node.textContent.trim() : node.nodeType === Node.ELEMENT_NODE && node.hasAttribute(textAttribute));
  }
  function resolveText(element, anchor, similar = false) {
    const slots = textSlots(element);
    const slot = (!similar && slots.find(node => node.textContent === anchor.quote)) || slots[anchor.index];
    return slot?.nodeType === Node.TEXT_NODE ? slot : slot?.firstChild;
  }
  function rectFor(candidate) {
    if (candidate.textAnchor && !candidate.textNode?.isConnected) candidate.textNode = resolveText(candidate.element, candidate.textAnchor);
    if (candidate.textNode?.isConnected) {
      const range = document.createRange(); range.selectNodeContents(candidate.textNode); return range.getBoundingClientRect();
    }
    return candidate.element.getBoundingClientRect();
  }
  function textAt(x, y, host, layers) {
    const roots = [...new Set(layers.map(element => element.getRootNode()).filter(root => root.host))];
    const caret = document.caretPositionFromPoint?.(x, y, { shadowRoots: roots });
    const caretNode = caret?.offsetNode || document.caretRangeFromPoint?.(x, y)?.startContainer;
    // Checking the deepest hit elements also supports browsers whose caret API
    // retargets shadow text to its host, and wrapped text with inline children.
    const nodes = [...layers.slice(0, 64).flatMap(element => [...element.childNodes].filter(node => node.nodeType === Node.TEXT_NODE)), caretNode];
    for (const node of new Set(nodes)) {
    if (node?.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) continue;
    const wrapper = node.parentElement;
    const element = wrapper.hasAttribute(textAttribute) ? wrapper.parentElement : wrapper;
    if (ROOTS.has(element.tagName) || element === host || host.contains(element) || /^(INPUT|TEXTAREA|SCRIPT|STYLE)$/.test(element.tagName)) continue;
    const hit = document.createRange(); hit.selectNodeContents(node);
    if (![...hit.getClientRects()].some(r => containsPoint(r, x, y))) continue;
    return { element, textNode: node, textAnchor: { index: textSlots(element).indexOf(wrapper.hasAttribute(textAttribute) ? wrapper : node), quote: node.textContent.slice(0, 10000) }, score: 500, kind: "text", label: "文字", reason: "已精确定位到鼠标下的文字" };
    }
    return null;
  }

  function inspectAt(x, y, host) {
    const layers = hitLayers(x, y, host);
    const candidates = new Map();
    const viewportArea = innerWidth * innerHeight;
    const add = (element, score, kind, label, reason) => {
      if (!element || ROOTS.has(element.tagName) || element === host) return;
      const r = element.getBoundingClientRect();
      if (!rectOK(r) || !containsPoint(r, x, y)) return;
      const old = candidates.get(element);
      if (!old || old.score < score) candidates.set(element, { element, score, kind, label, reason });
    };
    const mediaSeeds = [];
    const opaque = el => {
      const cs = getComputedStyle(el);
      if (Number(cs.opacity) < .98) return false;
      const color = cs.backgroundColor;
      if (color === "transparent") return false;
      if (/^rgb\(/.test(color) && !color.includes("/")) return true;
      const rgba = color.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)$/);
      return !!rgba && Number(rgba[1]) >= .98;
    };
    for (const el of layers) {
      const r = el.getBoundingClientRect();
      if (!rectOK(r)) continue;
      // Both real media and CSS background images are detected, without site selectors.
      const media = el.matches(MEDIA) && r.width >= 36 && r.height >= 36;
      const background = !media && r.width >= 48 && r.height >= 48 && getComputedStyle(el).backgroundImage.includes("url(");
      if (media || background) {
        // Do not jump through a genuinely opaque foreground panel to invisible media.
        // Transparent hit targets are still traversed and can lead to the media beneath.
        const position = layers.indexOf(el);
        const blocked = layers.slice(0, position).some(front => !front.contains(el) && !el.contains(front) && opaque(front));
        if (blocked) continue;
        const video = el.tagName === "VIDEO";
        mediaSeeds.push({ element: el, rect: r, kind: video ? "video" : "image" });
        add(el, 170, video ? "video" : "image", video ? "视频" : "图片", "已定位到可见媒体");
      }
    }
    for (const seed of mediaSeeds) {
      let parent = parentOf(seed.element);
      for (let depth = 1; parent && depth <= 10 && !ROOTS.has(parent.tagName); depth++, parent = parentOf(parent)) {
        const r = parent.getBoundingClientRect();
        const base = seed.rect;
        // Ascend through coextensive wrappers. Stop before a broader card / two-column layout.
        // This finds the actual media block even when an interaction layer is on top.
        const wr = r.width / base.width, hr = r.height / base.height;
        const containsMedia = r.left <= base.left + 5 && r.top <= base.top + 5 && r.right >= base.right - 5 && r.bottom >= base.bottom - 5;
        const sameFootprint = wr >= .90 && wr <= 1.20 && hr >= .90 && hr <= 1.28 && wr * hr <= 1.45;
        if (containsMedia && sameFootprint && r.width * r.height < viewportArea * .94) {
          add(parent, 190 + depth * 4, seed.kind, seed.kind === "video" ? "整块视频区" : "整块图片区", "已越过覆盖层，按媒体边界识别");
        } else if (wr > 1.35 || hr > 1.5) break;
      }
    }
    for (let i = 0; i < layers.length; i++) {
      const el = layers[i];
      const r = el.getBoundingClientRect();
      const text = (el.textContent || "").trim();
      const textOnly = TEXT.test(el.tagName) && text && !el.querySelector(MEDIA) && [...el.children].every(child => /^(inline|contents)/.test(getComputedStyle(child).display));
      if (textOnly && !mediaSeeds.some(s => el.contains(s.element))) {
        add(el, 130 - i, "text", "文字", "已定位到文字区域");
      } else if (r.width * r.height < viewportArea * .75 && r.width > 24 && r.height > 24) {
        add(el, 35 - i, "block", "内容区域", "可以缩放整块内容");
      }
    }
    const text = textAt(x, y, host, layers);
    return [...(text ? [text] : []), ...[...candidates.values()].sort((a, b) => b.score - a.score)].slice(0, 16);
  }

  function describe(element) {
    const video = element.matches("video") || !!element.querySelector("video");
    const media = element.matches(MEDIA);
    return { element, kind: media ? (video ? "video" : "image") : "block", label: media ? (video ? "视频" : "图片") : "内容区域", reason: "按网页实际父子关系选择范围" };
  }
  const sameCandidate = (a, b) => a?.element === b?.element && (a?.textAnchor?.index ?? -1) === (b?.textAnchor?.index ?? -1);
  const siblingParent = candidate => candidate.textAnchor ? candidate.element : candidate.element.parentNode;
  function contentChildren(root, host) {
    const candidates = [];
    for (const node of root.childNodes) {
      if (node.nodeType === Node.TEXT_NODE || (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute(textAttribute))) {
        const textNode = node.nodeType === Node.TEXT_NODE ? node : node.firstChild;
        if (!textNode?.textContent.trim() || root.nodeType !== Node.ELEMENT_NODE) continue;
        const range = document.createRange(); range.selectNodeContents(textNode);
        if (range.getBoundingClientRect().width < 2 || range.getBoundingClientRect().height < 2) continue;
        candidates.push({ element: root, textNode, textAnchor: { index: textSlots(root).indexOf(node), quote: textNode.textContent.slice(0, 10000) }, kind: "text", label: "文字", reason: "按同层文字节点选择" });
      } else if (node.nodeType === Node.ELEMENT_NODE && node !== host && !ROOTS.has(node.tagName)) {
        const r = node.getBoundingClientRect(), css = getComputedStyle(node);
        if (r.width >= 2 && r.height >= 2 && css.visibility !== "hidden" && css.display !== "none") candidates.push(describe(node));
      }
    }
    return candidates;
  }
  const childrenOf = (candidate, host) => candidate.textAnchor ? [] : contentChildren(candidate.element.shadowRoot || candidate.element, host);
  const siblingsOf = (candidate, host) => {
    const parent = siblingParent(candidate);
    return parent ? contentChildren(parent, host) : [candidate];
  };
  function hierarchy(candidate, point, host) {
    const levels = new Map([[1, candidate]]);
    let parent = candidate.textAnchor ? candidate.element : parentOf(candidate.element);
    for (let level = 2; parent && !ROOTS.has(parent.tagName) && level <= 21; level++, parent = parentOf(parent)) {
      if (parent === host) break;
      levels.set(level, describe(parent));
    }
    if (!candidate.textAnchor) {
      let current = candidate;
      const x = point?.x ?? rectFor(candidate).left + rectFor(candidate).width / 2;
      const y = point?.y ?? rectFor(candidate).top + rectFor(candidate).height / 2;
      for (let level = -1; level >= -12; level--) {
        const all = childrenOf(current, host), hit = all.filter(child => containsPoint(rectFor(child), x, y));
        const children = hit.length ? hit : all;
        if (!children.length) break;
        // Prefer actual media content to a transparent sibling interaction layer.
        current = children.find(child => !child.textAnchor && (child.element.matches(MEDIA) || child.element.querySelector(MEDIA))) || children[0];
        levels.set(level, current);
      }
    }
    return levels;
  }

  function usableClasses(el) {
    return [...el.classList].filter(c => c.length < 65 && !/^(active|selected|hover|focus|open|hidden|visible|is-|has-)/i.test(c) && !/[a-f\d]{10,}/i.test(c)).slice(0, 3);
  }
  function selectorFor(el, similar = false) {
    const escape = CSS.escape;
    const root = el.getRootNode();
    if (!similar && el.id && root.querySelectorAll(`#${escape(el.id)}`).length === 1) return `#${escape(el.id)}`;
    const tag = el.tagName.toLowerCase();
    const classes = usableClasses(el);
    const simple = tag + classes.map(c => "." + escape(c)).join("");
    if ((similar && (classes.length || tag.includes("-"))) || root.querySelectorAll(simple).length === 1) return simple;
    // An id can identify one item even when its class identifies the whole set.
    // Without reusable classes, keep the unique item rather than selecting every div.
    if (el.id && root.querySelectorAll(`#${escape(el.id)}`).length === 1) return `#${escape(el.id)}`;
    const parts = [];
    let current = el;
    for (let depth = 0; current && depth < 12; depth++, current = current.parentElement) {
      if (current.id) {
        parts.unshift(`#${escape(current.id)}`);
      } else {
        let part = current.tagName.toLowerCase() + usableClasses(current).map(c => "." + escape(c)).join("");
        const siblings = [...current.parentNode.children].filter(n => n.tagName === current.tagName);
        if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
        parts.unshift(part);
      }
      const selector = parts.join(" > ");
      if (root.querySelectorAll(selector).length === 1) return selector;
    }
    return parts.join(" > ");
  }

  function validRule(rule) {
    if (!rule || typeof rule.selector !== "string" || rule.selector.length > 2500) return false;
    if (rule.hidden !== undefined && typeof rule.hidden !== "boolean") return false;
    if (rule.textAnchor && (!Number.isInteger(rule.textAnchor.index) || rule.textAnchor.index < 0 || rule.textAnchor.index > 1000 || typeof rule.textAnchor.quote !== "string" || rule.textAnchor.quote.length > 10000 || typeof rule.id !== "string")) return false;
    if (rule.shadowPath !== undefined && (!Array.isArray(rule.shadowPath) || rule.shadowPath.length > 32 || rule.shadowPath.some(part => typeof part !== "string" || !part || part.length > 2500))) return false;
    try { for (const selector of [...(rule.shadowPath || []), rule.selector]) document.querySelector(selector); } catch { return false; }
    return ["scale", "font"].includes(rule.mode) && Number.isFinite(rule.value) && rule.value >= (rule.mode === "font" ? 8 : 10) && rule.value <= (rule.mode === "font" ? 64 : 200);
  }
  function ruleCSS(rule) {
    if (!validRule(rule)) return "";
    if (rule.hidden) {
      const target = rule.textAnchor ? `:is(${rule.selector}) > [${textAttribute}="${CSS.escape(rule.id)}"]` : rule.selector;
      return `${target} {display:none !important;}`;
    }
    if (rule.mode === "font") {
      if (rule.value === rule.defaultValue) return "";
      if (rule.textAnchor) return `:is(${rule.selector}) > [${textAttribute}="${CSS.escape(rule.id)}"] {font-size:${rule.value}px !important;}`;
      return `${rule.selector}, :is(${rule.selector}) :is(p,span,a,li,h1,h2,h3,h4,h5,h6,strong,em,label,blockquote) {font-size:${rule.value}px !important;}`;
    }
    if (rule.value === 100) return "";
    return `${rule.selector} {box-sizing:border-box !important;width:var(--point-resize-width,revert) !important;height:var(--point-resize-height,revert) !important;min-width:0 !important;min-height:0 !important;max-width:none !important;max-height:none !important;flex-grow:0 !important;flex-shrink:0 !important;flex-basis:auto !important;zoom:calc(var(--point-resize-original-zoom,1) * ${rule.value / 100}) !important;}`;
  }
  globalThis.PointResizePicker = { inspectAt, selectorFor, locatorFor, rootsFor, queryRule, openRoots, parentOf, validRule, ruleCSS, hierarchy, rectFor, resolveText, textAttribute, sameCandidate, siblingParent, siblingsOf };
})();
