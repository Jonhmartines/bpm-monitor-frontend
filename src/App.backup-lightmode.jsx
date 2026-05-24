import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

const CODIGO_DISPOSITIVO = "ESP32_PRINCIPAL";

const MEDICAL_SLIDES = [
  "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1580281657527-47a0c1f4af3d?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=1600&q=80",
];

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

  const soma = lista.reduce((total, item) => total + Number(item.valor_bpm || 0), 0);
  return Math.round(soma / lista.length);
}

function calcularMenor(lista) {
  if (!lista.length) return null;
  return Math.min(...lista.map((item) => Number(item.valor_bpm || 0)));
}

function calcularMaior(lista) {
  if (!lista.length) return null;
  return Math.max(...lista.map((item) => Number(item.valor_bpm || 0)));
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
      ? "rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none transition focus:border-rose-400"
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

function IconeLogo() {
  return (
    <svg viewBox="0 0 40 40" className="h-8 w-8">
      <path
        d="M6 21h6l3-8 6 16 4-10h9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoBpm({ compacto = false }) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-rose-600 text-white shadow-xl shadow-rose-900/25">
        <IconeLogo />
      </div>

      {!compacto && (
        <div>
          <h1 className="text-2xl font-black">Monitor BPM</h1>
          <p className="text-sm text-slate-400">Painel de acompanhamento</p>
        </div>
      )}
    </div>
  );
}

function BotaoTema({ temaEscuro, alternarTema }) {
  const ui = obterClasses(temaEscuro);

  return (
    <button onClick={alternarTema} className={ui.botaoSecundario}>
      {temaEscuro ? "Modo claro" : "Modo escuro"}
    </button>
  );
}

function BadgeStatus({ valor }) {
  const status = classificarBpm(valor);

  const classe =
    status === "Normal"
      ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300"
      : status === "Baixo"
        ? "border-sky-400/30 bg-sky-500/15 text-sky-300"
        : status === "Elevado"
          ? "border-amber-400/30 bg-amber-500/15 text-amber-300"
          : "border-slate-400/30 bg-slate-500/15 text-slate-300";

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${classe}`}>
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

function GraficoBpm({ dados, temaEscuro, titulo = "Variação recente", altura = 260 }) {
  const [hover, setHover] = useState(null);

  const dadosOrdenados = [...dados].reverse();
  const pontosOriginais = dadosOrdenados
    .map((item) => ({
      id: item.id,
      valor: Number(item.valor_bpm || 0),
      recebido_em: item.recebido_em,
    }))
    .filter((item) => item.valor > 0);

  if (!pontosOriginais.length) {
    return (
      <div className={`flex h-[260px] items-center justify-center rounded-3xl ${
        temaEscuro ? "bg-slate-950/70 text-slate-500" : "bg-slate-50 text-slate-400"
      }`}>
        Sem dados para o gráfico
      </div>
    );
  }

  const largura = Math.max(1200, pontosOriginais.length * 34);
  const paddingX = 42;
  const paddingY = 34;

  const min = Math.min(...pontosOriginais.map((item) => item.valor));
  const max = Math.max(...pontosOriginais.map((item) => item.valor));
  const faixa = Math.max(max - min, 1);

  const pontos = pontosOriginais.map((item, index) => {
    const x =
      pontosOriginais.length === 1
        ? largura / 2
        : paddingX + (index * (largura - paddingX * 2)) / (pontosOriginais.length - 1);

    const y = paddingY + ((max - item.valor) * (altura - paddingY * 2)) / faixa;

    return {
      ...item,
      x,
      y,
    };
  });

  const linha = pontos.map((ponto) => `${ponto.x},${ponto.y}`).join(" ");
  const corLinha = temaEscuro ? "#fb7185" : "#e11d48";
  const corGrade = temaEscuro ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.12)";
  const corTexto = temaEscuro ? "#94a3b8" : "#64748b";
  const fundoTooltip = temaEscuro ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.98)";
  const bordaTooltip = temaEscuro ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)";
  const textoTooltip = temaEscuro ? "#ffffff" : "#0f172a";

  return (
    <div className={`rounded-3xl p-5 ${temaEscuro ? "bg-slate-950/70" : "bg-slate-50"}`}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className={`text-sm ${temaEscuro ? "text-slate-400" : "text-slate-500"}`}>{titulo}</p>
          <p className="text-lg font-black">{pontos.length} leituras</p>
        </div>

        <div className="text-right">
          <p className={`text-xs ${temaEscuro ? "text-slate-500" : "text-slate-400"}`}>Mín / Máx</p>
          <p className="text-sm font-bold">{min} / {max} BPM</p>
        </div>
      </div>

      <div className="relative overflow-x-auto pb-2">
        {hover && (
          <div
            className="pointer-events-none absolute z-20 rounded-2xl px-3 py-2 text-xs shadow-lg"
            style={{
              left: `${hover.left}px`,
              top: `${hover.top}px`,
              transform: "translate(-50%, -110%)",
              background: fundoTooltip,
              color: textoTooltip,
              border: `1px solid ${bordaTooltip}`,
              minWidth: "120px",
            }}
          >
            <div className="font-black">{hover.valor} BPM</div>
            <div className={temaEscuro ? "text-slate-300" : "text-slate-500"}>
              {formatarHora(hover.data)}
            </div>
          </div>
        )}

        <svg viewBox={`0 0 ${largura} ${altura}`} className="h-72 w-full min-w-[1200px]">
          <line x1={paddingX} y1={paddingY} x2={largura - paddingX} y2={paddingY} stroke={corGrade} strokeWidth="1" />
          <line x1={paddingX} y1={altura / 2} x2={largura - paddingX} y2={altura / 2} stroke={corGrade} strokeWidth="1" />
          <line x1={paddingX} y1={altura - paddingY} x2={largura - paddingX} y2={altura - paddingY} stroke={corGrade} strokeWidth="1" />

          <text x={paddingX} y={paddingY - 10} fill={corTexto} fontSize="12">{max}</text>
          <text x={paddingX} y={altura - paddingY + 20} fill={corTexto} fontSize="12">{min}</text>

          <polyline
            points={linha}
            fill="none"
            stroke={corLinha}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {pontos.map((ponto) => (
            <circle
              key={ponto.id}
              cx={ponto.x}
              cy={ponto.y}
              r="6"
              fill={temaEscuro ? "#0f172a" : "#ffffff"}
              stroke={corLinha}
              strokeWidth="3"
              onMouseEnter={() => setHover({
                valor: ponto.valor,
                data: ponto.recebido_em,
                left: ponto.x,
                top: ponto.y,
              })}
              onMouseMove={() => setHover({
                valor: ponto.valor,
                data: ponto.recebido_em,
                left: ponto.x,
                top: ponto.y,
              })}
              onMouseLeave={() => setHover(null)}
            >
              <title>{`${ponto.valor} BPM - ${formatarHora(ponto.recebido_em)}`}</title>
            </circle>
          ))}
        </svg>
      </div>
    </div>
  );
}

function GraficoBarrasBpm({ dados, temaEscuro }) {
  const dadosOrdenados = [...dados].reverse();
  const valores = dadosOrdenados.map((item) => Number(item.valor_bpm || 0)).filter((valor) => valor > 0);

  if (!valores.length) {
    return (
      <div className={`rounded-3xl p-6 text-sm ${temaEscuro ? "bg-slate-950/70 text-slate-500" : "bg-slate-50 text-slate-400"}`}>
        Sem dados para o gráfico deste dia.
      </div>
    );
  }

  const max = Math.max(...valores);
  const min = Math.min(...valores);

  return (
    <div className={`rounded-3xl p-5 ${temaEscuro ? "bg-slate-950/70" : "bg-slate-50"}`}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className={`text-sm ${temaEscuro ? "text-slate-400" : "text-slate-500"}`}>Gráfico do dia</p>
          <p className="text-lg font-black">{valores.length} leituras</p>
        </div>

        <div className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-bold text-white">
          {min} - {max} BPM
        </div>
      </div>

      <div className="overflow-x-auto pb-3">
        <div className="flex h-56 min-w-max items-end gap-3 px-1">
          {dadosOrdenados.map((item) => {
            const valor = Number(item.valor_bpm || 0);
            const altura = Math.max((valor / Math.max(max, 1)) * 100, 8);

            return (
              <div key={item.id} className="flex w-10 flex-col items-center gap-2">
                <div className="flex h-44 w-full items-end">
                  <div
                    className="w-full rounded-t-xl bg-rose-600"
                    style={{ height: `${altura}%` }}
                    title={`${valor} BPM - ${formatarHora(item.recebido_em)}`}
                  />
                </div>

                <span className={`text-[10px] ${temaEscuro ? "text-slate-500" : "text-slate-400"}`}>
                  {formatarHora(item.recebido_em).slice(0, 5)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TelaLogin({ temaEscuro, alternarTema }) {
  const ui = obterClasses(temaEscuro);

  const [modoCadastro, setModoCadastro] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [slideAtual, setSlideAtual] = useState(0);

  const [form, setForm] = useState({
    nome: "",
    idade: "",
    sexo: "masculino",
    email: "",
    senha: "",
    confirmarSenha: "",
  });

  useEffect(() => {
    const intervalo = setInterval(() => {
      setSlideAtual((atual) => (atual + 1) % MEDICAL_SLIDES.length);
    }, 4000);

    return () => clearInterval(intervalo);
  }, []);

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
    <main className={`${ui.pagina} relative min-h-screen overflow-hidden transition-colors duration-300`}>
      <div className="absolute inset-0">
        {MEDICAL_SLIDES.map((slide, index) => (
          <div
            key={slide}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
              slideAtual === index ? "opacity-100" : "opacity-0"
            }`}
            style={{ backgroundImage: `url(${slide})` }}
          />
        ))}

        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-950/80 to-rose-950/65" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-slate-950/80" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6">
        <header className="flex items-center justify-between">
          <LogoBpm />
          <BotaoTema temaEscuro={temaEscuro} alternarTema={alternarTema} />
        </header>

        <section className="flex flex-1 items-center justify-center py-10">
          <div className="grid w-full max-w-6xl gap-8 xl:grid-cols-[1fr_480px]">
            <div className="hidden xl:flex xl:flex-col xl:justify-center">
              <div className="max-w-2xl">
                <div className={`mb-6 inline-flex rounded-full px-4 py-2 text-sm font-semibold ${
                  temaEscuro
                    ? "border border-white/10 bg-white/5 text-slate-300"
                    : "border border-slate-200 bg-white text-slate-600 shadow-sm"
                }`}>
                  Dispositivo: {CODIGO_DISPOSITIVO}
                </div>

                <h2 className="text-5xl font-black leading-tight">Painel de BPM</h2>

                <p className="mt-5 max-w-xl text-lg leading-8 text-slate-200">
                  Acompanhe leituras do ESP32, visualize o valor atual e consulte o histórico diário do paciente.
                </p>

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  <div className="rounded-3xl border border-white/10 bg-slate-900/55 p-5 backdrop-blur-md">
                    <p className="text-xl font-black text-white">Atual</p>
                    <p className="mt-2 text-sm text-slate-300">BPM recente com gráfico.</p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-slate-900/55 p-5 backdrop-blur-md">
                    <p className="text-xl font-black text-white">Histórico</p>
                    <p className="mt-2 text-sm text-slate-300">Datas clicáveis e gráficos.</p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-slate-900/55 p-5 backdrop-blur-md">
                    <p className="text-xl font-black text-white">Perfil</p>
                    <p className="mt-2 text-sm text-slate-300">Paciente vinculado.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mx-auto flex w-full max-w-md flex-col justify-center">
              <div className="mb-4 flex items-center justify-center gap-2">
                {MEDICAL_SLIDES.map((_, index) => (
                  <span
                    key={index}
                    className={`h-2.5 rounded-full transition-all ${
                      slideAtual === index ? "w-8 bg-rose-500" : "w-2.5 bg-white/35"
                    }`}
                  />
                ))}
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-black/35 backdrop-blur-xl">
                <div className="mb-6 text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-600 text-white shadow-lg shadow-rose-900/30">
                      <IconeLogo />
                    </div>
                  </div>

                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Acesso</p>
                  <h2 className="mt-3 text-3xl font-black">
                    {modoCadastro ? "Criar conta" : "Entrar"}
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    {modoCadastro ? "Cadastre os dados do paciente." : "Entre para acessar o painel."}
                  </p>
                </div>

                <div className="mb-6 grid grid-cols-2 rounded-2xl bg-slate-950 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMensagem("");
                      setModoCadastro(false);
                    }}
                    className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                      !modoCadastro
                        ? "bg-rose-600 text-white shadow-lg shadow-rose-900/20"
                        : "text-slate-400"
                    }`}
                  >
                    Login
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMensagem("");
                      setModoCadastro(true);
                    }}
                    className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                      modoCadastro
                        ? "bg-rose-600 text-white shadow-lg shadow-rose-900/20"
                        : "text-slate-400"
                    }`}
                  >
                    Cadastro
                  </button>
                </div>

                <form onSubmit={modoCadastro ? cadastrar : entrar} className="flex flex-col gap-4">
                  {modoCadastro && (
                    <>
                      <input
                        className={ui.input}
                        placeholder="Nome do paciente"
                        value={form.nome}
                        onChange={(e) => atualizarCampo("nome", e.target.value)}
                      />

                      <div className="grid gap-4 sm:grid-cols-2">
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
                      </div>
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
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                      {mensagem}
                    </div>
                  )}

                  <button
                    disabled={carregando}
                    className="mt-2 rounded-2xl bg-rose-600 px-4 py-4 font-black text-white shadow-lg shadow-rose-900/20 transition hover:bg-rose-500 disabled:opacity-60"
                  >
                    {carregando ? "Aguarde..." : modoCadastro ? "Criar cadastro" : "Entrar no painel"}
                  </button>
                </form>

                <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                    <p className="text-xs text-slate-400">Tempo real</p>
                    <p className="mt-1 text-sm font-black">BPM</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                    <p className="text-xs text-slate-400">Histórico</p>
                    <p className="mt-1 text-sm font-black">Diário</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                    <p className="text-xs text-slate-400">Vínculo</p>
                    <p className="mt-1 text-sm font-black">Auto</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
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
      <div className={`grid gap-5 rounded-[2rem] p-5 ${ui.painel} xl:grid-cols-[0.85fr_1.15fr]`}>
        <div className="rounded-[1.6rem] bg-gradient-to-br from-rose-600 via-red-700 to-slate-950 p-7 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/70">
            BPM atual
          </p>

          <h1 className="mt-4 text-7xl font-black tracking-tight">
            {carregando ? "..." : bpmAtual ? `${bpmAtual}` : "--"}
            <span className="ml-2 text-2xl font-bold text-white/70">BPM</span>
          </h1>

          <div className="mt-5">
            <BadgeStatus valor={bpmAtual} />
          </div>

          <p className="mt-5 text-sm leading-6 text-white/80">
            Última leitura recebida em {formatarDataHora(ultima?.recebido_em)}.
          </p>
        </div>

        <GraficoBpm dados={leiturasUsuario.slice(0, 20)} temaEscuro={temaEscuro} titulo="Variação recente" />
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

      <div className="grid gap-5 lg:grid-cols-4">
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

          <button onClick={carregarLeituras} className={ui.botaoSecundario}>
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

    return Object.entries(mapa).map(([data, itens]) => ({
      data,
      itens,
      media: calcularMedia(itens),
      menor: calcularMenor(itens),
      maior: calcularMaior(itens),
    }));
  }, [leituras]);

  const grupoSelecionado = grupos.find((grupo) => grupo.data === dataAberta);

  if (grupoSelecionado) {
    return (
      <section className="space-y-6">
        <div className={`rounded-3xl p-6 ${ui.painel}`}>
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <p className={`text-sm ${ui.textoSuave}`}>Histórico diário</p>
              <h1 className="mt-1 text-3xl font-black">{grupoSelecionado.data}</h1>
              <p className={`mt-2 text-sm ${ui.textoSuave}`}>
                {grupoSelecionado.itens.length} leituras registradas neste dia.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={carregarHistorico}
                className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-500"
              >
                Atualizar
              </button>

              <button
                onClick={() => setDataAberta(null)}
                className={ui.botaoSecundario}
              >
                Voltar para histórico
              </button>
            </div>
          </div>
        </div>

        <div className={`rounded-3xl p-5 ${ui.painel}`}>
          <GraficoBpm
            dados={grupoSelecionado.itens}
            temaEscuro={temaEscuro}
            altura={280}
            titulo="Variação do dia"
          />
        </div>

        <div className={`rounded-3xl p-5 ${ui.painel}`}>
          <GraficoBarrasBpm dados={grupoSelecionado.itens} temaEscuro={temaEscuro} />
        </div>

        <div className={`rounded-3xl ${ui.painel}`}>
          <div className={`grid grid-cols-3 gap-3 border-b p-5 text-sm font-bold ${temaEscuro ? "border-white/10 text-slate-300" : "border-slate-200 text-slate-600"}`}>
            <span>BPM</span>
            <span>Status</span>
            <span className="text-right">Horário</span>
          </div>

          <div className={temaEscuro ? "divide-y divide-white/10" : "divide-y divide-slate-200"}>
            {grupoSelecionado.itens.map((item) => (
              <div key={item.id} className="grid grid-cols-3 items-center gap-3 px-5 py-4">
                <p className="font-black">{item.valor_bpm} BPM</p>
                <BadgeStatus valor={item.valor_bpm} />
                <p className={`text-right text-sm font-semibold ${ui.textoSuave}`}>
                  {formatarHora(item.recebido_em)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className={`rounded-3xl p-6 ${ui.painel}`}>
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <h1 className="text-3xl font-black">Histórico diário</h1>
            <p className={`mt-2 text-sm ${ui.textoSuave}`}>
              Clique em uma data para visualizar as leituras e os gráficos do dia.
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
        <div className="grid gap-4 xl:grid-cols-2">
          {grupos.map((grupo) => (
            <button
              key={grupo.data}
              onClick={() => setDataAberta(grupo.data)}
              className={`rounded-3xl p-5 text-left transition ${ui.painel} ${
                temaEscuro ? "hover:bg-slate-800" : "hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black">{grupo.data}</h2>
                  <p className={`mt-1 text-sm ${ui.textoSuave}`}>
                    {grupo.itens.length} leituras registradas
                  </p>
                </div>

                <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white">
                  Ver
                </span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
                <div className={temaEscuro ? "rounded-2xl bg-white/10 p-3" : "rounded-2xl bg-slate-100 p-3"}>
                  <p className={ui.textoSuave}>Média</p>
                  <p className="mt-1 font-black">{grupo.media}</p>
                </div>

                <div className={temaEscuro ? "rounded-2xl bg-white/10 p-3" : "rounded-2xl bg-slate-100 p-3"}>
                  <p className={ui.textoSuave}>Mín</p>
                  <p className="mt-1 font-black">{grupo.menor}</p>
                </div>

                <div className={temaEscuro ? "rounded-2xl bg-white/10 p-3" : "rounded-2xl bg-slate-100 p-3"}>
                  <p className={ui.textoSuave}>Máx</p>
                  <p className="mt-1 font-black">{grupo.maior}</p>
                </div>
              </div>
            </button>
          ))}
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

      <div className="grid gap-5 lg:grid-cols-2">
        <Card
          temaEscuro={temaEscuro}
          titulo="Nome"
          valor={perfil?.nome || sessao?.user?.user_metadata?.nome || "Não informado"}
        />

        <Card temaEscuro={temaEscuro} titulo="E-mail" valor={sessao?.user?.email} />

        <Card temaEscuro={temaEscuro} titulo="Idade" valor={perfil?.idade ?? "Não informado"} />

        <Card temaEscuro={temaEscuro} titulo="Sexo" valor={perfil?.sexo || "Não informado"} />

        <div className={`rounded-3xl p-5 lg:col-span-2 ${ui.painel}`}>
          <p className={`text-sm ${ui.textoSuave}`}>ID do usuário logado</p>
          <p className="mt-2 break-all font-mono text-sm">
            {sessao?.user?.id}
          </p>
        </div>

        <div className={`rounded-3xl p-5 lg:col-span-2 ${ui.painel}`}>
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
      <div className="mx-auto flex w-full max-w-[1700px]">
        <aside className={`sticky top-0 hidden h-screen w-80 shrink-0 border-r p-6 md:flex md:flex-col md:justify-between ${temaEscuro ? "border-white/10 bg-slate-900" : "border-slate-200 bg-white"}`}>
          <div>
            <LogoBpm />

            <div className={`mt-8 rounded-3xl p-5 ${ui.painelForte}`}>
              <p className={`text-sm ${ui.textoSuave}`}>Bem-vindo</p>
              <p className="mt-2 break-words text-xl font-black">{nome}</p>
              <p className={`mt-1 break-all text-sm ${ui.textoMuitoSuave}`}>{sessao.user.email}</p>
            </div>

            <nav className="mt-8 flex flex-col gap-3">
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
          </div>

          <div className="space-y-3">
            <BotaoTema temaEscuro={temaEscuro} alternarTema={alternarTema} />

            <button onClick={sair} className={ui.botaoSecundario + " w-full"}>
              Sair
            </button>
          </div>
        </aside>

        <section className="w-full min-w-0 px-5 pb-28 pt-6 md:px-8 md:pb-10">
          <header className={`mb-6 flex items-center justify-between rounded-3xl p-5 md:hidden ${ui.painel}`}>
            <LogoBpm compacto />

            <div className="flex gap-2">
              <BotaoTema temaEscuro={temaEscuro} alternarTema={alternarTema} />
              <button onClick={sair} className={ui.botaoSecundario}>Sair</button>
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
