import { BarChart3, HeartPulse, UserRound } from 'lucide-react'

export function BottomNav({ abaAtiva, setAbaAtiva }) {
  const abas = [
    { id: 'dashboard', label: 'Início', icon: HeartPulse },
    { id: 'historico', label: 'Histórico', icon: BarChart3 },
    { id: 'perfil', label: 'Perfil', icon: UserRound }
  ]

  return (
    <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-t border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur">
      <div className="grid grid-cols-3 gap-2">
        {abas.map((aba) => {
          const Icone = aba.icon
          const selecionada = abaAtiva === aba.id

          return (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              className={`flex flex-col items-center justify-center rounded-2xl px-3 py-2 text-xs transition ${
                selecionada ? 'bg-red-500 text-white' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Icone size={20} />
              <span className="mt-1">{aba.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
