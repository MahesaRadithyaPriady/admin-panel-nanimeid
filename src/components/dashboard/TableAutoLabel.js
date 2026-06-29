'use client';

import { useEffect } from 'react';

/**
 * Scans all tables inside .overflow-auto / .table-wrapper containers and:
 * 1. Copies <th> text → corresponding <td> data-label attribute
 * 2. Toggles .tbl-mobile class based on viewport width
 * 3. Re-runs on DOM mutations (SPA navigation, dynamic data loads)
 */
export default function TableAutoLabel() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const MOBILE_BREAKPOINT = 768;
    const SELECTOR = '.overflow-auto > table, .overflow-x-auto > table, .table-wrapper > table, table.tbl';

    const processTable = (table) => {
      const ths = table.querySelectorAll('thead th');
      if (!ths.length) return;

      const labels = Array.from(ths).map((th) =>
        th.textContent?.trim() || ''
      );

      const rows = table.querySelectorAll('tbody tr');
      rows.forEach((row) => {
        const cells = row.querySelectorAll('td');
        cells.forEach((cell, i) => {
          if (i < labels.length && labels[i]) {
            cell.setAttribute('data-label', labels[i]);
          } else {
            cell.setAttribute('data-label', '');
          }
        });
      });
    };

    const updateMobileClass = () => {
      const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
      document.querySelectorAll(SELECTOR).forEach((table) => {
        if (isMobile) {
          table.classList.add('tbl-mobile');
        } else {
          table.classList.remove('tbl-mobile');
        }
      });
    };

    const processAll = () => {
      document.querySelectorAll(SELECTOR).forEach((table) => {
        processTable(table);
      });
      updateMobileClass();
    };

    // Initial run — delay slightly to let page content render
    const initialTimer = setTimeout(processAll, 100);

    // Watch for viewport changes
    const onResize = () => updateMobileClass();
    window.addEventListener('resize', onResize);

    // Watch for DOM mutations (dynamic data loads, SPA navigation)
    const observer = new MutationObserver(() => {
      processAll();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false,
    });

    return () => {
      clearTimeout(initialTimer);
      window.removeEventListener('resize', onResize);
      observer.disconnect();
    };
  }, []);

  return null;
}
