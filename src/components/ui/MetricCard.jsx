export default function MetricCard({ label, value, sub, icon: Icon, trend }) {
  return (
    <div className="bg-white border border-[#e2e6ea] rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#8a9ab0] uppercase tracking-wide">{label}</span>
        {Icon && <Icon size={16} className="text-[#8a9ab0]" />}
      </div>
      <p className="text-2xl font-bold text-navy-600 mt-1">{value}</p>
      {sub && <p className="text-xs text-[#8a9ab0]">{sub}</p>}
    </div>
  )
}
