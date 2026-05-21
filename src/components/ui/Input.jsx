export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-navy-600">{label}</label>
      )}
      <input
        className={`border rounded-lg px-3 py-2 text-sm text-navy-600 placeholder:text-[#8a9ab0] focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors
          ${error ? 'border-red-400 bg-red-50' : 'border-[#e2e6ea] bg-white hover:border-navy-300'} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
