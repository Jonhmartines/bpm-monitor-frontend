import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

const DISPOSITIVO_ID = "11111111-1111-1111-1111-111111111111";
const CODIGO_DISPOSITIVO = "ESP32_PRINCIPAL";

function formatarDataHora(data) {
  if (!data) return "--";

  return new Date(data).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatarHora(data) {
  if (!data) return "--:--";

  return new Date(data).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatarData(data) {
  if (!data) return "Sem data";

  return new Date(data).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function classificarBpm(valor) {
  if (!valor) return "Sem dados";
  if (valor < 60) return "Baixo";
  if (valor <= 100) return "Normal";
  return "Elevado";
}

function normalizarSexo(valor) {
  const sexo = String(valor || "").toLowerCase();

  if (sexo === "masculino") return "masculino";
  if (sexo === "feminino") return "feminino";
  return "outro";
}

function calcularMedia(lista) {
  if (!lista.length) return null;

  const soma = lista.reduce((total, item) => {
    return total + Number(item.valor_bpm || 0);
  }, 0);

  return Math.round(soma / lista.length);
}

function Card({ titulo, valor, subtitulo }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-5 shadow-xl">
      <p className="text-sm text-slate-400">{titulo}</p>
      <h3 className="mt-2 text-2xl font-black text-white">{valor}</h3>
      {subtitulo && <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>}
    </div>
  );
}

function TelaLogin() {
  const [modoCadastro, setModoCadastro] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const [form, setForm] = useState({
    nome: "",
    idade: "",
    sexo: "masculino",
    email: "",
    senha: "",
    confirmarSenha: "",
  });

  function atualizarCampo(campo, valor) {
    setForm((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  async function entrar(e) {
    e.preventDefault();
    setMensagem("");
    setCarregando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.senha,
    });

    if (error) {
      setMensagem("Erro ao entrar: " + error.message);
    }

    setCarregando(false);
  }

  async function cadastrar(e) {
    e.preventDefault();
    setMensagem("");

    if (!form.nome || !form.idade || !form.email || !form.senha) {
      setMensagem("Preencha todos os campos obrigatórios.");
      return;
    }

    if (form.senha.length < 6) {
      setMensagem("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (form.senha !== form.confirmarSenha) {
      setMensagem("As senhas não são iguais.");
      return;
    }

    const idadeNumerica = Number(form.idade);

    if (Number.isNaN(idadeNumerica) || idadeNumerica < 0 || idadeNumerica > 130) {
      setMensagem("Informe uma idade válida.");
      return;
    }

    setCarregando(true);

    const nomeTratado = form.nome.trim();
    const sexoTratado = normalizarSexo(form.sexo);

    const { error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.senha,
      options: {
        data: {
          nome: nomeTratado,
          full_name: nomeTratado,
          idade: idadeNumerica,
          sexo: sexoTratado,
        },
      },
    });

    if (error) {
      setMensagem("Erro ao cadastrar: " + error.message);
      setCarregando(false);
      return;
    }

    setMensagem("Cadastro realizado. Agora entre com o e-mail e senha cadastrados.");
    setCarregando(false);
    setModoCadastro(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <section className="mx-auto flex min-h-[85vh] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 shadow-2xl md:grid-cols-2">
          <div className="bg-gradient-to-br from-rose-600 via-red-700 to-slate-950 p-8 md:p-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 text-3xl">
              ♥
            </div>

            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
              Monitor BPM
            </p>

            <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
              Acompanhamento cardíaco conectado ao ESP32
            </h1>

            <p className="mt-5 text-sm leading-6 text-white/80">
              Entre ou cadastre um paciente para visualizar as leituras de BPM enviadas para o Supabase.
            </p>

            <div className="mt-8 rounded-3xl bg-white/10 p-5 text-sm text-white/90">
              Fonte principal dos dados: <strong>bpm_leituras</strong>.
            </div>
          </div>

          <div className="p-8 md:p-10">
            <h2 className="text-3xl font-black">
              {modoCadastro ? "Criar cadastro" : "Entrar"}
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              {modoCadastro
                ? "Preencha os dados do paciente."
                : "Acesse com o e-mail e senha cadastrados."}
            </p>

            <form
              onSubmit={modoCadastro ? cadastrar : entrar}
              className="mt-8 flex flex-col gap-4"
            >
              {modoCadastro && (
                <>
                  <input
                    className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none transition focus:border-rose-400"
                    placeholder="Nome do paciente"
                    value={form.nome}
                    onChange={(e) => atualizarCampo("nome", e.target.value)}
                  />

                  <input
                    className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none transition focus:border-rose-400"
                    placeholder="Idade"
                    type="number"
                    value={form.idade}
                    onChange={(e) => atualizarCampo("idade", e.target.value)}
                  />

                  <select
                    className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none transition focus:border-rose-400"
                    value={form.sexo}
                    onChange={(e) => atualizarCampo("sexo", e.target.value)}
                  >
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                    <option value="outro">Outro</option>
                  </select>
                </>
              )}

              <input
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none transition focus:border-rose-400"
                placeholder="E-mail"
                type="email"
                value={form.email}
                onChange={(e) => atualizarCampo("email", e.target.value)}
              />

              <input
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none transition focus:border-rose-400"
                placeholder="Senha"
                type="password"
                value={form.senha}
                onChange={(e) => atualizarCampo("senha", e.target.value)}
              />

              {modoCadastro && (
                <input
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none transition focus:border-rose-400"
                  placeholder="Confirmar senha"
                  type="password"
                  value={form.confirmarSenha}
                  onChange={(e) => atualizarCampo("confirmarSenha", e.target.value)}
                />
              )}

              {mensagem && (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                  {mensagem}
                </div>
              )}

              <button
                disabled={carregando}
                className="rounded-2xl bg-rose-600 px-4 py-3 font-bold transition hover:bg-rose-500 disabled:opacity-60"
              >
                {carregando ? "Aguarde..." : modoCadastro ? "Cadastrar" : "Entrar"}
              </button>
            </form>

            <button
              className="mt-5 text-sm font-semibold text-rose-300 hover:text-rose-200"
              onClick={() => {
                setMensagem("");
                setModoCadastro(!modoCadastro);
              }}
            >
              {modoCadastro ? "Já tenho conta" : "Criar nova conta"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function Dashboard({ sessao, perfil }) {
  const [leiturasUsuario, setLeiturasUsuario] = useState([]);
  const [leiturasGerais, setLeiturasGerais] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  async function carregarLeituras() {
    if (!sessao?.user?.id) return;

    const { data, error } = await supabase
      .from("bpm_leituras")
      .select("id, perfil_id, valor_bpm, recebido_em")
      .eq("perfil_id", sessao.user.id)
      .order("recebido_em", { ascending: false })
      .limit(30);

    if (error) {
      setErro("Erro ao buscar leituras do usuário: " + error.message);
      setLeiturasUsuario([]);
      setCarregando(false);
      return;
    }

    const { data: gerais } = await supabase
      .from("bpm_leituras")
      .select("id, perfil_id, valor_bpm, recebido_em")
      .order("recebido_em", { ascending: false })
      .limit(5);

    setErro("");
    setLeiturasUsuario(data || []);
    setLeiturasGerais(gerais || []);
    setCarregando(false);
  }

  useEffect(() => {
    carregarLeituras();

    const intervalo = setInterval(() => {
      carregarLeituras();
    }, 5000);

    return () => clearInterval(intervalo);
  }, [sessao?.user?.id]);

  const ultima = leiturasUsuario[0] || null;
  const bpmAtual = ultima?.valor_bpm || null;

  const media = calcularMedia(leiturasUsuario);
  const menor = leiturasUsuario.length
    ? Math.min(...leiturasUsuario.map((item) => Number(item.valor_bpm)))
    : null;
  const maior = leiturasUsuario.length
    ? Math.max(...leiturasUsuario.map((item) => Number(item.valor_bpm)))
    : null;

  const nome =
    perfil?.nome || sessao?.user?.user_metadata?.nome || sessao?.user?.email || "Paciente";

  const espEnviaParaOutroPerfil =
    leiturasUsuario.length === 0 &&
    leiturasGerais.length > 0 &&
    leiturasGerais[0]?.perfil_id !== sessao.user.id;

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] bg-gradient-to-br from-rose-600 via-red-700 to-red-900 p-7 shadow-2xl shadow-rose-950/40">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-semibold text-white/80">
              Última leitura recebida do ESP32
            </p>

            <h1 className="mt-4 text-5xl font-black tracking-tight">
              {carregando ? "Carregando..." : bpmAtual ? `${bpmAtual} BPM` : "Sem dados"}
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/80">
              O painel consulta automaticamente a tabela <strong>bpm_leituras</strong> a cada 5 segundos.
            </p>
          </div>

          <div className="rounded-3xl bg-white/10 p-5 text-center">
            <p className="text-sm text-white/70">Status</p>
            <p className="mt-2 text-2xl font-black">{classificarBpm(bpmAtual)}</p>
          </div>
        </div>
      </div>

      {erro && (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          {erro}
        </div>
      )}

      {espEnviaParaOutroPerfil && (
        <div className="rounded-2xl border border-yellow-400/30 bg-yellow-500/10 px-5 py-4 text-sm text-yellow-100">
          O ESP32 está enviando leituras, mas elas parecem estar vinculadas a outro perfil_id.
          <br />
          ID do usuário logado: <span className="font-mono">{sessao.user.id}</span>
          <br />
          Último perfil_id recebido: <span className="font-mono">{leiturasGerais[0]?.perfil_id}</span>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-4">
        <Card titulo="Paciente" valor={nome} subtitulo={sessao.user.email} />
        <Card titulo="Média recente" valor={media ? `${media} BPM` : "--"} subtitulo="últimas leituras" />
        <Card titulo="Menor recente" valor={menor ? `${menor} BPM` : "--"} subtitulo="últimas leituras" />
        <Card titulo="Maior recente" valor={maior ? `${maior} BPM` : "--"} subtitulo="últimas leituras" />
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-900 p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-black">Últimas leituras</h2>
            <p className="mt-1 text-sm text-slate-400">
              Dados reais da tabela bpm_leituras.
            </p>
          </div>

          <button
            onClick={carregarLeituras}
            className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
          >
            Atualizar agora
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
          {leiturasUsuario.length === 0 ? (
            <div className="p-5 text-sm text-slate-400">
              Nenhuma leitura encontrada para este usuário.
              <br />
              ID do usuário logado: <span className="font-mono text-slate-300">{sessao.user.id}</span>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {leiturasUsuario.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div>
                    <p className="font-black">{item.valor_bpm} BPM</p>
                    <p className="text-sm text-slate-400">{formatarDataHora(item.recebido_em)}</p>
                  </div>

                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
                    {formatarHora(item.recebido_em)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Historico({ sessao }) {
  const [leituras, setLeituras] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  async function carregarHistorico() {
    if (!sessao?.user?.id) return;

    const { data, error } = await supabase
      .from("bpm_leituras")
      .select("id, perfil_id, valor_bpm, recebido_em")
      .eq("perfil_id", sessao.user.id)
      .order("recebido_em", { ascending: false })
      .limit(300);

    if (error) {
      setErro("Erro ao carregar histórico: " + error.message);
      setLeituras([]);
      setCarregando(false);
      return;
    }

    setErro("");
    setLeituras(data || []);
    setCarregando(false);
  }

  useEffect(() => {
    carregarHistorico();

    const intervalo = setInterval(() => {
      carregarHistorico();
    }, 10000);

    return () => clearInterval(intervalo);
  }, [sessao?.user?.id]);

  const grupos = useMemo(() => {
    const mapa = {};

    leituras.forEach((item) => {
      const chave = formatarData(item.recebido_em);

      if (!mapa[chave]) {
        mapa[chave] = [];
      }

      mapa[chave].push(item);
    });

    return Object.entries(mapa).map(([data, itens]) => {
      return {
        data,
        itens,
        media: calcularMedia(itens),
        menor: Math.min(...itens.map((item) => Number(item.valor_bpm))),
        maior: Math.max(...itens.map((item) => Number(item.valor_bpm))),
      };
    });
  }, [leituras]);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-black">Histórico</h1>
            <p className="mt-2 text-sm text-slate-400">
              Leituras agrupadas por data.
            </p>
          </div>

          <button
            onClick={carregarHistorico}
            className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-bold hover:bg-rose-500"
          >
            Atualizar
          </button>
        </div>
      </div>

      {erro && (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          {erro}
        </div>
      )}

      {carregando ? (
        <div className="rounded-3xl border border-white/10 bg-slate-900 p-6 text-slate-400">
          Carregando histórico...
        </div>
      ) : grupos.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-slate-900 p-6 text-slate-400">
          Nenhuma leitura encontrada para este usuário.
        </div>
      ) : (
        grupos.map((grupo) => (
          <div key={grupo.data} className="rounded-3xl border border-white/10 bg-slate-900 p-5">
            <div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl font-black">{grupo.data}</h2>
                <p className="text-sm text-slate-400">{grupo.itens.length} leituras registradas</p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-white/10 px-3 py-1">
                  Média: {grupo.media} BPM
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1">
                  Mín: {grupo.menor} BPM
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1">
                  Máx: {grupo.maior} BPM
                </span>
              </div>
            </div>

            <div className="mt-4 divide-y divide-white/10">
              {grupo.itens.map((item) => (
                <div key={item.id} className="flex justify-between gap-4 py-3">
                  <div>
                    <p className="font-black">{item.valor_bpm} BPM</p>
                    <p className="text-sm text-slate-400">{classificarBpm(item.valor_bpm)}</p>
                  </div>

                  <p className="text-sm text-slate-400">{formatarHora(item.recebido_em)}</p>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}

function Perfil({ sessao, perfil }) {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">
        <h1 className="text-3xl font-black">Perfil</h1>
        <p className="mt-2 text-sm text-slate-400">
          Dados do paciente logado.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card
          titulo="Nome"
          valor={perfil?.nome || sessao?.user?.user_metadata?.nome || "Não informado"}
        />

        <Card titulo="E-mail" valor={sessao?.user?.email} />

        <Card titulo="Idade" valor={perfil?.idade ?? "Não informado"} />

        <Card titulo="Sexo" valor={perfil?.sexo || "Não informado"} />

        <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-5 md:col-span-2">
          <p className="text-sm text-slate-400">ID do usuário logado</p>
          <p className="mt-2 break-all font-mono text-sm text-slate-200">
            {sessao?.user?.id}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-5 md:col-span-2">
          <p className="text-sm text-slate-400">Código do dispositivo</p>
          <p className="mt-2 break-all font-mono text-sm text-slate-200">
            {CODIGO_DISPOSITIVO}
          </p>
        </div>
      </div>
    </section>
  );
}

function App() {
  const [sessao, setSessao] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [carregandoSessao, setCarregandoSessao] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState("inicio");

  async function garantirPerfil(sessaoAtual) {
    if (!sessaoAtual?.user?.id) return null;

    const metadata = sessaoAtual.user.user_metadata || {};

    const perfilParaSalvar = {
      id: sessaoAtual.user.id,
      nome: metadata.nome || metadata.full_name || sessaoAtual.user.email || "Paciente",
      idade: Number(metadata.idade || 24),
      sexo: normalizarSexo(metadata.sexo || "outro"),
    };

    const { data, error } = await supabase
      .from("perfis")
      .upsert(perfilParaSalvar, {
        onConflict: "id",
      })
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("Erro ao garantir perfil:", error);
      return null;
    }

    return data;
  }

  async function vincularDispositivoAoUsuario(sessaoAtual) {
    if (!sessaoAtual?.user?.id) return;

    const { error } = await supabase
      .from("dispositivos")
      .upsert(
        {
          id: DISPOSITIVO_ID,
          nome: "ESP32 Principal",
          codigo_dispositivo: CODIGO_DISPOSITIVO,
          perfil_id: sessaoAtual.user.id,
          ativo: true,
          atualizado_em: new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      );

    if (error) {
      console.error("Erro ao vincular dispositivo:", error);
    }
  }

  async function garantirPerfil(sessaoAtual) {
    if (!sessaoAtual?.user?.id) return null;

    const metadata = sessaoAtual.user.user_metadata || {};

    const nome =
      metadata.nome ||
      metadata.full_name ||
      sessaoAtual.user.email?.split("@")[0] ||
      "Paciente";

    const idade = Number(metadata.idade || 0);
    const sexo = normalizarSexo(metadata.sexo || "outro");

    const { data: perfilExistente } = await supabase
      .from("perfis")
      .select("*")
      .eq("id", sessaoAtual.user.id)
      .maybeSingle();

    if (perfilExistente) {
      return perfilExistente;
    }

    const { data: novoPerfil, error } = await supabase
      .from("perfis")
      .upsert(
        {
          id: sessaoAtual.user.id,
          nome,
          idade,
          sexo,
        },
        {
          onConflict: "id",
        }
      )
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("Erro ao criar perfil:", error);
      return null;
    }

    return novoPerfil;
  }

  async function carregarPerfil(sessaoAtual) {
    if (!sessaoAtual?.user?.id) {
      setPerfil(null);
      return;
    }

    const perfilAtual = await garantirPerfil(sessaoAtual);

    setPerfil(perfilAtual);

    await vincularDispositivoAoUsuario(sessaoAtual);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      carregarPerfil(data.session);
      setCarregandoSessao(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessao(session);
      carregarPerfil(session);
      setCarregandoSessao(false);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  async function sair() {
    await supabase.auth.signOut();
    setSessao(null);
    setPerfil(null);
    setAbaAtiva("inicio");
  }

  if (carregandoSessao) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="rounded-3xl border border-white/10 bg-slate-900 px-8 py-6">
          Carregando...
        </div>
      </main>
    );
  }

  if (!sessao) {
    return <TelaLogin />;
  }

  const nome =
    perfil?.nome || sessao?.user?.user_metadata?.nome || sessao?.user?.email || "Paciente";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-7xl">
        <aside className="sticky top-0 hidden h-screen w-72 border-r border-white/10 bg-slate-900 p-6 md:block">
          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-rose-600/20 text-2xl">
              ♥
            </div>

            <h1 className="mt-5 text-2xl font-black">Monitor BPM</h1>
            <p className="mt-1 text-sm text-slate-400">Painel do paciente</p>

            <div className="mt-8 rounded-3xl bg-slate-950 p-5">
              <p className="text-sm text-slate-400">Bem-vindo</p>
              <p className="mt-2 text-xl font-black">{nome}</p>
              <p className="mt-1 break-all text-sm text-slate-500">{sessao.user.email}</p>
            </div>
          </div>

          <nav className="mt-10 flex flex-col gap-3">
            <button
              onClick={() => setAbaAtiva("inicio")}
              className={`rounded-2xl px-4 py-3 text-left font-semibold ${
                abaAtiva === "inicio" ? "bg-rose-600 text-white" : "text-slate-300 hover:bg-white/5"
              }`}
            >
              Início
            </button>

            <button
              onClick={() => setAbaAtiva("historico")}
              className={`rounded-2xl px-4 py-3 text-left font-semibold ${
                abaAtiva === "historico" ? "bg-rose-600 text-white" : "text-slate-300 hover:bg-white/5"
              }`}
            >
              Histórico
            </button>

            <button
              onClick={() => setAbaAtiva("perfil")}
              className={`rounded-2xl px-4 py-3 text-left font-semibold ${
                abaAtiva === "perfil" ? "bg-rose-600 text-white" : "text-slate-300 hover:bg-white/5"
              }`}
            >
              Perfil
            </button>
          </nav>

          <button
            onClick={sair}
            className="absolute bottom-6 left-6 right-6 rounded-2xl bg-white/10 px-4 py-3 font-semibold hover:bg-white/20"
          >
            Sair
          </button>
        </aside>

        <section className="w-full px-5 pb-28 pt-6 md:px-8 md:pb-10">
          <header className="mb-6 flex items-center justify-between rounded-3xl border border-white/10 bg-slate-900 p-5 md:hidden">
            <div>
              <p className="text-sm text-slate-400">Monitor BPM</p>
              <h1 className="font-black">{nome}</h1>
            </div>

            <button
              onClick={sair}
              className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold"
            >
              Sair
            </button>
          </header>

          {abaAtiva === "inicio" && <Dashboard sessao={sessao} perfil={perfil} />}
          {abaAtiva === "historico" && <Historico sessao={sessao} />}
          {abaAtiva === "perfil" && <Perfil sessao={sessao} perfil={perfil} />}
        </section>

        <nav className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-3 border-t border-white/10 bg-slate-900 p-3 md:hidden">
          <button
            onClick={() => setAbaAtiva("inicio")}
            className={`rounded-2xl py-3 text-sm font-bold ${
              abaAtiva === "inicio" ? "bg-rose-600 text-white" : "text-slate-400"
            }`}
          >
            Início
          </button>

          <button
            onClick={() => setAbaAtiva("historico")}
            className={`rounded-2xl py-3 text-sm font-bold ${
              abaAtiva === "historico" ? "bg-rose-600 text-white" : "text-slate-400"
            }`}
          >
            Histórico
          </button>

          <button
            onClick={() => setAbaAtiva("perfil")}
            className={`rounded-2xl py-3 text-sm font-bold ${
              abaAtiva === "perfil" ? "bg-rose-600 text-white" : "text-slate-400"
            }`}
          >
            Perfil
          </button>
        </nav>
      </div>
    </main>
  );
}

export default App;

