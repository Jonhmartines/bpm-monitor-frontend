export function InfoLinha({ rotulo, valor }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-3">
      <span className="text-slate-400">{rotulo}</span>
      <strong className="text-right text-slate-100">{valor}</strong>
    </div>
  )
}
