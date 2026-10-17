import React, { useEffect, useRef, useState } from 'react';
import { findAcronyms, lookupAcronym } from '@/data/acronyms';

// App-wide acronym explanations. Every glossary acronym in rendered text gets a dotted underline,
// and hovering (or tapping, on touch) shows its expansion and purpose.
//
// It never edits React-owned DOM: underlines use the CSS Custom Highlight API (Range objects, no
// wrapper elements) and hover is resolved by hit-testing the caret position under the pointer.
// Mark any subtree with data-no-glossary to opt it out.

const HIGHLIGHT_NAME = 'acronym';
const SKIP_SELECTOR =
  'script,style,noscript,textarea,input,select,option,code,pre,kbd,samp,svg,canvas,[contenteditable="true"],[data-no-glossary],[class*="bg-terminal"]';
const TOOLTIP_WIDTH = 320;
const GAP = 8;

const supportsHighlights = () => typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined';

/** Acronym matches for a text node, cached until its text changes. */
const matchCache = new WeakMap();
function matchesFor(node) {
  const cached = matchCache.get(node);
  if (cached && cached.text === node.data) return cached.matches;
  const matches = findAcronyms(node.data);
  matchCache.set(node, { text: node.data, matches });
  return matches;
}

const skippedCache = new WeakMap();
function isSkipped(textNode) {
  const el = textNode.parentElement;
  if (!el) return true;
  if (!skippedCache.has(el)) skippedCache.set(el, !!el.closest(SKIP_SELECTOR));
  return skippedCache.get(el);
}

/** Underline every acronym in the document. */
function paintHighlights() {
  if (!supportsHighlights() || !document.body) return;
  const ranges = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        return node.matches(SKIP_SELECTOR) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    for (const m of matchesFor(node)) {
      const r = new Range();
      r.setStart(node, m.start);
      r.setEnd(node, m.end);
      ranges.push(r);
    }
  }
  CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(...ranges));
}

function caretAt(x, y) {
  if (document.caretPositionFromPoint) {
    const p = document.caretPositionFromPoint(x, y);
    return p && { node: p.offsetNode, offset: p.offset };
  }
  if (document.caretRangeFromPoint) {
    const r = document.caretRangeFromPoint(x, y);
    return r && { node: r.startContainer, offset: r.startOffset };
  }
  return null;
}

/** The acronym directly under the point, with its on-screen rect, or null. */
function acronymAt(x, y) {
  const caret = caretAt(x, y);
  if (!caret || caret.node?.nodeType !== Node.TEXT_NODE || isSkipped(caret.node)) return null;
  const node = caret.node;
  const m = matchesFor(node).find((mm) => caret.offset >= mm.start && caret.offset <= mm.end);
  if (!m) return null;
  // The caret snaps to the nearest text, so confirm the pointer is really over the word.
  const range = document.createRange();
  range.setStart(node, m.start);
  range.setEnd(node, m.end);
  const rect = [...range.getClientRects()].find(
    (r) => x >= r.left - 2 && x <= r.right + 2 && y >= r.top - 2 && y <= r.bottom + 2,
  );
  return rect ? { key: m.key, rect, node, start: m.start } : null;
}

function placeTooltip(rect) {
  const vw = window.innerWidth;
  const width = Math.min(TOOLTIP_WIDTH, vw - 32);
  const left = Math.max(16, Math.min(rect.left + rect.width / 2 - width / 2, vw - width - 16));
  const below = rect.top < 140; // not enough room above: drop below the word
  return below
    ? { left, width, top: rect.bottom + GAP }
    : { left, width, bottom: window.innerHeight - rect.top + GAP };
}

export default function AcronymTooltips() {
  const [tip, setTip] = useState(null);
  const currentRef = useRef(null); // { node, start } of the acronym being shown

  useEffect(() => {
    if (supportsHighlights()) document.documentElement.classList.add('has-acronym-highlights');

    const show = (hit) => {
      const cur = currentRef.current;
      if (cur && cur.node === hit.node && cur.start === hit.start) return;
      currentRef.current = { node: hit.node, start: hit.start };
      document.documentElement.classList.add('acronym-hover');
      setTip({ ...lookupAcronym(hit.key), pos: placeTooltip(hit.rect) });
    };
    const hide = () => {
      if (!currentRef.current) return;
      currentRef.current = null;
      document.documentElement.classList.remove('acronym-hover');
      setTip(null);
    };

    // Repaint underlines whenever the page content changes (debounced). Close the tooltip if the
    // word it explains left the page (e.g. tapping an acronym inside a link navigated away).
    let timer = 0;
    const schedule = () => {
      if (currentRef.current && !currentRef.current.node.isConnected) hide();
      clearTimeout(timer);
      timer = setTimeout(() => {
        const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 0));
        idle(paintHighlights);
      }, 150);
    };
    paintHighlights();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    let frame = 0;
    const onMove = (e) => {
      if (e.pointerType !== 'mouse') return;
      const { clientX, clientY } = e;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const hit = acronymAt(clientX, clientY);
        if (hit) show(hit);
        else hide();
      });
    };
    // Touch and pen: tap an acronym to explain it, tap anywhere else to dismiss. A tap on a link or
    // button only does what the control does (hover still explains those with a mouse).
    const onTap = (e) => {
      if (e.pointerType === 'mouse') return;
      const hit = acronymAt(e.clientX, e.clientY);
      if (hit && !hit.node.parentElement?.closest('a,button,[role="button"],[role="tab"]')) show(hit);
      else hide();
    };
    const onKey = (e) => e.key === 'Escape' && hide();

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerup', onTap, { passive: true });
    window.addEventListener('scroll', hide, { passive: true, capture: true });
    window.addEventListener('resize', hide);
    document.addEventListener('keydown', onKey);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onTap);
      window.removeEventListener('scroll', hide, { capture: true });
      window.removeEventListener('resize', hide);
      document.removeEventListener('keydown', onKey);
      if (supportsHighlights()) CSS.highlights.delete(HIGHLIGHT_NAME);
      document.documentElement.classList.remove('has-acronym-highlights', 'acronym-hover');
    };
  }, []);

  if (!tip) return null;
  return (
    <div
      role="tooltip"
      data-no-glossary
      className="glass-strong bg-white/95 pointer-events-none fixed z-[9999] rounded-xl px-3.5 py-2.5 text-left text-sm leading-snug text-ink-1"
      style={tip.pos}
    >
      <p className="font-semibold">
        <span className="text-action">{tip.term}</span>: {tip.expansion}
      </p>
      <p className="mt-1 text-ink-2">{tip.purpose}</p>
    </div>
  );
}
