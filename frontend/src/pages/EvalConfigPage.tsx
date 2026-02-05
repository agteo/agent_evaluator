import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import Editor from 'react-simple-code-editor'
import Prism from 'prismjs'
import 'prismjs/themes/prism.css'
import 'prismjs/components/prism-markup-templating'
import 'prismjs/components/prism-twig'
import PageHeader from '../components/layout/PageHeader'
import {
  useEvalConfig,
  useCreateEvalConfig,
  useUpdateEvalConfig,
  useDeleteEvalConfig,
} from '../hooks/useEvals'
import type { EvalConfigCreate, Criterion } from '../types'

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
    return <div className="text-center py-8 text-gray-500">Loading config...</div>
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
    </div>
  )
}
