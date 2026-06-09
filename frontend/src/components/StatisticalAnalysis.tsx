import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Maximize2, ChevronDown, ChevronUp } from 'lucide-react';
// @ts-ignore
import Plotly from 'plotly.js-dist-min';
// @ts-ignore
import createPlotlyComponent from 'react-plotly.js/factory';
import { 
  fetchJSON, 
  formatPop, 
  getPopColor, 
  PopBadge, 
  formatPValue, 
  getBoxStats 
} from '../utils/shared';

const factory = typeof createPlotlyComponent === 'function' ? createPlotlyComponent : createPlotlyComponent.default;
const Plot = factory(Plotly);

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

export default function StatisticalAnalysis() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedPop, setSelectedPopState] = useState<string | null>(() => getUrlParams().get('statPop'));
  const [inspectPopId, setInspectPopId] = useState<string | null>(() => getUrlParams().get('statInspect'));
  const [showStats, setShowStatsState] = useState<boolean>(() => getUrlParams().get('statShowStats') === 'true');

  const setSelectedPop = (pop: string | null) => {
    setSelectedPopState(pop);
    setShowStatsState(false);
    updateUrl({ statPop: pop, statShowStats: null });
  };

  const setInspectPop = (row: any | null) => {
    setInspectPopId(row ? row.population : null);
    updateUrl({ statInspect: row ? row.population : null });
  };

  const setShowStats = (show: boolean) => {
    setShowStatsState(show);
    updateUrl({ statShowStats: show ? 'true' : null });
  };

  useEffect(() => {
    fetchJSON('/statistics').then(res => {
      setData(res);
      setLoading(false);
    }).catch(console.error);
  }, []);

  if (loading) return (
    <div className="card">
      <div className="skeleton" style={{height: '400px', width: '100%'}}></div>
    </div>
  );

  const { results, boxplot_data } = data;
  const inspectPop = results.find((r: any) => r.population === inspectPopId) || null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th title="The specific immune cell population being compared between responders and non-responders." style={{ cursor: 'help' }}>
                  Population
                </th>
                <th title="Dynamically selected based on Shapiro-Wilk normality (with optional Arcsine transformation) and Levene's variance tests." style={{ cursor: 'help' }}>
                  Test Executed
                </th>
                <th title="Null hypothesis rejected (statistically significant) if P-Value < 0.05." style={{ cursor: 'help' }}>
                  P-Value
                </th>
                <th title="Yes if P-Value is less than 0.05, indicating a significant difference in cell counts." style={{ cursor: 'help' }}>
                  Significant Difference?
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((row: any, i: number) => {
                const isSelected = selectedPop === row.population;
                return (
                  <tr 
                    key={i} 
                    className="interactive-row"
                    onClick={() => {
                      if (window.getSelection()?.toString().length) return;
                      setSelectedPop(isSelected ? null : row.population);
                    }}
                    title="Click to expand chart"
                    style={{ 
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(241, 245, 249, 0.8)' : '',
                      borderLeft: isSelected ? `4px solid ${getPopColor(row.population)}` : '4px solid transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <td><PopBadge pop={row.population} /></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ display: 'inline-block', transform: 'translateY(1px)' }}>{row.test_used}</span>
                        <button 
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'inline-flex', alignItems: 'center', padding: 0 }}
                          onClick={(e) => { e.stopPropagation(); setInspectPop(row); }}
                          title="Inspect Statistical Assumptions"
                        >
                          <Info size={16} />
                        </button>
                      </div>
                    </td>
                    <td>{formatPValue(row.p_value)}</td>
                    <td>
                      {row.significant 
                        ? <span style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '9999px', backgroundColor: '#dcfce7', color: '#166534', fontWeight: 600, fontSize: '0.85rem' }}>YES</span> 
                        : <span style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '9999px', backgroundColor: '#f1f5f9', color: '#64748b', fontWeight: 500, fontSize: '0.85rem' }}>NO</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1.5rem', maxWidth: '1200px', margin: '0 auto'}}>
        {Object.keys(boxplot_data).map((pop, i) => (
          <motion.div 
            key={pop} 
            className="card clickable-card" 
            style={{marginBottom: 0, padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', position: 'relative'}}
            onClick={() => setSelectedPop(pop)}
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.2, delay: i * 0.1 }}
            title="Click to expand chart"
          >
            <div 
              className="expand-icon"
              style={{ position: 'absolute', top: '12px', right: '12px', color: '#94a3b8', display: 'flex' }}
            >
              <Maximize2 size={18} />
            </div>
            <div style={{margin: '0 0 1rem 0', fontSize: '1.17em'}}><PopBadge pop={pop} /></div>
            <div style={{ pointerEvents: 'none' }}>
              <Plot
                data={[
                  {
                    y: boxplot_data[pop].responders,
                    type: 'box',
                    name: 'Responders',
                    marker: {color: getPopColor(pop)},
                    boxpoints: 'outliers',
                    jitter: 0,
                    pointpos: 0,
                    hoverinfo: 'none'
                  },
                  {
                    y: boxplot_data[pop].non_responders,
                    type: 'box',
                    name: 'Non-Responders',
                    marker: {color: getPopColor(pop)},
                    boxpoints: 'outliers',
                    jitter: 0,
                    pointpos: 0,
                    hoverinfo: 'none'
                  }
                ]}
                layout={{
                  width: 320, 
                  height: 300, 
                  paper_bgcolor: 'rgba(0,0,0,0)', 
                  plot_bgcolor: 'rgba(0,0,0,0)',
                  font: { color: '#334155' },
                  margin: {t: 10, b: 30, l: 40, r: 10},
                  showlegend: false,
                  hovermode: false
                }}
                config={{staticPlot: true, responsive: true, showTips: false}}
              />
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedPop && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPop(null)}
          >
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="modal-close" onClick={() => setSelectedPop(null)}>✕</button>
              <h2 style={{margin: '0 0 1.5rem 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', color: '#0f172a', fontSize: '1.8rem'}}>
                <span style={{ display: 'inline-block', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: getPopColor(selectedPop) }}></span>
                <span>{formatPop(selectedPop)}</span> Distribution
              </h2>
              <div 
                style={{display: 'flex', justifyContent: 'center'}}
                title="Pinch to zoom in. Double click to zoom out (to full)."
              >
                <Plot
                  data={[
                    {
                      y: boxplot_data[selectedPop].responders,
                      type: 'box',
                      name: 'Responders',
                      marker: {color: getPopColor(selectedPop)},
                      boxpoints: 'outliers',
                      jitter: 0,
                      pointpos: 0,
                      hoverinfo: 'none'
                    },
                    {
                      y: boxplot_data[selectedPop].non_responders,
                      type: 'box',
                      name: 'Non-Responders',
                      marker: {color: getPopColor(selectedPop)},
                      boxpoints: 'outliers',
                      jitter: 0,
                      pointpos: 0,
                      hoverinfo: 'none'
                    }
                  ]}
                  layout={{
                    width: 700, 
                    height: 500, 
                    paper_bgcolor: 'rgba(0,0,0,0)', 
                    plot_bgcolor: 'rgba(0,0,0,0)',
                    font: { color: '#334155' },
                    margin: {t: 10, b: 30, l: 40, r: 10},
                    showlegend: false,
                    yaxis: { hoverformat: '.2f' },
                    hoverlabel: {
                      bgcolor: '#0f172a',
                      bordercolor: '#0f172a',
                      font: { color: '#f8fafc', size: 13, family: 'Inter, system-ui, sans-serif' }
                    }
                  }}
                  config={{displayModeBar: false, responsive: true, showTips: false}}
                />
              </div>
              
              {/* Summary Statistics Table */}
              <div style={{ marginTop: '1rem', padding: '0 2rem' }}>
                <button 
                  onClick={() => setShowStats(!showStats)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    background: 'none', 
                    border: 'none', 
                    color: '#334155', 
                    fontSize: '1rem', 
                    fontWeight: 600, 
                    cursor: 'pointer', 
                    padding: '0.5rem 0',
                    borderBottom: '1px solid #e2e8f0',
                    width: '100%',
                    textAlign: 'left'
                  }}
                >
                  {showStats ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  Summary Statistics
                </button>
                
                <AnimatePresence>
                  {showStats && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1rem' }}>
                        {[
                          { name: 'Responders', stats: getBoxStats(boxplot_data[selectedPop].responders) },
                          { name: 'Non-Responders', stats: getBoxStats(boxplot_data[selectedPop].non_responders) }
                        ].map(group => (
                          <div key={group.name} style={{ background: '#f8fafc', borderRadius: '8px', padding: '1rem', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {group.name}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', fontSize: '0.9rem', color: '#475569' }}>
                              <div>Upper Fence</div><div style={{fontWeight: 500}}>{group.stats?.upperFence.toFixed(2)}</div>
                              <div>Q3</div><div style={{fontWeight: 500}}>{group.stats?.q3.toFixed(2)}</div>
                              <div style={{fontWeight: 600, color: '#0f172a'}}>Median</div><div style={{fontWeight: 600, color: '#0f172a'}}>{group.stats?.median.toFixed(2)}</div>
                              <div>Q1</div><div style={{fontWeight: 500}}>{group.stats?.q1.toFixed(2)}</div>
                              <div>Lower Fence</div><div style={{fontWeight: 500}}>{group.stats?.lowerFence.toFixed(2)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {inspectPop && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setInspectPop(null)}
          >
            <motion.div 
              className="modal-content"
              style={{ maxWidth: '600px' }}
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="modal-close" onClick={() => setInspectPop(null)}>✕</button>
              <h2 style={{margin: '0 0 1rem 0', color: '#0f172a', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px'}}>
                Diagnostic Info
                <span style={{ display: 'inline-block', width: '2px', height: '24px', backgroundColor: '#e2e8f0' }}></span>
                <PopBadge pop={inspectPop.population} />
              </h2>
              <div style={{ color: '#1e293b', fontSize: '0.95rem', lineHeight: 1.6 }}>
                {(() => {
                  if (!inspectPop.diagnostics) return <p>No diagnostic data available.</p>;
                  try {
                    const diag = JSON.parse(inspectPop.diagnostics);
                    if (diag.error) return <p style={{color: '#f43f5e'}}>Error: {diag.error}</p>;
                    
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <h4 style={{ margin: '0 0 0.5rem 0', color: '#334155', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            Step 1: Normality Test (Raw Data)
                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal' }}>(Shapiro-Wilk)</span>
                          </h4>
                          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#64748b' }}>
                            <em>Checks if the data follows a bell curve. P &gt; 0.05 means the data is normally distributed.</em>
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                            <div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Responders</div>
                              <div style={{ fontWeight: 500, color: diag.shapiro_raw_res_p > 0.05 ? '#10b981' : '#f43f5e' }}>
                                P = {formatPValue(diag.shapiro_raw_res_p)}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Non-Responders</div>
                              <div style={{ fontWeight: 500, color: diag.shapiro_raw_non_p > 0.05 ? '#10b981' : '#f43f5e' }}>
                                P = {formatPValue(diag.shapiro_raw_non_p)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {diag.shapiro_trans_res_p !== null && (
                          <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: '#334155', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                              Step 2: Normality Test (Arcsine Transformed)
                              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal' }}>(Shapiro-Wilk)</span>
                            </h4>
                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#64748b' }}>
                              <em>Raw data was not normal, so an arcsine transformation was applied. P &gt; 0.05 means the transformed data is normal.</em>
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                              <div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Responders</div>
                                <div style={{ fontWeight: 500, color: diag.shapiro_trans_res_p > 0.05 ? '#10b981' : '#f43f5e' }}>
                                  P = {formatPValue(diag.shapiro_trans_res_p)}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Non-Responders</div>
                                <div style={{ fontWeight: 500, color: diag.shapiro_trans_non_p > 0.05 ? '#10b981' : '#f43f5e' }}>
                                  P = {formatPValue(diag.shapiro_trans_non_p)}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {diag.levene_p !== null && (
                          <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: '#334155', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                              Step 3: Variance Check
                              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal' }}>(Levene's Test)</span>
                            </h4>
                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#64748b' }}>
                              <em>Checks if both groups have similar spread/variance. P &gt; 0.05 means variances are equal.</em>
                            </p>
                            <div>
                              <div style={{ fontWeight: 500, color: diag.levene_p > 0.05 ? '#10b981' : '#f43f5e' }}>
                                P = {formatPValue(diag.levene_p)}
                              </div>
                            </div>
                          </div>
                        )}

                        <div style={{ background: '#fef2f2', padding: '1rem', borderRadius: '8px', border: '1px solid #fecaca' }}>
                          <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e3a8a' }}>Final Test Selected</h4>
                          <p style={{ margin: 0, fontWeight: 600, color: '#38bdf8' }}>
                            {inspectPop.test_used}
                          </p>
                        </div>
                      </div>
                    );
                  } catch(e) {
                    return <p>Failed to parse diagnostics.</p>;
                  }
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
