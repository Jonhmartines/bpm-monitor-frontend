import { historicoBpm } from '../data/mockData.js'

export function GraficoBarras() {
  const maiorValor = Math.max(...historicoBpm.map((item) => item.max))

  return (
    <div className="space-y-4">
      {historicoBpm.map((item) => (
        <div key={item.horario}>
          <div className="mb-1 flex justify-between text-xs text-slate-400">
            <span>{item.horario}</span>
            <span>{item.medio} bpm</span>
          </div>
          <div className="h-3 rounded-full bg-slate-800">
            <div
              className="h-3 rounded-full bg-red-500"
              style={{ width: `${(item.medio / maiorValor) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
