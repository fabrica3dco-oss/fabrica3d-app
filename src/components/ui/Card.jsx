export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-white border border-[#e2e6ea] rounded-xl p-4 ${className}`}>
      {children}
    </div>
  )
}
