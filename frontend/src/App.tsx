import Layout from './components/layout/Layout';
import SourceEditor from './components/editor/SourceEditor';
import XPathInput from './components/xpath/XPathInput';
import ResultsPanel from './components/results/ResultsPanel';
import './App.css';

function App() {
  return (
    <Layout>
      <div className="h-screen w-full p-6 bg-background">
        <div className="grid h-full w-full grid-cols-2 grid-rows-[auto_1fr] gap-6 rounded-2xl border border-muted/50 p-6 shadow-sm">
          <XPathInput />
          <div className="col-start-2 row-span-2 row-start-1 flex flex-col rounded-xl border border-muted p-4 overflow-auto">
            <h2 className="mb-2 text-base font-semibold">Evaluation result</h2>
            <ResultsPanel />

            <pre className="flex-1 whitespace-pre-wrap font-mono text-sm text-muted-foreground">{/* ...results here... */}</pre>
          </div>
          <SourceEditor />

        </div>

      </div>
    </Layout>
  );
}

export default App;
