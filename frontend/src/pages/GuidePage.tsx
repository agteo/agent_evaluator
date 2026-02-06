import { Link } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </section>
  )
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
      {steps.map((step, i) => (
        <li key={i}>{step}</li>
      ))}
    </ol>
  )
}

function InlineLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="text-blue-600 hover:text-blue-800 underline">
      {children}
    </Link>
  )
}

export default function GuidePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="User Guide"
        description="Learn how to use the Evaluator platform to assess your LLM traces"
      />

      {/* Overview */}
      <Section title="Getting Started">
        <p className="text-sm text-gray-700 mb-4">
          Evaluator is a platform for running LLM-as-judge evaluations on Langfuse trace exports. The typical workflow has four steps:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { step: '1', label: 'Import Traces', desc: 'Upload Langfuse JSON/JSONL exports', to: '/' },
            { step: '2', label: 'Configure Evaluations', desc: 'Define rubrics, criteria, and scoring', to: '/evals' },
            { step: '3', label: 'Run Evaluations', desc: 'Execute eval configs against your traces', to: '/runs' },
            { step: '4', label: 'Analyze Results', desc: 'View scores, distributions, and comparisons', to: '/runs' },
          ].map(({ step, label, desc, to }) => (
            <Link
              key={step}
              to={to}
              className="block rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="text-xs font-bold text-blue-600 mb-1">Step {step}</div>
              <div className="text-sm font-medium text-gray-900">{label}</div>
              <div className="text-xs text-gray-500 mt-1">{desc}</div>
            </Link>
          ))}
        </div>
      </Section>

      {/* Importing Traces */}
      <Section title="Importing Traces">
        <p className="text-sm text-gray-700 mb-3">
          Traces are the foundation of every evaluation. Import them from Langfuse exports on the{' '}
          <InlineLink to="/">Traces page</InlineLink>.
        </p>
        <StepList
          steps={[
            'Export your traces from Langfuse as a JSON or JSONL file.',
            'Go to the Traces page and drag-and-drop the file onto the upload area (or click to browse).',
            'The platform parses each trace and stores it for evaluation.',
            'Browse imported traces in the table — you can search, sort, and click any trace to inspect its full data.',
          ]}
        />
      </Section>

      {/* Creating Eval Configs */}
      <Section title="Creating Eval Configs">
        <p className="text-sm text-gray-700 mb-3">
          An Eval Config defines <em>how</em> the LLM judge evaluates a trace. Create and manage them on the{' '}
          <InlineLink to="/evals">Eval Configs page</InlineLink>.
        </p>
        <StepList
          steps={[
            'Click "New Eval Config" and give it a descriptive name.',
            'Add one or more criteria — each criterion has a name and description that tells the judge what to assess (e.g., "Relevance", "Accuracy").',
            'Write a prompt template using Jinja2 syntax. Use variables like {{ input }} and {{ output }} which will be filled from trace data at evaluation time.',
            'Choose an LLM provider (OpenAI, Anthropic, or Ollama) and model.',
            'Set the scoring scale (e.g., 1–5) for the judge\'s numeric ratings.',
            'Save the config. You can use "Test with Single Trace" to preview how the judge scores a real trace before running a full evaluation.',
          ]}
        />
        <p className="text-sm text-gray-500 mt-3">
          Tip: Use the syntax-highlighted template editor to write and preview your prompt templates.
        </p>
      </Section>

      {/* Running Evaluations */}
      <Section title="Running Evaluations">
        <p className="text-sm text-gray-700 mb-3">
          Runs execute an Eval Config against a set of traces. Launch and monitor them from the{' '}
          <InlineLink to="/runs">Runs page</InlineLink>.
        </p>
        <StepList
          steps={[
            'Click "New Run" and select an Eval Config.',
            'Choose the traces to evaluate — either all imported traces or a specific dataset.',
            'Launch the run. The platform sends each trace to the LLM judge in the background with automatic concurrency control and retry logic.',
            'Monitor live progress on the Run Detail page — a progress bar updates every 2 seconds while the run is active.',
            'Once complete, review individual results in the expandable results table.',
          ]}
        />
      </Section>

      {/* Managing Datasets */}
      <Section title="Managing Datasets">
        <p className="text-sm text-gray-700 mb-3">
          Datasets let you organize traces into reusable groups for targeted evaluations. Manage them on the{' '}
          <InlineLink to="/datasets">Datasets page</InlineLink>.
        </p>
        <StepList
          steps={[
            'Create a new dataset with a name and optional description.',
            'Open the dataset and use the "Add Traces" panel to search and add traces.',
            'Remove traces you no longer need in the dataset.',
            'When launching a run, select a dataset to evaluate only the traces it contains instead of all traces.',
          ]}
        />
        <p className="text-sm text-gray-500 mt-3">
          Datasets are versioned — adding or removing traces automatically bumps the version number.
        </p>
      </Section>

      {/* Viewing Results */}
      <Section title="Viewing Results">
        <p className="text-sm text-gray-700 mb-3">
          After a run completes, the Run Detail page provides several ways to analyze the results:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
          <li><strong>Summary stats</strong> — average score, min, max, and standard deviation across all evaluated traces.</li>
          <li><strong>Score distribution</strong> — a histogram showing how scores are spread across the scale.</li>
          <li><strong>Criteria breakdown</strong> — a bar chart comparing average scores for each criterion.</li>
          <li><strong>Results table</strong> — expand any row to see the full judge reasoning and per-criterion scores.</li>
          <li><strong>Run comparison</strong> — compare aggregated results across multiple runs to track improvements.</li>
          <li><strong>Export</strong> — download results as CSV or JSON for further analysis.</li>
        </ul>
      </Section>
    </div>
  )
}
