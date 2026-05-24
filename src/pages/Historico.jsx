import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CalendarDays, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient.js'

const fontesHistorico = [
  'vw_bpm_historico_minuto',
  'v_bpm_historico_minuto',
  'bpm_historico_minuto',
  'historico_bpm',
  'bpm_tempo_real'
]

export function Historico({ sessao, perfil }) {
  const [registros, setRegistros] = useState([])
  const [fonteUsada, setFonteUsada] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  async function carregarHistorico() {
    if (!sessao?.user?.id) {
      setCarregando(false)
      return
    }

    setCarregando(true)
    setErro('')

    let ultimoErro = ''

    for (const fonte of fontesHistorico) {
      const { data, error } = await supabase
        .from(fonte)
        .select('*')
        .eq('perfil_id', sessao.user.id)
        .limit(300)

      if (error) {
        ultimoErro = error.message
        continue
      }

      const linhas = Array.isArray(data) ? data : []

      const linhasNormalizadas = linhas
        .map((linha) => normalizarRegistro(linha, fonte))
        .filter((linha) => linha.dataOriginal)

      linhasNormalizadas.sort((a, b) => {
        return new Date(b.dataOriginal).getTime() - new Date(a.dataOriginal).getTime()
      })

      setRegistros(linhasNormalizadas)
      setFonteUsada(fonte)
      setCarregando(false)
      return
    }

    setRegistros([])
    setFonteUsada('')
    setErro(
      ultimoErro ||
        'Não foi possível encontrar uma tabela ou view de histórico compatível com este usuário.'
    )
    setCarregando(false)
  }

  useEffect(() => {
    carregarHistorico()
  }, [sessao?.user?.id])

  const registrosPorData = useMemo(() => {
    return agruparPorData(registros)
  }, [registros])

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-slate-800 bg-slate-950 p-5 lg:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-1 text-red-400" />
            <div>
              <h3 className="text-lg font-bold">Histórico de BPM</h3>
              <p className="text-sm leading-6 text-slate-400">
                Registros organizados por data, com os valores de BPM encontrados no banco.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={carregarHistorico}
            className="rounded-2xl border border-slate-700 p-3 text-slate-300 transition hover:bg-slate-800"
            title="Atualizar histórico"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="rounded-2xl bg-slate-900 p-4 text-sm text-slate-400">
          <p>
            Paciente:{' '}
            <strong className="text-slate-100">{perfil?.nome || 'Paciente'}</strong>
          </p>
          <p className="mt-1">
            Fonte dos dados:{' '}
            <strong className="text-slate-100">
              {fonteUsada || 'aguardando consulta'}
            </strong>
          </p>
        </div>
      </section>

      {carregando && (
        <section className="rounded-[2rem] border border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">
          Carregando histórico...
        </section>
      )}

      {!carregando && erro && (
        <section className="rounded-[2rem] border border-red-500/30 bg-red-500/10 p-5">
          <div className="flex gap-3 text-sm leading-6 text-red-200">
            <AlertCircle className="mt-1 shrink-0" size={20} />
            <div>
              <p className="font-semibold">Não foi possível carregar o histórico.</p>
              <p className="mt-1">{erro}</p>
            </div>
          </div>
        </section>
      )}

      {!carregando && !erro && registros.length === 0 && (
        <section className="rounded-[2rem] border border-slate-800 bg-slate-950 p-5 text-sm leading-6 text-slate-400">
          Nenhum registro de BPM foi encontrado para este usuário. Quando o dispositivo começar a
          enviar dados usando o mesmo perfil do paciente, os registros aparecerão aqui.
        </section>
      )}

      {!carregando && !erro && registros.length > 0 && (
        <div className="space-y-5">
          {Object.entries(registrosPorData).map(([data, itens]) => (
            <section
              key={data}
              className="rounded-[2rem] border border-slate-800 bg-slate-950 p-5 lg:p-6"
            >
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xl font-bold">{data}</h4>
                  <p className="text-sm text-slate-400">
                    {itens.length} registro{itens.length === 1 ? '' : 's'} encontrado
                    {itens.length === 1 ? '' : 's'}
                  </p>
                </div>

                <div className="rounded-2xl bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300">
                  Média: {calcularMediaDia(itens)}
                </div>
              </div>

              <div className="space-y-3">
                {itens.map((item, index) => (
                  <article
                    key={`${item.dataOriginal}-${index}`}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-400">{item.hora}</p>
                        <p className="mt-1 text-2xl font-bold text-slate-100">
                          {item.valorPrincipal}
                        </p>
                      </div>

                      <span className="rounded-full bg-slate-950 px-3 py-1 text-xs text-slate-400">
                        {item.tipo}
                      </span>
                    </div>

                    {item.detalhes.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm lg:grid-cols-4">
                        {item.detalhes.map((detalhe) => (
                          <div
                            key={detalhe.rotulo}
                            className="rounded-xl bg-slate-950 px-3 py-2"
                          >
                            <p className="text-xs text-slate-500">{detalhe.rotulo}</p>
                            <p className="font-semibold text-slate-100">{detalhe.valor}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function normalizarRegistro(linha, fonte) {
  const dataOriginal =
    linha.registrado_em ||
    linha.recebido_em ||
    linha.atualizado_em ||
    linha.criado_em ||
    linha.data_hora ||
    linha.data_registro ||
    linha.minuto ||
    linha.dia

  const valorBpm =
    linha.valor_bpm ??
    linha.bpm ??
    linha.bpm_atual ??
    linha.bpm_medio ??
    linha.media_bpm ??
    linha.bpm_media

  const bpmMinimo =
    linha.bpm_minimo ??
    linha.bpm_min ??
    linha.min_bpm ??
    linha.valor_minimo

  const bpmMaximo =
    linha.bpm_maximo ??
    linha.bpm_max ??
    linha.max_bpm ??
    linha.valor_maximo

  const leituras =
    linha.total_leituras ??
    linha.qtd_leituras ??
    linha.quantidade_leituras ??
    linha.leituras

  const valorPrincipal = montarValorPrincipal(valorBpm, bpmMinimo, bpmMaximo)

  const detalhes = []

  if (bpmMinimo !== undefined && bpmMinimo !== null) {
    detalhes.push({
      rotulo: 'Mínimo',
      valor: `${bpmMinimo} bpm`
    })
  }

  if (valorBpm !== undefined && valorBpm !== null) {
    detalhes.push({
      rotulo: 'Médio/valor',
      valor: `${valorBpm} bpm`
    })
  }

  if (bpmMaximo !== undefined && bpmMaximo !== null) {
    detalhes.push({
      rotulo: 'Máximo',
      valor: `${bpmMaximo} bpm`
    })
  }

  if (leituras !== undefined && leituras !== null) {
    detalhes.push({
      rotulo: 'Leituras',
      valor: leituras
    })
  }

  return {
    dataOriginal,
    data: formatarData(dataOriginal),
    hora: formatarHora(dataOriginal),
    valorNumerico: Number(valorBpm ?? bpmMaximo ?? bpmMinimo),
    valorPrincipal,
    detalhes,
    tipo: definirTipo(fonte, linha)
  }
}

function montarValorPrincipal(valorBpm, bpmMinimo, bpmMaximo) {
  if (valorBpm !== undefined && valorBpm !== null) {
    return `${valorBpm} bpm`
  }

  if (
    bpmMinimo !== undefined &&
    bpmMinimo !== null &&
    bpmMaximo !== undefined &&
    bpmMaximo !== null
  ) {
    return `${bpmMinimo} - ${bpmMaximo} bpm`
  }

  if (bpmMinimo !== undefined && bpmMinimo !== null) {
    return `${bpmMinimo} bpm`
  }

  if (bpmMaximo !== undefined && bpmMaximo !== null) {
    return `${bpmMaximo} bpm`
  }

  return 'BPM não informado'
}

function definirTipo(fonte, linha) {
  if (fonte.includes('minuto') || linha.minuto) {
    return 'Por minuto'
  }

  if (linha.bpm_medio || linha.media_bpm || linha.bpm_media) {
    return 'Resumo'
  }

  if (fonte === 'bpm_tempo_real') {
    return 'Tempo real'
  }

  return 'Registro'
}

function agruparPorData(registros) {
  return registros.reduce((grupos, registro) => {
    const data = registro.data || 'Sem data'

    if (!grupos[data]) {
      grupos[data] = []
    }

    grupos[data].push(registro)

    return grupos
  }, {})
}

function calcularMediaDia(itens) {
  const valores = itens
    .map((item) => item.valorNumerico)
    .filter((valor) => Number.isFinite(valor))

  if (valores.length === 0) {
    return '--'
  }

  const soma = valores.reduce((total, valor) => total + valor, 0)
  const media = Math.round(soma / valores.length)

  return `${media} bpm`
}

function formatarData(data) {
  if (!data) {
    return 'Sem data'
  }

  return new Date(data).toLocaleDateString('pt-BR')
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