import { useEffect, useState } from 'react'
import { Activity, AlertCircle, Clock, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient.js'

export function Dashboard({ sessao, perfil }) {
  const [bpmAtual, setBpmAtual] = useState(null)
  const [recebidoEm, setRecebidoEm] = useState(null)
  const [atualizadoEm, setAtualizadoEm] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  async function carregarBpmTempoReal() {
    if (!sessao?.user?.id) {
      setCarregando(false)
      return
    }

    setCarregando(true)
    setErro('')

    const { data, error } = await supabase
      .from('bpm_tempo_real')
      .select('perfil_id, valor_bpm, recebido_em, atualizado_em')
      .eq('perfil_id', sessao.user.id)
      .order('atualizado_em', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.log('Erro ao buscar BPM em tempo real:', error)
      setErro(error.message)
      setBpmAtual(null)
      setRecebidoEm(null)
      setAtualizadoEm(null)
      setCarregando(false)
      return
    }

    if (!data) {
      setBpmAtual(null)
      setRecebidoEm(null)
      setAtualizadoEm(null)
      setCarregando(false)
      return
    }

    setBpmAtual(data.valor_bpm)
    setRecebidoEm(data.recebido_em)
    setAtualizadoEm(data.atualizado_em)
    setCarregando(false)
  }

  useEffect(() => {
    carregarBpmTempoReal()

    const intervalo = setInterval(() => {
      carregarBpmTempoReal()
    }, 5000)

    return () => clearInterval(intervalo)
  }, [sessao?.user?.id])

  const status = calcularStatusBpm(bpmAtual)

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] bg-gradient-to-br from-red-500 to-rose-700 p-6 shadow-xl shadow-red-900/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-red-100">BPM atual</p>

            <div className="mt-2 flex items-end gap-2">
              {carregando ? (
                <span className="text-4xl font-black leading-none">...</span>
              ) : bpmAtual !== null ? (
                <>
                  <span className="text-6xl font-black leading-none">{bpmAtual}</span>
                  <span className="mb-2 text-sm font-semibold text-red-100">bpm</span>
                </>
              ) : (
                <span className="text-3xl font-black leading-none">Sem dados</span>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white/15 p-4">
            <Activity size={42} />
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-white/15 px-4 py-3 text-sm text-red-50">
          {erro ? (
            <p>
              <strong>Erro:</strong> {erro}
            </p>
          ) : bpmAtual !== null ? (
            <p>
              Status: <strong>{status}</strong>. Última leitura recebida do banco.
            </p>
          ) : (
            <p>
              Ainda não existe leitura de BPM vinculada a este usuário.
            </p>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <CardResumo titulo="Paciente" valor={perfil?.nome || 'Paciente'} sufixo="usuário logado" />
        <CardResumo titulo="Status" valor={status} sufixo="análise atual" />
        <CardResumo titulo="Recebido" valor={formatarHora(recebidoEm)} sufixo="última leitura" />
        <CardResumo titulo="Atualizado" valor={formatarHora(atualizadoEm)} sufixo="tempo real" />
      </section>

      <section className="rounded-[2rem] border border-slate-800 bg-slate-950 p-5">
        <div className="mb-4 flex items-center gap-3">
          <Clock className="text-red-400" />
          <div>
            <h3 className="text-lg font-bold">Monitoramento em tempo real</h3>
            <p className="text-sm text-slate-400">
              Esta tela busca a tabela bpm_tempo_real a cada 5 segundos.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900 p-4 text-sm leading-6 text-slate-400">
          {erro ? (
            <div className="flex gap-3">
              <AlertCircle className="mt-1 shrink-0 text-red-400" size={20} />
              <p>
                Não foi possível carregar o BPM. Se for erro de permissão, vamos ajustar apenas a
                policy de leitura.
              </p>
            </div>
          ) : bpmAtual !== null ? (
            <p>
              O último valor registrado foi{' '}
              <strong className="text-slate-100">{bpmAtual} bpm</strong>.
            </p>
          ) : (
            <p>
              O login está funcionando, mas ainda não há registro em bpm_tempo_real com o mesmo
              perfil_id deste usuário.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={carregarBpmTempoReal}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
        >
          <RefreshCw size={18} />
          Atualizar agora
        </button>
      </section>
    </div>
  )
}

function CardResumo({ titulo, valor, sufixo }) {
  return (
    <article className="rounded-[1.7rem] border border-slate-800 bg-slate-950 p-5">
      <p className="text-sm text-slate-400">{titulo}</p>
      <p className="mt-2 break-words text-2xl font-bold">{valor}</p>
      <p className="text-xs text-slate-500">{sufixo}</p>
    </article>
  )
}

function calcularStatusBpm(bpm) {
  if (bpm === null || bpm === undefined) {
    return 'Sem dados'
  }

  if (bpm < 60) {
    return 'Baixo'
  }

  if (bpm <= 100) {
    return 'Estável'
  }

  return 'Elevado'
}

function formatarHora(data) {
  if (!data) {
    return '--:--'
  }

  return new Date(data).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}