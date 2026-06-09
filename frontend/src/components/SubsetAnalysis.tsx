import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TestTubes, Users, FlaskConical, Activity, Database, ArrowDown, Filter, Calculator, Info } from 'lucide-react';
import { fetchJSON } from '../utils/shared';

type FlowStep = {
  type: 'source' | 'filter' | 'calculate';
  label: string;
  criteria?: string[]; // Used specifically to group multiple filter criteria into a single node
};

const PROVENANCE_DATA: Record<string, { title: string, explanation: string, steps: FlowStep[] }> = {
  cohort: {
    title: 'Base Clinical Cohort',
    explanation: 'The baseline clinical cohort used for the Projects, Clinical Response, and Demographics analyses. These filters are applied universally before grouping.',
    steps: [
      { type: 'source', label: 'Load all Subjects and Samples' },
      { type: 'filter', label: 'Apply Strict Clinical Filters', criteria: ['Condition = Melanoma', 'Treatment = Miraclib', 'Sample Type = PBMC', 'Time = 0 (Baseline)'] }
    ]
  },
  metric: {
    title: 'Critical Specific Metric',
    explanation: 'Calculates the average absolute B Cell count specifically for Male subjects with Melanoma who responded favorably (Response=yes) to Miraclib at Baseline (time=0).',
    steps: [
      { type: 'source', label: 'Load all Subjects, Samples, and Cell Counts' },
      { type: 'filter', label: 'Apply Strict Clinical Filters', criteria: ['Condition = Melanoma', 'Treatment = Miraclib', 'Sample Type = PBMC', 'Time = 0 (Baseline)', 'Sex = M (Male)', 'Response = YES', 'Cell Type = B Cell'] },
      { type: 'calculate', label: 'Calculate Average Absolute Cell Count' }
    ]
  }
};

