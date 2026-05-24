import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

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

function normalizarSexo(valor) {
  const sexo = String(valor || "").toLowerCase();

  if (sexo === "masculino") return "masculino";
  if (sexo === "feminino") return "feminino";
  return "outro";
}

function classificarBpm(valor) {
  if (!valor) return "Sem dados";
  if (valor < 60) return "Baixo";
  if (valor <= 100) return "Normal";
  return "Elevado";
}

function calcularMedia(lista) {
  if (!lista.length) return null;

  const soma = lista.reduce((total, item) => {
    return total + Number(item.valor_bpm || 0);
  }, 0);

  return Math.round(soma / lista.length);
}

function calcularMenor(lista) {
  if (!lista.length) return null;
  return Math.min(...lista.map((item) => Number(item.valor_bpm)));
}

function calcularMaior(lista) {
  if (!lista.length) return null;
  return Math.max(...lista.map((item) => Number(item.valor_bpm)));
}

function obterClasses(temaEscuro) {
  return {
    pagina: temaEscuro
      ? "min-h-screen bg-slate-950 text-white"
      : "min-h-screen bg-slate-100 text-slate-950",

    painel: temaEscuro
      ? "border border-white/10 bg-slate-900/90 shadow-xl shadow-black/20"
      : "border border-slate-200 bg-white shadow-xl shadow-slate-200/70",

    painelForte: temaEscuro
      ? "border border-white/10 bg-slate-950/80"
      : "border border-slate-200 bg-slate-50",

    textoSuave: temaEscuro ? "text-slate-400" : "text-slate-500",
    textoMuitoSuave: temaEscuro ? "text-slate-500" : "text-slate-400",

    input: temaEscuro
      ? "rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-rose-400"
      : "rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-rose-500",

    botaoSecundario: temaEscuro
      ? "rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
      : "rounded-2xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-300",

    menuAtivo: "bg-rose-600 text-white shadow-lg shadow-rose-950/30",
    menuInativo: temaEscuro
      ? "text-slate-300 hover:bg-white/5"
      : "text-slate-600 hover:bg-slate-100",
  };
}

