export function CardResumo({ titulo, valor, sufixo }) {
  return (
    <article className="rounded-[1.7rem] border border-slate-800 bg-slate-950 p-5">
      <p className="text-sm text-slate-400">{titulo}</p>
      <p className="mt-2 text-3xl font-bold">{valor}</p>
      <p className="text-xs text-slate-500">{sufixo}</p>
    </article>
  )
}
