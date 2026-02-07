interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
}

export default function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-6 min-w-0">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-900 break-words">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500 break-words">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  )
}