function BadgeStatus({ valor }) {
  const status = classificarBpm(valor);

  const classe =
    status === "Normal"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/30"
      : status === "Baixo"
        ? "bg-sky-500/15 text-sky-300 border-sky-400/30"
        : status === "Elevado"
          ? "bg-amber-500/15 text-amber-300 border-amber-400/30"
          : "bg-slate-500/15 text-slate-300 border-slate-400/30";

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${classe}`}>
      {status}
    </span>
  );
}

function Card({ titulo, valor, subtitulo, temaEscuro }) {
  const ui = obterClasses(temaEscuro);

  return (
    <div className={`rounded-3xl p-5 ${ui.painel}`}>
      <p className={`text-sm ${ui.textoSuave}`}>{titulo}</p>
      <h3 className="mt-2 break-words text-2xl font-black">{valor}</h3>
      {subtitulo && <p className={`mt-1 break-words text-sm ${ui.textoMuitoSuave}`}>{subtitulo}</p>}
    </div>
  );
}

function BotaoTema({ temaEscuro, alternarTema }) {
  const ui = obterClasses(temaEscuro);

  return (
    <button
      onClick={alternarTema}
      className={ui.botaoSecundario}
    >
      {temaEscuro ? "Modo claro" : "Modo escuro"}
    </button>
  );
}

function TelaLogin({ temaEscuro, alternarTema }) {
  const ui = obterClasses(temaEscuro);

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
    <main className={`${ui.pagina} px-5 py-8 transition-colors duration-300`}>
      <div className="mx-auto mb-5 flex w-full max-w-5xl justify-end">
        <BotaoTema temaEscuro={temaEscuro} alternarTema={alternarTema} />
      </div>

      <section className="mx-auto flex min-h-[82vh] w-full max-w-5xl items-center justify-center">
        <div className={`grid w-full overflow-hidden rounded-[2rem] ${ui.painel} md:grid-cols-2`}>
          <div className="bg-gradient-to-br from-rose-600 via-red-700 to-slate-950 p-8 text-white md:p-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 text-3xl">
              ♥
            </div>

            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
              Monitor BPM
            </p>

            <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
              Acompanhamento cardíaco inteligente
            </h1>

            <p className="mt-5 text-sm leading-6 text-white/80">
              Plataforma conectada ao ESP32 para visualizar as leituras de BPM em tempo real e consultar o histórico do paciente.
            </p>

            <div className="mt-8 rounded-3xl bg-white/10 p-5 text-sm text-white/90">
              Dispositivo vinculado: <strong>{CODIGO_DISPOSITIVO}</strong>
            </div>
          </div>

          <div className="p-8 md:p-10">
            <h2 className="text-3xl font-black">
              {modoCadastro ? "Criar cadastro" : "Entrar"}
            </h2>

            <p className={`mt-2 text-sm ${ui.textoSuave}`}>
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
                    className={ui.input}
                    placeholder="Nome do paciente"
                    value={form.nome}
                    onChange={(e) => atualizarCampo("nome", e.target.value)}
                  />

                  <input
                    className={ui.input}
                    placeholder="Idade"
                    type="number"
                    value={form.idade}
                    onChange={(e) => atualizarCampo("idade", e.target.value)}
                  />

                  <select
                    className={ui.input}
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
                className={ui.input}
                placeholder="E-mail"
                type="email"
                value={form.email}
                onChange={(e) => atualizarCampo("email", e.target.value)}
              />

              <input
                className={ui.input}
                placeholder="Senha"
                type="password"
                value={form.senha}
                onChange={(e) => atualizarCampo("senha", e.target.value)}
              />

              {modoCadastro && (
                <input
                  className={ui.input}
                  placeholder="Confirmar senha"
                  type="password"
                  value={form.confirmarSenha}
                  onChange={(e) => atualizarCampo("confirmarSenha", e.target.value)}
                />
              )}

              {mensagem && (
                <div className={`rounded-2xl px-4 py-3 text-sm ${temaEscuro ? "border border-white/10 bg-white/5 text-slate-200" : "border border-slate-200 bg-slate-50 text-slate-700"}`}>
                  {mensagem}
                </div>
              )}

              <button
                disabled={carregando}
                className="rounded-2xl bg-rose-600 px-4 py-3 font-bold text-white transition hover:bg-rose-500 disabled:opacity-60"
              >
                {carregando ? "Aguarde..." : modoCadastro ? "Cadastrar" : "Entrar"}
              </button>
            </form>

            <button
              className="mt-5 text-sm font-semibold text-rose-500 hover:text-rose-400"
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

function Dashboard({ sessao, perfil, temaEscuro }) {
  const ui = obterClasses(temaEscuro);

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
  const menor = calcularMenor(leiturasUsuario);
  const maior = calcularMaior(leiturasUsuario);

  const nome =
    perfil?.nome || sessao?.user?.user_metadata?.nome || sessao?.user?.email || "Paciente";

  const espEnviaParaOutroPerfil =
    leiturasUsuario.length === 0 &&
    leiturasGerais.length > 0 &&
    leiturasGerais[0]?.perfil_id !== sessao.user.id;

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-rose-600 via-red-700 to-slate-950 p-7 text-white shadow-2xl shadow-rose-950/30">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/70">
              Leitura atual
            </p>

            <h1 className="mt-4 text-6xl font-black tracking-tight">
              {carregando ? "..." : bpmAtual ? `${bpmAtual}` : "--"}
              <span className="ml-2 text-2xl font-bold text-white/70">BPM</span>
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/80">
              Última leitura recebida em {formatarDataHora(ultima?.recebido_em)}.
            </p>
          </div>

          <div className="rounded-3xl bg-white/10 p-5 text-center backdrop-blur">
            <p className="text-sm text-white/70">Status atual</p>
            <div className="mt-3">
              <BadgeStatus valor={bpmAtual} />
            </div>
          </div>
        </div>
      </div>

      {erro && (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          {erro}
        </div>
      )}

      {espEnviaParaOutroPerfil && (
        <div className="rounded-2xl border border-yellow-400/30 bg-yellow-500/10 px-5 py-4 text-sm text-yellow-300">
          O ESP32 está enviando leituras, mas elas parecem estar vinculadas a outro perfil_id.
          <br />
          ID do usuário logado: <span className="font-mono">{sessao.user.id}</span>
          <br />
          Último perfil_id recebido: <span className="font-mono">{leiturasGerais[0]?.perfil_id}</span>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-4">
        <Card temaEscuro={temaEscuro} titulo="Paciente" valor={nome} subtitulo={sessao.user.email} />
        <Card temaEscuro={temaEscuro} titulo="Média recente" valor={media ? `${media} BPM` : "--"} subtitulo="últimas 30 leituras" />
        <Card temaEscuro={temaEscuro} titulo="Menor recente" valor={menor ? `${menor} BPM` : "--"} subtitulo="últimas 30 leituras" />
        <Card temaEscuro={temaEscuro} titulo="Maior recente" valor={maior ? `${maior} BPM` : "--"} subtitulo="últimas 30 leituras" />
      </div>

      <div className={`rounded-3xl p-5 ${ui.painel}`}>
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-black">Últimas leituras</h2>
            <p className={`mt-1 text-sm ${ui.textoSuave}`}>
              Dados recentes enviados pelo ESP32.
            </p>
          </div>

          <button
            onClick={carregarLeituras}
            className={ui.botaoSecundario}
          >
            Atualizar agora
          </button>
        </div>

        <div className={`mt-5 overflow-hidden rounded-2xl ${temaEscuro ? "border border-white/10" : "border border-slate-200"}`}>
          {leiturasUsuario.length === 0 ? (
            <div className={`p-5 text-sm ${ui.textoSuave}`}>
              Nenhuma leitura encontrada para este usuário.
            </div>
          ) : (
            <div className={temaEscuro ? "divide-y divide-white/10" : "divide-y divide-slate-200"}>
              {leiturasUsuario.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between gap-4 px-5 py-4 ${temaEscuro ? "hover:bg-white/5" : "hover:bg-slate-50"}`}
                >
                  <div>
                    <p className="font-black">{item.valor_bpm} BPM</p>
                    <p className={`text-sm ${ui.textoSuave}`}>{formatarDataHora(item.recebido_em)}</p>
                  </div>

                  <BadgeStatus valor={item.valor_bpm} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Historico({ sessao, temaEscuro }) {
  const ui = obterClasses(temaEscuro);

  const [leituras, setLeituras] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [dataAberta, setDataAberta] = useState(null);

  async function carregarHistorico() {
    if (!sessao?.user?.id) return;

    const { data, error } = await supabase
      .from("bpm_leituras")
      .select("id, perfil_id, valor_bpm, recebido_em")
      .eq("perfil_id", sessao.user.id)
      .order("recebido_em", { ascending: false })
      .limit(500);

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
        menor: calcularMenor(itens),
        maior: calcularMaior(itens),
      };
    });
  }, [leituras]);

  function alternarData(data) {
    setDataAberta((atual) => (atual === data ? null : data));
  }

  return (
    <section className="space-y-6">
      <div className={`rounded-3xl p-6 ${ui.painel}`}>
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-black">Histórico diário</h1>
            <p className={`mt-2 text-sm ${ui.textoSuave}`}>
              Clique em uma data para visualizar as leituras registradas no dia.
            </p>
          </div>

          <button
            onClick={carregarHistorico}
            className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-500"
          >
            Atualizar
          </button>
        </div>
      </div>

      {erro && (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          {erro}
        </div>
      )}

      {carregando ? (
        <div className={`rounded-3xl p-6 ${ui.painel} ${ui.textoSuave}`}>
          Carregando histórico...
        </div>
      ) : grupos.length === 0 ? (
        <div className={`rounded-3xl p-6 ${ui.painel} ${ui.textoSuave}`}>
          Nenhuma leitura encontrada para este usuário.
        </div>
      ) : (
        <div className="space-y-4">
          {grupos.map((grupo) => {
            const aberto = dataAberta === grupo.data;

            return (
              <div key={grupo.data} className={`overflow-hidden rounded-3xl ${ui.painel}`}>
                <button
                  onClick={() => alternarData(grupo.data)}
                  className={`flex w-full flex-col justify-between gap-4 p-5 text-left transition md:flex-row md:items-center ${
                    temaEscuro ? "hover:bg-white/5" : "hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <h2 className="text-xl font-black">{grupo.data}</h2>
                    <p className={`mt-1 text-sm ${ui.textoSuave}`}>
                      {grupo.itens.length} leituras registradas
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={temaEscuro ? "rounded-full bg-white/10 px-3 py-1" : "rounded-full bg-slate-100 px-3 py-1"}>
                      Média: {grupo.media} BPM
                    </span>
                    <span className={temaEscuro ? "rounded-full bg-white/10 px-3 py-1" : "rounded-full bg-slate-100 px-3 py-1"}>
                      Mín: {grupo.menor} BPM
                    </span>
                    <span className={temaEscuro ? "rounded-full bg-white/10 px-3 py-1" : "rounded-full bg-slate-100 px-3 py-1"}>
                      Máx: {grupo.maior} BPM
                    </span>
                    <span className="rounded-full bg-rose-600 px-3 py-1 text-white">
                      {aberto ? "Ocultar" : "Ver dados"}
                    </span>
                  </div>
                </button>

                {aberto && (
                  <div className={temaEscuro ? "border-t border-white/10" : "border-t border-slate-200"}>
                    <div className={temaEscuro ? "divide-y divide-white/10" : "divide-y divide-slate-200"}>
                      {grupo.itens.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4">
                          <div>
                            <p className="font-black">{item.valor_bpm} BPM</p>
                            <p className={`text-sm ${ui.textoSuave}`}>{classificarBpm(item.valor_bpm)}</p>
                          </div>

                          <div className="text-right">
                            <p className={`text-sm font-semibold ${ui.textoSuave}`}>{formatarHora(item.recebido_em)}</p>
                            <BadgeStatus valor={item.valor_bpm} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Perfil({ sessao, perfil, temaEscuro }) {
  const ui = obterClasses(temaEscuro);

  return (
    <section className="space-y-6">
      <div className={`rounded-3xl p-6 ${ui.painel}`}>
        <h1 className="text-3xl font-black">Perfil</h1>
        <p className={`mt-2 text-sm ${ui.textoSuave}`}>
          Dados do paciente logado e informações de vínculo do dispositivo.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card
          temaEscuro={temaEscuro}
          titulo="Nome"
          valor={perfil?.nome || sessao?.user?.user_metadata?.nome || "Não informado"}
        />

        <Card temaEscuro={temaEscuro} titulo="E-mail" valor={sessao?.user?.email} />

        <Card temaEscuro={temaEscuro} titulo="Idade" valor={perfil?.idade ?? "Não informado"} />

        <Card temaEscuro={temaEscuro} titulo="Sexo" valor={perfil?.sexo || "Não informado"} />

        <div className={`rounded-3xl p-5 md:col-span-2 ${ui.painel}`}>
          <p className={`text-sm ${ui.textoSuave}`}>ID do usuário logado</p>
          <p className="mt-2 break-all font-mono text-sm">
            {sessao?.user?.id}
          </p>
        </div>

        <div className={`rounded-3xl p-5 md:col-span-2 ${ui.painel}`}>
          <p className={`text-sm ${ui.textoSuave}`}>Código do dispositivo</p>
          <p className="mt-2 break-all font-mono text-sm">
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
  const [tema, setTema] = useState(() => localStorage.getItem("tema-bpm") || "escuro");

  const temaEscuro = tema === "escuro";
  const ui = obterClasses(temaEscuro);

  function alternarTema() {
    setTema((atual) => {
      const novoTema = atual === "escuro" ? "claro" : "escuro";
      localStorage.setItem("tema-bpm", novoTema);
      return novoTema;
    });
  }

  async function vincularDispositivoAutomaticamente() {
    const { data, error } = await supabase.rpc("vincular_dispositivo_principal");

    if (error) {
      console.error("Erro ao vincular dispositivo automaticamente:", error);
      return null;
    }

    console.log("Dispositivo vinculado automaticamente:", data);
    return data;
  }

  async function carregarPerfil(sessaoAtual) {
    if (!sessaoAtual?.user?.id) {
      setPerfil(null);
      return;
    }

    await vincularDispositivoAutomaticamente();

    const { data, error } = await supabase
      .from("perfis")
      .select("*")
      .eq("id", sessaoAtual.user.id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar perfil:", error);
      setPerfil(null);
      return;
    }

    setPerfil(data);
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
      <main className={`flex min-h-screen items-center justify-center ${temaEscuro ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-950"}`}>
        <div className={`rounded-3xl px-8 py-6 ${ui.painel}`}>
          Carregando...
        </div>
      </main>
    );
  }

  if (!sessao) {
    return <TelaLogin temaEscuro={temaEscuro} alternarTema={alternarTema} />;
  }

  const nome =
    perfil?.nome || sessao?.user?.user_metadata?.nome || sessao?.user?.email || "Paciente";

  return (
    <main className={`${ui.pagina} transition-colors duration-300`}>
      <div className="mx-auto flex w-full max-w-7xl">
        <aside className={`sticky top-0 hidden h-screen w-72 border-r p-6 md:block ${temaEscuro ? "border-white/10 bg-slate-900" : "border-slate-200 bg-white"}`}>
          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-rose-600/20 text-2xl text-rose-500">
              ♥
            </div>

            <h1 className="mt-5 text-2xl font-black">Monitor BPM</h1>
            <p className={`mt-1 text-sm ${ui.textoSuave}`}>Painel do paciente</p>

            <div className={`mt-8 rounded-3xl p-5 ${ui.painelForte}`}>
              <p className={`text-sm ${ui.textoSuave}`}>Bem-vindo</p>
              <p className="mt-2 text-xl font-black">{nome}</p>
              <p className={`mt-1 break-all text-sm ${ui.textoMuitoSuave}`}>{sessao.user.email}</p>
            </div>
          </div>

          <nav className="mt-10 flex flex-col gap-3">
            <button
              onClick={() => setAbaAtiva("inicio")}
              className={`rounded-2xl px-4 py-3 text-left font-semibold transition ${
                abaAtiva === "inicio" ? ui.menuAtivo : ui.menuInativo
              }`}
            >
              Início
            </button>

            <button
              onClick={() => setAbaAtiva("historico")}
              className={`rounded-2xl px-4 py-3 text-left font-semibold transition ${
                abaAtiva === "historico" ? ui.menuAtivo : ui.menuInativo
              }`}
            >
              Histórico
            </button>

            <button
              onClick={() => setAbaAtiva("perfil")}
              className={`rounded-2xl px-4 py-3 text-left font-semibold transition ${
                abaAtiva === "perfil" ? ui.menuAtivo : ui.menuInativo
              }`}
            >
              Perfil
            </button>
          </nav>

          <div className="absolute bottom-6 left-6 right-6 space-y-3">
            <BotaoTema temaEscuro={temaEscuro} alternarTema={alternarTema} />

            <button
              onClick={sair}
              className={ui.botaoSecundario + " w-full"}
            >
              Sair
            </button>
          </div>
        </aside>

        <section className="w-full px-5 pb-28 pt-6 md:px-8 md:pb-10">
          <header className={`mb-6 flex items-center justify-between rounded-3xl p-5 md:hidden ${ui.painel}`}>
            <div>
              <p className={`text-sm ${ui.textoSuave}`}>Monitor BPM</p>
              <h1 className="font-black">{nome}</h1>
            </div>

            <div className="flex gap-2">
              <BotaoTema temaEscuro={temaEscuro} alternarTema={alternarTema} />

              <button
                onClick={sair}
                className={ui.botaoSecundario}
              >
                Sair
              </button>
            </div>
          </header>

          {abaAtiva === "inicio" && <Dashboard sessao={sessao} perfil={perfil} temaEscuro={temaEscuro} />}
          {abaAtiva === "historico" && <Historico sessao={sessao} temaEscuro={temaEscuro} />}
          {abaAtiva === "perfil" && <Perfil sessao={sessao} perfil={perfil} temaEscuro={temaEscuro} />}
        </section>

        <nav className={`fixed bottom-0 left-0 right-0 z-50 grid grid-cols-3 border-t p-3 md:hidden ${temaEscuro ? "border-white/10 bg-slate-900" : "border-slate-200 bg-white"}`}>
          <button
            onClick={() => setAbaAtiva("inicio")}
            className={`rounded-2xl py-3 text-sm font-bold ${
              abaAtiva === "inicio" ? "bg-rose-600 text-white" : ui.textoSuave
            }`}
          >
            Início
          </button>

          <button
            onClick={() => setAbaAtiva("historico")}
            className={`rounded-2xl py-3 text-sm font-bold ${
              abaAtiva === "historico" ? "bg-rose-600 text-white" : ui.textoSuave
            }`}
          >
            Histórico
          </button>

          <button
            onClick={() => setAbaAtiva("perfil")}
            className={`rounded-2xl py-3 text-sm font-bold ${
              abaAtiva === "perfil" ? "bg-rose-600 text-white" : ui.textoSuave
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
