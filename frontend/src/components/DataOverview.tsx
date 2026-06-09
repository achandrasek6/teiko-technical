import { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, Filter, XCircle, RotateCcw, Columns } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { themeQuartz } from 'ag-grid-community';
import { 
  fetchJSON, 
  formatPop, 
  getPopColor, 
  PopBadge, 
  POPULATIONS 
} from '../utils/shared';

// --- URL param helpers ---
function getUrlParams() { return new URLSearchParams(window.location.search); }
function updateUrl(updates: Record<string, string | null>) {
  const p = getUrlParams();
  for (const [k, v] of Object.entries(updates)) {
    if (v === null) p.delete(k); else p.set(k, v);
  }
  const qs = p.toString();
  window.history.replaceState({}, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
}
function syncPopsToUrl() {
  if (_activePops.length === POPULATIONS.length) {
    updateUrl({ pops: null });
  } else if (_activePops.length === 0) {
    updateUrl({ pops: 'none' });
  } else {
    updateUrl({ pops: _activePops.join(',') });
  }
}

// --- Module-level variables ---
let _activePops: string[] = (() => {
  const raw = getUrlParams().get('pops');
  if (raw === null) return [...POPULATIONS];
  if (raw === 'none' || raw === '') return [];
  const parsed = raw.split(',').filter(p => POPULATIONS.includes(p));
  return parsed.length > 0 ? parsed : [...POPULATIONS];
})();
let _notifyParent: (() => void) | null = null;
let _resetFilterUI: (() => void) | null = null;

export const PopulationFilter = forwardRef((props: any, ref) => {
  const [checked, setChecked] = useState<string[]>([..._activePops]);

  useImperativeHandle(ref, () => ({
    isFilterActive: () => _activePops.length !== POPULATIONS.length,
    doesFilterPass: () => true, // Row filtering handled via rowData filtering
    getModel: () => _activePops.length === POPULATIONS.length ? null : { pops: [..._activePops] },
    setModel: (model: any) => {
      const pops = model?.pops ? [...model.pops] : [...POPULATIONS];
      _activePops = pops;
      setChecked(pops);
      if (_notifyParent) _notifyParent();
    },
  }), []);

  // Register a direct reset function so the parent can reset checkboxes
  useEffect(() => {
    _resetFilterUI = () => setChecked([...POPULATIONS]);
    return () => { _resetFilterUI = null; };
  }, []);

  const apply = (next: string[]) => {
    _activePops = next;
    setChecked(next);
    // Defer grid notifications to next frame so the popup interaction isn't interrupted
    requestAnimationFrame(() => {
      if (_notifyParent) _notifyParent();
      props.filterChangedCallback();
    });
  };

  return (
    <div style={{ padding: '1rem', background: 'white', borderRadius: '4px', width: '220px' }}>
      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select Populations</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {POPULATIONS.map(pop => (
          <label key={pop} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem', color: '#334155' }}>
            <input
              type="checkbox"
              className="pop-checkbox"
              checked={checked.includes(pop)}
              onChange={() => {
                const next = checked.includes(pop)
                  ? checked.filter(p => p !== pop)
                  : [...checked, pop];
                apply(next);
              }}
              style={{ '--pop-color': getPopColor(pop) } as React.CSSProperties}
            />
            <span>{formatPop(pop)}</span>
          </label>
        ))}
      </div>
      <div style={{ marginTop: '0.875rem', display: 'flex', gap: '6px' }}>
        <button onClick={() => apply([...POPULATIONS])} disabled={checked.length === POPULATIONS.length}
          style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem', cursor: checked.length === POPULATIONS.length ? 'not-allowed' : 'pointer', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#334155', opacity: checked.length === POPULATIONS.length ? 0.5 : 1 }}>
          All
        </button>
        <button onClick={() => apply([])} disabled={checked.length === 0}
          style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem', cursor: checked.length === 0 ? 'not-allowed' : 'pointer', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#334155', opacity: checked.length === 0 ? 0.5 : 1 }}>
          None
        </button>
      </div>
    </div>
  );
});


