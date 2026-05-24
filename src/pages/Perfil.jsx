import { Shield, UserRound } from 'lucide-react'

export function Perfil({ perfil, sessao }) {
  const nome = perfil?.nome || 'Paciente'
  const email = perfil?.email || sessao?.user?.email || 'Não informado'
  const idade = perfil?.idade || 'Não informado'
  const sexo = formatarSexo(perfil?.sexo)
  const criadoEm = formatarData(perfil?.criado_em)

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-slate-800 bg-slate-950 p-5">
        <div className="mb-5 flex items-center gap-3">
          <UserRound className="text-red-400" />
          <div>
            <h3 className="text-lg font-bold">Perfil do paciente</h3>
            <p className="text-sm text-slate-400">Dados da conta conectada ao Supabase</p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <InfoLinha rotulo="Nome" valor={nome} />
          <InfoLinha rotulo="E-mail" valor={email} />
          <InfoLinha rotulo="Idade" valor={idade} />
          <InfoLinha rotulo="Sexo" valor={sexo} />
          <InfoLinha rotulo="Criado em" valor={criadoEm} />
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-800 bg-slate-950 p-5">
        <div className="mb-3 flex items-center gap-3">
          <Shield className="text-red-400" />
          <h3 className="text-lg font-bold">Privacidade</h3>
        </div>

        <p className="text-sm leading-6 text-slate-400">
          Os dados exibidos nesta tela pertencem ao usuário autenticado. A próxima etapa será
          conectar o dashboard aos dados reais de BPM já gravados no banco.
        </p>
      </section>
    </div>
  )
}

function InfoLinha({ rotulo, valor }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-900 px-4 py-3">
      <span className="text-slate-400">{rotulo}</span>
      <strong className="text-right text-slate-100">{valor}</strong>
    </div>
  )
}

function formatarSexo(sexo) {
  if (!sexo) {
    return 'Não informado'
  }

  if (sexo === 'masculino') {
    return 'Masculino'
  }

  if (sexo === 'feminino') {
    return 'Feminino'
  }

  return 'Outro'
}

function formatarData(data) {
  if (!data) {
    return 'Não informado'
  }

  return new Date(data).toLocaleDateString('pt-BR')
}