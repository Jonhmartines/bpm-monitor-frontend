import { LogOut, Menu } from 'lucide-react'

export function Header({ nome, onLogout }) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/95 px-5 py-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">Bem-vindo</p>
          <h2 className="text-xl font-bold">{nome}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-2xl border border-slate-700 p-3 text-slate-300">
            <Menu size={20} />
          </button>
          <button onClick={onLogout} className="rounded-2xl border border-slate-700 p-3 text-slate-300">
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  )
}