const STEP_STYLES = {
  source: { bg: '#f0f9ff', border: '#bae6fd', color: '#0369a1', icon: <Database size={16} /> },
  filter: { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c', icon: <Filter size={16} /> },
  calculate: { bg: '#faf5ff', border: '#e9d5ff', color: '#7e22ce', icon: <Calculator size={16} /> }
};

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

export default function SubsetAnalysis() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMetadata, setSelectedMetadataState] = useState<string | null>(() => getUrlParams().get('subsetMeta'));

  const setSelectedMetadata = (meta: string | null) => {
    setSelectedMetadataState(meta);
    updateUrl({ subsetMeta: meta });
  };

  useEffect(() => {
    fetchJSON('/subset-analysis').then(res => {
      setData(res);
      setLoading(false);
    }).catch(console.error);
  }, []);

  if (loading) return (
    <div className="kpi-grid">
      {[1,2,3,4].map(i => <div key={i} className="skeleton kpi-card" style={{height: '150px'}}></div>)}
    </div>
  );

  const activeMetadata = selectedMetadata ? PROVENANCE_DATA[selectedMetadata] : null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button 
          onClick={() => setSelectedMetadata('cohort')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'transparent', border: 'none', color: '#64748b',
            cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
            transition: 'color 0.2s ease', padding: 0
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#0ea5e9'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; }}
          title="View Base Cohort Methodology"
        >
          <Info size={16} style={{ marginTop: '-1px', color: '#0ea5e9' }} />
          <span>Cohort Methodology</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginBottom: '2rem' }}>
        
        {/* Projects Master Card */}
        <motion.div 
          className="kpi-card" 
          style={{ padding: '1.5rem' }} 
          initial={{opacity:0, y:20}} 
          animate={{opacity:1, y:0}} 
          transition={{delay: 0.1}}
        >
          <div className="kpi-header" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', fontWeight: 600 }}>Projects</span>
            <TestTubes className="kpi-icon" size={18} style={{ padding: '6px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {data.project_samples.map((row: any, i: number) => (
              <div key={`prj-${i}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.95rem', color: '#334155', fontWeight: 600 }}>Project {row.project_id}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>PBMC Samples</div>
                </div>
                <h1 style={{ fontSize: '1.5rem', margin: 0, color: '#0f172a' }}>{row.num_samples.toLocaleString()}</h1>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Clinical Response Master Card */}
        <motion.div 
          className="kpi-card" 
          style={{ padding: '1.5rem' }} 
          initial={{opacity:0, y:20}} 
          animate={{opacity:1, y:0}} 
          transition={{delay: 0.2}}
        >
          <div className="kpi-header" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', fontWeight: 600 }}>Clinical Response</span>
            <Users className="kpi-icon" style={{color: '#a855f7', background: 'rgba(168, 85, 247, 0.1)', padding: '6px'}} size={18} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {data.responders.map((row: any, i: number) => (
              <div key={`resp-${i}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.95rem', color: '#334155', fontWeight: 600 }}>Response: {row.response.toUpperCase()}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total Subjects</div>
                </div>
                <h1 style={{ fontSize: '1.5rem', margin: 0, color: '#0f172a' }}>{row.num_subjects.toLocaleString()}</h1>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Demographics Master Card */}
        <motion.div 
          className="kpi-card" 
          style={{ padding: '1.5rem' }} 
          initial={{opacity:0, y:20}} 
          animate={{opacity:1, y:0}} 
          transition={{delay: 0.3}}
        >
          <div className="kpi-header" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', fontWeight: 600 }}>Demographics</span>
            <FlaskConical className="kpi-icon" style={{color: '#f43f5e', background: 'rgba(244, 63, 94, 0.1)', padding: '6px'}} size={18} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {data.gender.map((row: any, i: number) => (
              <div key={`gen-${i}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.95rem', color: '#334155', fontWeight: 600 }}>Gender: {row.sex}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total Subjects</div>
                </div>
                <h1 style={{ fontSize: '1.5rem', margin: 0, color: '#0f172a' }}>{row.num_subjects.toLocaleString()}</h1>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div 
        className="kpi-card" 
        style={{ 
          background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)', 
          borderColor: '#e0f2fe', 
          padding: '3.5rem 2rem'
        }} 
        initial={{opacity:0, scale:0.95}} 
        animate={{opacity:1, scale:1}} 
        transition={{delay: 0.5}}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
            <Activity style={{color: '#e83e3e'}} size={24} />
            <span style={{ fontSize: '1.1rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Critical Specific Metric</span>
          </div>
          
          <p style={{ margin: '0 0 1rem 0', color: '#334155', fontSize: '1.4rem', maxWidth: '700px', lineHeight: '1.6' }}>
            Avg B Cell Count for <strong>Male Responders</strong> with <strong>Melanoma</strong> at <strong>Baseline</strong>
          </p>
          <h1 style={{ 
            fontSize: '6.5rem', 
            margin: 0, 
            background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent', 
            lineHeight: 1,
            letterSpacing: '-0.02em',
            filter: 'drop-shadow(0 4px 6px rgba(14, 165, 233, 0.15))'
          }}>
            {Number(data.avg_b_cells).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </h1>
          
          <button 
            onClick={() => setSelectedMetadata('metric')}
            style={{
              marginTop: '2.5rem',
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'transparent', border: 'none', color: '#64748b',
              cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
              transition: 'color 0.2s ease', padding: 0
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#0ea5e9'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; }}
            title="View Specific Metric Methodology"
          >
            <Info size={16} style={{ marginTop: '-1px', color: '#0ea5e9' }} />
            <span>Metric Methodology</span>
          </button>
        </div>
      </motion.div>

      {/* Provenance Metadata Modal */}
      <AnimatePresence>
        {activeMetadata && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMetadata(null)}
          >
            <motion.div 
              className="modal-content"
              style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="modal-close" onClick={() => setSelectedMetadata(null)}>✕</button>
              
              <h2 style={{margin: '0 0 1rem 0', color: '#0f172a', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px'}}>
                Data Flow
                <span style={{ display: 'inline-block', width: '2px', height: '24px', backgroundColor: '#e2e8f0' }}></span>
                <span style={{ fontSize: '1.2rem', color: '#64748b', fontWeight: 500 }}>{activeMetadata.title}</span>
              </h2>

              <div style={{ color: '#1e293b', fontSize: '0.95rem', lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 2rem 0' }}>
                  {activeMetadata.explanation}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem 0' }}>
                  {activeMetadata.steps.map((step, index) => (
                    <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '400px' }}>
                      {/* Step Card */}
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + index * 0.05 }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          background: STEP_STYLES[step.type].bg,
                          border: `1px solid ${STEP_STYLES[step.type].border}`,
                          padding: '1rem 1.25rem',
                          borderRadius: '12px',
                          width: '100%',
                          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ color: STEP_STYLES[step.type].color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {STEP_STYLES[step.type].icon}
                          </div>
                          <span style={{ color: '#1e293b', fontWeight: 600, fontSize: '0.95rem' }}>
                            {step.label}
                          </span>
                        </div>
                        
                        {/* Nested Criteria for grouping multiple filters */}
                        {step.criteria && step.criteria.length > 0 && (
                          <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {step.criteria.map((c, i) => (
                              <span key={i} style={{ 
                                background: '#ffffff', 
                                border: `1px solid ${STEP_STYLES[step.type].border}`, 
                                color: STEP_STYLES[step.type].color, 
                                fontSize: '0.75rem', 
                                padding: '2px 8px', 
                                borderRadius: '12px',
                                fontWeight: 500
                              }}>
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </motion.div>
                      
                      {/* Connection Arrow */}
                      {index < activeMetadata.steps.length - 1 && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.15 + index * 0.05 }}
                          style={{ margin: '12px 0', color: '#cbd5e1' }}
                        >
                          <ArrowDown size={24} />
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>

              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
