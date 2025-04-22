import { SpeedInsights } from "@vercel/speed-insights/react"
import Layout from './components/layout/Layout';
import SourceEditor from './components/editor/SourceEditor';
import XPathInput from './components/xpath/XPathInput';
import ResultsPanel from './components/results/ResultsPanel';
import './App.css';

function App() {
  return (
    <Layout>
      <div className="w-full h-full app-container">
        <div className="grid h-full w-full grid-cols-2 grid-rows-[auto_1fr] gap-6 rounded-3xl bg-card p-4 shadow-xl">
          <XPathInput />
          <div className="col-start-2 row-span-2 row-start-1 flex flex-col rounded-2xl p-6 shadow-md results-container">
            <h2 className="mb-4 text-xl font-bold text-foreground flex-shrink-0">Evaluation Result</h2>
            <div className="flex-1 min-h-0">
              <ResultsPanel />
            </div>
          </div>
          <SourceEditor />
        </div>
      </div>
      <SpeedInsights />
    </Layout>
  );
}

export default App;