export default function DataOverview() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFiltered, setIsFiltered] = useState(_activePops.length !== POPULATIONS.length);
  const [isSorted, setIsSorted] = useState(false);
  const [isColsCustomized, setIsColsCustomized] = useState(!!localStorage.getItem('teikoDataOverviewCols'));
  const initialPageSize = useMemo(() => {
    const ps = parseInt(getUrlParams().get('pageSize') || '', 10);
    return [15, 50, 100, 1000].includes(ps) ? ps : 15;
  }, []);
  const gridRef = useRef<AgGridReact>(null);

  const gridComponents = useMemo(() => ({ PopulationFilter }), []);

  // Register module-level callback: triggers ag-grid external filter re-evaluation in place.
  useEffect(() => {
    _notifyParent = () => {
      gridRef.current?.api?.onFilterChanged();
      syncPopsToUrl();
    };
    return () => { _notifyParent = null; };
  }, []);

  // Memoize all ag-grid callback props to prevent popup destruction on re-render
  const externalFilterPresent = useMemo(() => () => _activePops.length !== POPULATIONS.length, []);
  const externalFilterPass = useMemo(() => (node: any) => _activePops.includes(node.data?.population), []);
  const handleFilterChanged = useMemo(() => (e: any) => {
    const gridActive = e.api.isAnyFilterPresent();
    const popActive = _activePops.length !== POPULATIONS.length;
    setIsFiltered(gridActive || popActive);
    
    // Persist native filters to URL
    const model = e.api.getFilterModel();
    delete model.population; // Handled separately via pops
    if (Object.keys(model).length > 0) {
      updateUrl({ filters: encodeURIComponent(JSON.stringify(model)) });
    } else {
      updateUrl({ filters: null });
    }
  }, []);
  const handleSortChanged = useMemo(() => (e: any) => {
    const cols = e.api.getColumnState().filter((c: any) => c.sort != null);
    
    // Check if current sort exactly matches the default sort (Sample ID asc, Population asc)
    const isDefaultSort = cols.length === 2 && 
      cols.some((c: any) => c.colId === 'sample' && c.sort === 'asc') &&
      cols.some((c: any) => c.colId === 'population' && c.sort === 'asc');
      
    setIsSorted(!isDefaultSort); // Show 'Reset Sorts' if NOT default
    
    // Persist sort to URL
    if (isDefaultSort) {
      updateUrl({ sort: null }); // Remove param to fall back to natural default
    } else if (cols.length > 0) {
      updateUrl({ sort: cols.map((c: any) => `${c.colId}.${c.sort}`).join(',') });
    } else {
      updateUrl({ sort: 'none' }); // Explicitly cleared
    }
  }, []);
  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    floatingFilter: false,
    resizable: true,
    filterParams: {
      buttons: ['clear']
    }
  }), []);
  const rowClassRules = useMemo(() => ({
    'custom-row-odd': (params: any) => params.node.rowIndex !== null && params.node.rowIndex % 2 !== 0
  }), []);

  // Forcefully inject tooltips and population filter active state onto header icons
  useEffect(() => {
    const applyHeaderState = () => {
      const tooltips: Record<string, string> = {
        sample: 'Filter by Sample ID (number only)',
        population: 'Click to filter by specific cell populations',
        total_count: 'Filter by Total Count',
        count: 'Filter by absolute Cell Count',
        percentage: 'Filter by relative Percentage'
      };
      
      Object.entries(tooltips).forEach(([colId, text]) => {
        const headerCell = document.querySelector(`.ag-header-cell[col-id="${colId}"]`);
        if (headerCell) {
          const filterIcon = headerCell.querySelector('.ag-header-icon');
          if (filterIcon && filterIcon.getAttribute('title') !== text) {
            filterIcon.setAttribute('title', text);
          }
        }
      });

      // Highlight population filter icon when filter is active
      const popHeader = document.querySelector('.ag-header-cell[col-id="population"]');
      if (popHeader) {
        const filterActive = _activePops.length !== POPULATIONS.length;
        popHeader.classList.toggle('ag-header-cell-filtered', filterActive);
        const icons = popHeader.querySelectorAll('.ag-header-icon');
        icons.forEach(icon => {
          const el = icon as HTMLElement;
          if (el.querySelector('.ag-icon-filter')) {
            el.classList.toggle('pop-filter-active-icon', filterActive);
            
            if (filterActive) {
              // Add blue dot indicator
              if (!el.querySelector('.pop-filter-dot')) {
                const dot = document.createElement('span');
                dot.className = 'pop-filter-dot';
                Object.assign(dot.style, {
                  position: 'absolute', top: '3px', right: '2.5px',
                  width: '6px', height: '6px', borderRadius: '50%',
                  backgroundColor: 'var(--ag-accent-color)',
                  pointerEvents: 'none'
                });
                el.appendChild(dot);
              }
            } else {
              const dot = el.querySelector('.pop-filter-dot');
              if (dot) dot.remove();
            }
          }
        });
      }
    };

    const interval = setInterval(applyHeaderState, 400);
    return () => clearInterval(interval);
  }, []);

  const clearFilters = () => {
    _activePops = [...POPULATIONS];
    if (_resetFilterUI) _resetFilterUI();
    gridRef.current?.api.setFilterModel(null);
    gridRef.current?.api.onFilterChanged();
    syncPopsToUrl();
    setIsFiltered(false);
  };

  const resetColumns = () => {
    localStorage.removeItem('teikoDataOverviewCols');
    
    // Capture the current sort state before resetting columns
    const currentSort = gridRef.current?.api.getColumnState()
      .filter(c => c.sort != null)
      .map(c => ({ colId: c.colId, sort: c.sort, sortIndex: c.sortIndex }));

    gridRef.current?.api.resetColumnState();
    
    // Re-apply the captured sort state
    if (currentSort && currentSort.length > 0) {
      gridRef.current?.api.applyColumnState({ state: currentSort });
    }
    
    setIsColsCustomized(false);
  };

  const resetSorts = () => {
    gridRef.current?.api.applyColumnState({
      state: [
        { colId: 'sample', sort: 'asc', sortIndex: 0 },
        { colId: 'population', sort: 'asc', sortIndex: 1 }
      ],
      defaultState: { sort: null }
    });
    updateUrl({ sort: null });
  };

  useEffect(() => {
    fetchJSON('/summary').then(res => {
      setData(res);
      setLoading(false);
    }).catch(console.error);
  }, []);


  const colDefs = useMemo(() => [
    { 
      colId: 'sample',
      field: 'sample', 
      headerName: 'Sample ID', 
      headerTooltip: 'Unique identifier for the biological sample',
      filter: 'agNumberColumnFilter', 
      filterValueGetter: (p: any) => {
        if (!p.data || !p.data.sample) return null;
        return parseInt(p.data.sample.replace(/\D/g, ''), 10);
      },
      comparator: (valueA: string, valueB: string) => {
        const numA = parseInt(valueA.replace(/\D/g, ''), 10);
        const numB = parseInt(valueB.replace(/\D/g, ''), 10);
        return numA - numB;
      },
      initialSort: 'asc',
      initialSortIndex: 0,
      flex: 1 
    },
    { 
      colId: 'population',
      field: 'population', 
      headerName: 'Population', 
      headerTooltip: 'Specific cell subset analyzed. Sorts hierarchically by biological lineage.',
      filter: 'PopulationFilter',
      comparator: (valueA: any, valueB: any) => POPULATIONS.indexOf(valueA) - POPULATIONS.indexOf(valueB),
      initialSort: 'asc',
      initialSortIndex: 1,
      flex: 1, 
      cellRenderer: (p: any) => <PopBadge pop={p.value} /> 
    },
    { field: 'total_count', headerName: 'Total Count', headerTooltip: 'Total number of cells in the parent or root population', filter: 'agNumberColumnFilter', flex: 1, type: 'numericColumn', valueFormatter: (p: any) => p.value?.toLocaleString() },
    { field: 'count', headerName: 'Cell Count', headerTooltip: 'Absolute number of cells identified in this specific population', filter: 'agNumberColumnFilter', flex: 1, type: 'numericColumn', valueFormatter: (p: any) => p.value?.toLocaleString() },
    { field: 'percentage', headerName: 'Percentage', headerTooltip: 'Relative frequency of this population as a percentage of the total count', filter: 'agNumberColumnFilter', flex: 1, type: 'numericColumn', valueFormatter: (p: any) => `${p.value?.toFixed(2)}%` }
  ], []);

  if (loading) return (
    <div className="card">
      <div className="skeleton" style={{height: '400px', width: '100%'}}></div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.25rem', backgroundColor: '#f8fafc' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
            <ArrowUp size={14} color="#e83e3e" /> <b>Multi-sort:</b> Shift + Click header
          </span>
          <div style={{ display: 'flex', alignItems: 'center', borderLeft: '1px solid #e2e8f0', paddingLeft: '1rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
              <Filter size={14} color="#e83e3e" /> <b>Filter:</b> Click the filter icon beside headers
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button 
            title={isColsCustomized ? "Restore default column order and sizes" : "Columns are currently at default layout"}
            onClick={resetColumns} 
            disabled={!isColsCustomized}
            onMouseOver={(e) => { if (isColsCustomized) e.currentTarget.style.background = '#fef2f2'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'white'; }}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', 
              padding: '0.4rem 0.75rem', borderRadius: '6px', 
              border: '1px solid #fecaca', background: 'white', 
              color: isColsCustomized ? '#e83e3e' : '#94a3b8', 
              cursor: isColsCustomized ? 'pointer' : 'not-allowed', 
              opacity: isColsCustomized ? 1 : 0.6,
              fontWeight: 500, fontSize: '0.8rem', 
              boxShadow: isColsCustomized ? '0 1px 2px rgba(232,62,62,0.05)' : 'none', 
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}>
            <Columns size={14} /> Reset Columns
          </button>
          <button 
            title={isSorted ? "Restore default Sample ID and Population sorting" : "Sorting is currently at default"}
            onClick={resetSorts} 
            disabled={!isSorted}
            onMouseOver={(e) => { if (isSorted) e.currentTarget.style.background = '#fef2f2'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'white'; }}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', 
              padding: '0.4rem 0.75rem', borderRadius: '6px', 
              border: '1px solid #fecaca', background: 'white', 
              color: isSorted ? '#e83e3e' : '#94a3b8', 
              cursor: isSorted ? 'pointer' : 'not-allowed', 
              opacity: isSorted ? 1 : 0.6,
              fontWeight: 500, fontSize: '0.8rem', 
              boxShadow: isSorted ? '0 1px 2px rgba(232,62,62,0.05)' : 'none', 
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}>
            <RotateCcw size={14} /> Reset Sorts
          </button>
          <button 
            title={isFiltered ? "Clear all active filters" : "No filters currently active"}
            onClick={clearFilters} 
            disabled={!isFiltered}
            onMouseOver={(e) => { if (isFiltered) e.currentTarget.style.background = '#fef2f2'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'white'; }}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', 
              padding: '0.4rem 0.75rem', borderRadius: '6px', 
              border: '1px solid #fecaca', background: 'white', 
              color: isFiltered ? '#e83e3e' : '#94a3b8', 
              cursor: isFiltered ? 'pointer' : 'not-allowed', 
              opacity: isFiltered ? 1 : 0.6,
              fontWeight: 500, fontSize: '0.8rem', 
              boxShadow: isFiltered ? '0 1px 2px rgba(232,62,62,0.05)' : 'none', 
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}>
            <XCircle size={14} /> Clear Filters
          </button>
        </div>
      </div>
      
      <div style={{ height: 600, width: '100%' }}>
        <AgGridReact 
          ref={gridRef} 
          rowData={data} 
          columnDefs={colDefs as any} 
          components={gridComponents}
          enableBrowserTooltips={true}
          enableCellTextSelection={true}
          suppressDragLeaveHidesColumns={true}
          theme={themeQuartz}
          isExternalFilterPresent={externalFilterPresent}
          doesExternalFilterPass={externalFilterPass}
          onFilterChanged={handleFilterChanged}
          onSortChanged={handleSortChanged}
          onColumnMoved={(e) => {
            if (e.source !== 'uiColumnMoved') return;
            localStorage.setItem('teikoDataOverviewCols', JSON.stringify(e.api.getColumnState()));
            setIsColsCustomized(true);
          }}
          onColumnResized={(e) => {
            if (!e.finished || e.source !== 'uiColumnResized') return;
            localStorage.setItem('teikoDataOverviewCols', JSON.stringify(e.api.getColumnState()));
            setIsColsCustomized(true);
          }}
          onFirstDataRendered={(e) => {
            // Restore column layout from localStorage
            const savedCols = localStorage.getItem('teikoDataOverviewCols');
            if (savedCols) {
              try {
                const cols = JSON.parse(savedCols);
                // Strip out sort so it doesn't conflict with URL sort state
                cols.forEach((c: any) => { delete c.sort; delete c.sortIndex; });
                e.api.applyColumnState({ state: cols, applyOrder: true });
              } catch (err) {}
            }
            
            // Restore sort state from URL
            const sortParam = getUrlParams().get('sort');
            if (sortParam === 'none') {
              e.api.applyColumnState({ defaultState: { sort: null } });
            } else if (sortParam) {
              const state = sortParam.split(',').map((s, i) => {
                const [colId, dir] = s.split('.');
                return { colId, sort: dir as 'asc' | 'desc', sortIndex: i };
              });
              e.api.applyColumnState({ state, defaultState: { sort: null } });
            }
            
            // Restore native filter state from URL
            const filterParam = getUrlParams().get('filters');
            if (filterParam) {
              try {
                const model = JSON.parse(decodeURIComponent(filterParam));
                e.api.setFilterModel(model);
              } catch (err) {}
            }
          }}
          pagination={true} 
          paginationPageSize={initialPageSize}
          paginationPageSizeSelector={[15, 50, 100, 1000]}
          onPaginationChanged={(e) => {
            const ps = e.api.paginationGetPageSize();
            updateUrl({ pageSize: ps === 15 ? null : String(ps) });
          }}
          overlayNoRowsTemplate="<div style='padding: 3rem; color: #64748b; font-size: 1.1rem; text-align: center;'><div style='font-size: 2rem; margin-bottom: 0.5rem;'>🔍</div>No matching records found.<br/><span style='font-size: 0.9rem;'>Try adjusting or clearing your filters.</span></div>"
          defaultColDef={defaultColDef}
          suppressRowHoverHighlight={true}
          suppressCellFocus={true}
          rowClassRules={rowClassRules}
        />
      </div>
    </motion.div>
  );
}
