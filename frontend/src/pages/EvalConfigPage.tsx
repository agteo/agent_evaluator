import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import Editor from 'react-simple-code-editor'
import Prism from 'prismjs'
import 'prismjs/themes/prism.css'
import 'prismjs/components/prism-markup-templating'
import 'prismjs/components/prism-twig'
import PageHeader from '../components/layout/PageHeader'
import LoadingState from '../components/layout/LoadingState'
import {
  useEvalConfig,
  useCreateEvalConfig,
  useUpdateEvalConfig,
  useDeleteEvalConfig,
  useTestSingleTrace,
} from '../hooks/useEvals'
import { useTraces } from '../hooks/useTraces'
import type { EvalConfigCreate, Criterion } from '../types'
import type { TestTraceResult } from '../api/evals'

const MODEL_OPTIONS: Record<string, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: [
    'claude-sonnet-4-20250514',
    'claude-3-5-haiku-20241022',
    'claude-3-haiku-20240307',
  ],
  ollama: ['llama3.1', 'mistral', 'mixtral'],
}

const DEFAULT_TEMPLATE = `You are an expert evaluator. Evaluate the following LLM trace based on the given criteria.

## Trace Input
{{ input }}

## Trace Output
{{ output }}

## Evaluation Criteria
{% for c in criteria %}
- **{{ c.name }}** (weight {{ c.weight }}): {{ c.description }}
{% endfor %}

## Scoring
Rate each criterion on a scale of {{ trace.scale_min|default(1) }} to {{ trace.scale_max|default(5) }}.

Respond with ONLY a JSON object in this format:
{
  "criteria_scores": {
    "<criterion_name>": { "score": <number>, "reasoning": "<brief explanation>" }
  },
  "overall_score": <number>,
  "reasoning": "<overall assessment>"
}`

interface FormData {
  name: string
  description: string
  provider: string
  model: string
  temperature: number
  prompt_template: string
  criteria: Criterion[]
  scoring_type: string
  scale_min: number
  scale_max: number
}

