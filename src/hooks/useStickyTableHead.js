import { useEffect } from 'react';

// Keeps a table's <thead> visually pinned to the top of the viewport while the
// page (not the table) scrolls, and while the table itself scrolls horizontally.
//
// Why this exists: a table wrapped in an `overflow-x-auto` div (needed so wide
// tables scroll sideways instead of blowing out the page) forces the browser to
// also treat that div as a vertical scroll container (CSS coerces the unset
// overflow-y to `auto` once overflow-x is non-visible). Since that div never
// actually scrolls vertically itself, `position: sticky` on the real <th>
// elements sticks relative to that inert container instead of the page, so it
// never visually engages — confirmed by measuring th.getBoundingClientRect()
// before/after a page scroll (it moved in exact lockstep with the scroll delta,
// i.e. plain CSS sticky is a no-op here).
//
// This hook works around it by cloning the header into a `position: fixed`
// overlay once the real header has scrolled above the viewport, keeping its
// column widths and horizontal scroll position in sync with the real table.
// It re-checks every animation frame (not scroll/resize listeners) so it keeps
// working across loading states, tab switches and column-count changes without
// needing to know when the table's ref actually attaches.
export default function useStickyTableHead(scrollRef) {
  useEffect(() => {
    let rafId = null;
    let cancelled = false;
    let host = null;
    let cloneTable = null;
    let lastColCount = -1;

    const ensureHost = () => {
      if (host) return host;
      host = document.createElement('div');
      host.style.position = 'fixed';
      host.style.overflow = 'hidden';
      host.style.pointerEvents = 'none';
      host.style.zIndex = '30';
      host.style.display = 'none';
      document.body.appendChild(host);
      return host;
    };

    // Height of the always-visible sticky title/tabs/cards/search block above
    // the table (see the `[data-sticky-header-region]` wrapper each page uses),
    // so the floating header docks right below it instead of overlapping it.
    const getDockTop = () => {
      const region = document.querySelector('[data-sticky-header-region]');
      if (!region) return 0;
      return Math.max(0, region.getBoundingClientRect().bottom);
    };

    const removeClone = () => {
      if (host) {
        host.style.display = 'none';
        host.innerHTML = '';
      }
      cloneTable = null;
      lastColCount = -1;
    };

    const tick = () => {
      if (cancelled) return;

      const scrollEl = scrollRef.current;
      const table = scrollEl?.querySelector('table');
      const thead = table?.querySelector('thead');

      if (!scrollEl || !table || !thead) {
        removeClone();
        rafId = requestAnimationFrame(tick);
        return;
      }

      const scrollRect = scrollEl.getBoundingClientRect();
      const theadHeight = thead.getBoundingClientRect().height;
      const dockTop = getDockTop();
      const shouldDock = scrollRect.top < dockTop && scrollRect.bottom > dockTop + theadHeight + 40;
      const realThs = shouldDock ? Array.from(thead.querySelectorAll('th')) : [];

      if (!shouldDock || realThs.length === 0) {
        removeClone();
        rafId = requestAnimationFrame(tick);
        return;
      }

      const hostEl = ensureHost();

      if (!cloneTable || lastColCount !== realThs.length) {
        hostEl.innerHTML = '';
        cloneTable = document.createElement('table');
        cloneTable.className = table.className;
        cloneTable.style.tableLayout = 'fixed';
        cloneTable.style.margin = '0';
        const clonedThead = thead.cloneNode(true);
        clonedThead.querySelectorAll('th').forEach((th) => {
          th.style.position = 'static';
          th.style.top = 'auto';
        });
        cloneTable.appendChild(clonedThead);
        hostEl.appendChild(cloneTable);
        lastColCount = realThs.length;
      }

      const cloneThs = cloneTable.querySelectorAll('thead th');
      let totalWidth = 0;
      realThs.forEach((th, i) => {
        const w = th.getBoundingClientRect().width;
        totalWidth += w;
        const cell = cloneThs[i];
        if (cell) {
          cell.style.width = `${w}px`;
          cell.style.minWidth = `${w}px`;
          cell.style.maxWidth = `${w}px`;
        }
      });

      hostEl.style.display = 'block';
      hostEl.style.top = `${dockTop}px`;
      hostEl.style.left = `${scrollRect.left}px`;
      hostEl.style.width = `${scrollEl.clientWidth}px`;
      hostEl.style.height = `${theadHeight}px`;
      cloneTable.style.width = `${totalWidth}px`;
      cloneTable.style.transform = `translateX(${-scrollEl.scrollLeft}px)`;

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (host) host.remove();
    };
  }, [scrollRef]);
}
