import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  BarChart2, 
  Layers, 
  Activity
} from 'lucide-react';
import './index.css';

import DataOverview from './components/DataOverview';
import StatisticalAnalysis from './components/StatisticalAnalysis';
import SubsetAnalysis from './components/SubsetAnalysis';

import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
ModuleRegistry.registerModules([AllCommunityModule]);

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

export default function App() {
  const [activeTab, setActiveTabState] = useState(() => getUrlParams().get('tab') || 'overview');

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    updateUrl({ tab: tab === 'overview' ? null : tab });
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand">
          <Activity size={28} color="#e83e3e" />
          <h1>Teiko Analytics</h1>
        </div>

        <nav className="nav-menu">
          <button 
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Database /> Data Overview
          </button>
          <button 
            className={`nav-item ${activeTab === 'statistics' ? 'active' : ''}`}
            onClick={() => setActiveTab('statistics')}
          >
            <BarChart2 /> Statistical Analysis
          </button>
          <button 
            className={`nav-item ${activeTab === 'subsets' ? 'active' : ''}`}
            onClick={() => setActiveTab('subsets')}
          >
            <Layers /> Subset Analysis
          </button>
        </nav>

      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="page-header">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2>
              {activeTab === 'overview' && 'Data Overview'}
              {activeTab === 'statistics' && 'Statistical Analysis'}
              {activeTab === 'subsets' && 'Subset Analysis'}
            </h2>
            <p>
              {activeTab === 'overview' && 'Explore the raw cytometry data and relative frequencies.'}
              {activeTab === 'statistics' && 'Deep dive into biomarker predictability and significance.'}
              {activeTab === 'subsets' && 'Targeted analytics for early treatment effects.'}
            </p>
          </motion.div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && <DataOverview key="overview" />}
          {activeTab === 'statistics' && <StatisticalAnalysis key="stats" />}
          {activeTab === 'subsets' && <SubsetAnalysis key="subsets" />}
        </AnimatePresence>
      </main>
    </div>
  );
}