export default function EvalConfigPage() {
  const { configId } = useParams()
  const navigate = useNavigate()
  const isNew = configId === 'new'
  const numericId = isNew ? undefined : Number(configId)

  const { data: existing, isLoading } = useEvalConfig(numericId)
  const createMutation = useCreateEvalConfig()
  const updateMutation = useUpdateEvalConfig()
  const deleteMutation = useDeleteEvalConfig()
  const testMutation = useTestSingleTrace()

  // Test trace state
  const [showTestPanel, setShowTestPanel] = useState(false)
  const [selectedTraceId, setSelectedTraceId] = useState('')
  const [testResult, setTestResult] = useState<TestTraceResult | null>(null)
  const { data: tracesData } = useTraces({ limit: 100 })

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: '',
      description: '',
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0,
      prompt_template: DEFAULT_TEMPLATE,
      criteria: [{ name: '', description: '', weight: 1.0 }],
      scoring_type: 'numeric',
      scale_min: 1,
      scale_max: 5,
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'criteria' })
  const provider = watch('provider')
  const promptTemplate = watch('prompt_template')

  // Populate form when editing
  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        description: existing.description || '',
        provider: existing.provider,
        model: existing.model,
        temperature: existing.temperature,
        prompt_template: existing.prompt_template,
        criteria: existing.criteria as Criterion[],
        scoring_type: existing.scoring_type,
        scale_min: existing.scale_min,
        scale_max: existing.scale_max,
      })
    }
  }, [existing, reset])

  // Reset model when provider changes (only in new mode or user-initiated)
  useEffect(() => {
    const models = MODEL_OPTIONS[provider] || []
    if (models.length > 0 && !models.includes(watch('model'))) {
      setValue('model', models[0])
    }
  }, [provider, setValue, watch])

  const onSubmit = async (data: FormData) => {
    const payload: EvalConfigCreate = {
      ...data,
      temperature: Number(data.temperature),
      scale_min: Number(data.scale_min),
      scale_max: Number(data.scale_max),
      criteria: data.criteria.map((c) => ({
        ...c,
        weight: Number(c.weight),
      })),
    }

    if (isNew) {
      await createMutation.mutateAsync(payload)
    } else {
      await updateMutation.mutateAsync({ configId: numericId!, data: payload })
    }
    navigate('/evals')
  }

  const handleDelete = () => {
    if (numericId && confirm('Delete this eval config?')) {
      deleteMutation.mutate(numericId, { onSuccess: () => navigate('/evals') })
    }
  }

  if (!isNew && isLoading) {
    return <LoadingState rows={4} />
  }

  return (
    <div className="space-y-6">
      <PageHeader title={isNew ? 'New Eval Config' : `Edit: ${existing?.name ?? ''}`}>
        <button
          onClick={() => navigate('/evals')}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        {!isNew && (
          <button
            onClick={handleDelete}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete
          </button>
        )}
      </PageHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Basic Info</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              {...register('name', { required: true })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="e.g. Helpfulness Rubric v1"
            />
            {errors.name && <p className="text-red-600 text-xs mt-1">Name is required</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              {...register('description')}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="Optional description of this evaluation config"
            />
          </div>
        </section>

        {/* Model / Provider */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Model</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
              <select
                {...register('provider')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="ollama">Ollama</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <select
                {...register('model')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                {(MODEL_OPTIONS[provider] || []).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="2"
                {...register('temperature', { valueAsNumber: true })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* Criteria */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Criteria</h2>
            <button
              type="button"
              onClick={() => append({ name: '', description: '', weight: 1.0 })}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              + Add Criterion
            </button>
          </div>
          {fields.length === 0 && (
            <p className="text-sm text-gray-500">No criteria added yet.</p>
          )}
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="border border-gray-200 rounded-md p-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Name
                  </label>
                  <input
                    {...register(`criteria.${index}.name`, { required: true })}
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. Helpfulness"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Weight
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    {...register(`criteria.${index}.weight`, { valueAsNumber: true })}
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="mt-5 text-red-500 hover:text-red-700 text-sm"
                  title="Remove criterion"
                >
                  Remove
                </button>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Description
                </label>
                <textarea
                  {...register(`criteria.${index}.description`, { required: true })}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  placeholder="Describe what this criterion evaluates"
                />
              </div>
            </div>
          ))}
        </section>

        {/* Scoring */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Scoring</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                {...register('scoring_type')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="numeric">Numeric</option>
                <option value="boolean">Boolean</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Score</label>
              <input
                type="number"
                step="0.5"
                {...register('scale_min', { valueAsNumber: true })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Score</label>
              <input
                type="number"
                step="0.5"
                {...register('scale_max', { valueAsNumber: true })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* Prompt Template */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Prompt Template</h2>
          <div className="border border-gray-300 rounded-md overflow-hidden">
            <Editor
              value={promptTemplate}
              onValueChange={(code) => setValue('prompt_template', code)}
              highlight={(code) =>
                Prism.highlight(code, Prism.languages.twig || Prism.languages.markup, 'twig')
              }
              padding={16}
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 13,
                minHeight: 200,
                backgroundColor: '#fafafa',
              }}
            />
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <p className="font-medium">Available template variables:</p>
            <div className="grid grid-cols-2 gap-x-4 font-mono">
              <span>{'{{ input }}'} - Trace input (formatted)</span>
              <span>{'{{ output }}'} - Trace output (formatted)</span>
              <span>{'{{ metadata }}'} - Trace metadata</span>
              <span>{'{{ criteria }}'} - List of criteria objects</span>
              <span>{'{{ trace.id }}'} - Trace ID</span>
              <span>{'{{ trace.name }}'} - Trace name</span>
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/evals')}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending || updateMutation.isPending
              ? 'Saving...'
              : isNew
                ? 'Create Config'
                : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Test Single Trace - edit mode only */}
      {!isNew && numericId && (
        <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Test Single Trace</h2>
            <button
              type="button"
              onClick={() => {
                setShowTestPanel(!showTestPanel)
                if (showTestPanel) {
                  setTestResult(null)
                  testMutation.reset()
                }
              }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {showTestPanel ? 'Hide' : 'Test a Trace'}
            </button>
          </div>

          {showTestPanel && (
            <div className="space-y-4">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Trace
                  </label>
                  <select
                    value={selectedTraceId}
                    onChange={(e) => setSelectedTraceId(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Choose a trace...</option>
                    {tracesData?.items?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name || t.id.slice(0, 24)} {t.tags?.length ? `[${t.tags.join(', ')}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={!selectedTraceId || testMutation.isPending}
                  onClick={() => {
                    setTestResult(null)
                    testMutation.mutate(
                      { configId: numericId, traceId: selectedTraceId },
                      { onSuccess: (data) => setTestResult(data) },
                    )
                  }}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {testMutation.isPending ? 'Evaluating...' : 'Run Test'}
                </button>
              </div>

              {tracesData?.total === 0 && (
                <p className="text-sm text-gray-500">
                  No traces imported yet. Import traces first from the Traces page.
                </p>
              )}

              {testMutation.isError && (
                <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                  {(testMutation.error as Error)?.message || 'Test evaluation failed'}
                </div>
              )}

              {testResult && (
                <div className="space-y-3 border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-sm text-gray-500">Overall Score:</span>{' '}
                      <span className="text-lg font-semibold">
                        {testResult.overall_score != null ? testResult.overall_score.toFixed(2) : 'N/A'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {testResult.tokens_used} tokens | {(testResult.latency_ms / 1000).toFixed(1)}s
                    </div>
                  </div>

                  {testResult.criteria_scores && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Criteria Scores</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {Object.entries(testResult.criteria_scores).map(([name, val]) => (
                          <div key={name} className="bg-gray-50 border border-gray-200 rounded px-3 py-2">
                            <span className="text-xs text-gray-500">{name}</span>
                            <div className="font-medium">
                              {typeof val === 'object' && val !== null && 'score' in val
                                ? val.score
                                : String(val)}
                            </div>
                            {typeof val === 'object' && val !== null && 'reasoning' in val && (
                              <p className="text-xs text-gray-500 mt-1">{val.reasoning}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {testResult.reasoning && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Reasoning</p>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{testResult.reasoning}</p>
                    </div>
                  )}

                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                      Raw LLM Response
                    </summary>
                    <pre className="mt-2 bg-gray-50 rounded p-3 overflow-auto max-h-48 text-xs">
                      {testResult.raw_response}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
