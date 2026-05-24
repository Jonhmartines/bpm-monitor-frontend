import { useEffect, useState } from "react";
import { Activity, Clock, HeartPulse, UserRound } from "lucide-react";
import { supabase } from "../supabaseClient";

function formatarHora(data) {
  if (!data) return "--:--";

  return new Date(data).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatarDataHora(data) {
  if (!data) return "--:--";

  return new Date(data).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function classificarBpm(valor) {
  if (!valor) return "Sem dados";
  if (valor < 60) return "Baixo";
  if (valor <= 100) return "Normal";
  return "Elevado";
}

export default function Dashboard({ sessao, perfil }) {
  const [bpmAtual, setBpmAtual] = useState(null);
  const [ultimaLeitura, setUltimaLeitura] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  async function buscarUltimaLeitura() {
    if (!sessao?.user?.id) return;

    const { data, error } = await supabase
      .from("bpm_leituras")
      .select("id, perfil_id, valor_bpm, recebido_em")
      .eq("perfil_id", sessao.user.id)
      .order("recebido_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar última leitura:", error);
      setErro("Não foi possível carregar a última leitura.");
      setBpmAtual(null);
      setUltimaLeitura(null);
      setCarregando(false);
      return;
    }

    setErro("");
    setUltimaLeitura(data);
    setBpmAtual(data?.valor_bpm ?? null);
    setCarregando(false);
  }

  useEffect(() => {
    buscarUltimaLeitura();

    const intervalo = setInterval(() => {
      buscarUltimaLeitura();
    }, 5000);

    return () => clearInterval(intervalo);
  }, [sessao?.user?.id]);

  const nomePaciente =
    perfil?.nome || sessao?.user?.user_metadata?.nome || sessao?.user?.email || "Paciente";

  const status = classificarBpm(bpmAtual);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-white/10 bg-slate-900/80 px-6 py-5">
        <p className="text-sm text-slate-400">Monitoramento cardíaco</p>
        <h1 className="mt-1 text-3xl font-bold">Início</h1>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-8">
        <div className="rounded-[2rem] bg-gradient-to-br from-rose-500 to-rose-700 p-7 shadow-2xl shadow-rose-950/40">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white/90">BPM atual</p>

              <h2 className="mt-3 text-4xl font-black tracking-tight">
                {carregando ? "Carregando..." : bpmAtual ? `${bpmAtual} BPM` : "Sem dados"}
              </h2>

              <div className="mt-5 rounded-2xl bg-white/10 px-5 py-4 text-sm text-white/90">
                {bpmAtual
                  ? `Última leitura recebida do ESP32: ${formatarDataHora(
                      ultimaLeitura?.recebido_em
                    )}.`
                  : "Ainda não existe leitura de BPM vinculada a este usuário."}
              </div>
            </div>

            <div className="rounded-3xl bg-white/10 p-5">
              <HeartPulse size={48} />
            </div>
          </div>
        </div>

        {erro && (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
            {erro}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-xl">
            <div className="flex items-center gap-3 text-slate-400">
              <UserRound size={20} />
              <span>Paciente</span>
            </div>
            <h3 className="mt-4 text-2xl font-bold">{nomePaciente}</h3>
            <p className="text-sm text-slate-500">usuário logado</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-xl">
            <div className="flex items-center gap-3 text-slate-400">
              <Activity size={20} />
              <span>Status</span>
            </div>
            <h3 className="mt-4 text-2xl font-bold">{status}</h3>
            <p className="text-sm text-slate-500">análise atual</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-xl">
            <div className="flex items-center gap-3 text-slate-400">
              <Clock size={20} />
              <span>Recebido</span>
            </div>
            <h3 className="mt-4 text-2xl font-bold">
              {formatarHora(ultimaLeitura?.recebido_em)}
            </h3>
            <p className="text-sm text-slate-500">última leitura</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-xl">
            <div className="flex items-center gap-3 text-slate-400">
              <HeartPulse size={20} />
              <span>Fonte dos dados</span>
            </div>
            <h3 className="mt-4 text-2xl font-bold">bpm_leituras</h3>
            <p className="text-sm text-slate-500">dados reais do ESP32</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950 p-6">
          <h2 className="flex items-center gap-3 text-xl font-bold">
            <HeartPulse className="text-rose-400" />
            Acompanhamento em tempo real
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            Este painel consulta automaticamente a tabela de leituras a cada 5 segundos.
            Assim, o BPM exibido acompanha os novos dados enviados pelo ESP32.
          </p>
        </div>
      </section>
    </main>
  );
}