import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

import anatomiaCardiaca from "./assets/mobile/anatomia-cardiaca.jpg";
import coracaoMonitoramento from "./assets/mobile/coracao-monitoramento.jpg";
import cuidadoCardiaco from "./assets/mobile/cuidado-cardiaco.jpg";
import consultaCardiologica from "./assets/mobile/consulta-cardiologica.jpg";

const CODIGO_DISPOSITIVO = "ESP32_PRINCIPAL";

const MEDICAL_SLIDES = [
  {
    desktop:
      "https://telemedicinamorsch.com.br/wp-content/uploads/2021/09/batidas-do-coracao-telemedicina-morsch.jpg",
    mobile: anatomiaCardiaca,
    mobileClass: "scale-100 object-[center_42%]",
    alt: "Imagem médica de anatomia cardíaca",
  },
  {
    desktop:
      "https://telemedicinamorsch.com.br/wp-content/uploads/2024/07/frequencia-cardiaca-telemedicina-morsch.jpg",
    mobile: coracaoMonitoramento,
    mobileClass: "scale-100 object-[center_48%]",
    alt: "Imagem de coração com gráfico cardíaco",
  },
  {
    desktop:
      "https://www.hospitalimigrantes.com.br/imgs/dXBsb2Fkcy9ub3RpY2lhcy8xNjY5NzUxMTkwLTEuanBn/800/500/N/crop",
    mobile: cuidadoCardiaco,
    mobileClass: "scale-[1.04] object-[center_40%]",
    alt: "Imagem médica com coração simbólico",
  },
  {
    desktop:
      "https://product-database.victorvision.com.br/uploads/thumb_heartbeat_8b13b2852b.png",
    mobile: consultaCardiologica,
    mobileClass: "scale-[1.03] object-[center_42%]",
    alt: "Paciente em consulta médica",
  },
  {
    desktop:
      "https://h3med.com.br/wp-content/uploads/2022/04/frequencia-cardiaca.jpg",
    mobile: anatomiaCardiaca,
    mobileClass: "scale-100 object-[center_42%]",
    alt: "Imagem complementar de frequência cardíaca",
  },
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
    inputWeb: temaEscuro
      ? "w-full rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-rose-400"
      : "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-rose-500",
    inputMobile: temaEscuro
      ? "w-full rounded-xl border border-white/10 bg-slate-950/48 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-rose-400"
      : "w-full rounded-xl border border-white/50 bg-white/50 px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-rose-500",
    botaoSecundario: temaEscuro
      ? "rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
      : "rounded-2xl bg-white/25 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/35",
    menuAtivo: "bg-rose-600 text-white shadow-lg shadow-rose-950/30",
    menuInativo: temaEscuro
      ? "text-slate-300 hover:bg-white/5"
      : "text-slate-600 hover:bg-slate-100",
  };
}

function IconeLogo() {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-600 shadow-lg shadow-rose-900/25">
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 text-white"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 12h4l2-4 3 8 2-4h7" />
      </svg>
    </div>
  );
}

function LogoBpm({ compacto = false, temaEscuro = true, sobreImagem = false }) {
  const tituloClasse = sobreImagem
    ? temaEscuro
      ? "text-black"
      : "text-white"
    : temaEscuro
    ? "text-white"
    : "text-slate-950";

  const subtituloClasse = sobreImagem
    ? temaEscuro
      ? "text-black/75"
      : "text-white/85"
    : temaEscuro
    ? "text-slate-400"
    : "text-slate-600";

  return (
    <div className="flex items-center gap-3">
      <IconeLogo />
      {!compacto && (
        <div>
          <p className={`text-lg font-bold leading-none ${tituloClasse}`}>Monitor BPM</p>
          <p className={`text-xs ${subtituloClasse}`}>Painel de acompanhamento</p>
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

function BotaoVisualizacao({ visualizacao, alternarVisualizacao, temaEscuro }) {
  const classe = temaEscuro
    ? "rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
    : "rounded-2xl bg-white/25 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/35";

  return (
    <button onClick={alternarVisualizacao} className={classe}>
      {visualizacao === "web" ? "Versão mobile" : "Versão web"}
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
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${classe}`}>
      {status}
    </span>
  );
}

function PageHeader({ titulo, subtitulo, temaEscuro, children }) {
  const ui = obterClasses(temaEscuro);

  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{titulo}</h1>
        {subtitulo && <p className={`mt-2 text-sm ${ui.textoSuave}`}>{subtitulo}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

function Card({ titulo, valor, subtitulo, temaEscuro }) {
  const ui = obterClasses(temaEscuro);

  return (
    <div className={`rounded-3xl p-5 ${ui.painel}`}>
      <p className={`text-sm ${ui.textoSuave}`}>{titulo}</p>
      <h3 className="mt-2 text-2xl font-bold">{valor}</h3>
      {subtitulo && <p className={`mt-2 text-sm ${ui.textoSuave}`}>{subtitulo}</p>}
    </div>
  );
}

function GraficoBpm({ dados, temaEscuro, titulo = "Variação recente", altura = 300 }) {
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
      <div
        className={`flex items-center justify-center rounded-3xl p-6 text-sm ${
          temaEscuro ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-600"
        }`}
      >
        Sem dados para o gráfico
      </div>
    );
  }

  const valores = pontosOriginais.map((item) => item.valor);
  const valoresOrdenados = [...valores].sort((a, b) => a - b);
  const realMin = Math.min(...valores);
  const realMax = Math.max(...valores);
  const p05 = valoresOrdenados[Math.floor((valoresOrdenados.length - 1) * 0.05)];
  const p95 = valoresOrdenados[Math.ceil((valoresOrdenados.length - 1) * 0.95)];
  const margem = Math.max(6, Math.round((p95 - p05) * 0.25));
  const dominioMin = Math.max(0, p05 - margem);
  const dominioMax = p95 + margem;
  const faixa = Math.max(dominioMax - dominioMin, 1);
  const largura = Math.max(1200, pontosOriginais.length * 55);
  const paddingX = 52;
  const paddingY = 42;

  const pontos = pontosOriginais.map((item, index) => {
    const x =
      pontosOriginais.length === 1
        ? largura / 2
        : paddingX + (index * (largura - paddingX * 2)) / (pontosOriginais.length - 1);

    const valorLimitado = Math.min(Math.max(item.valor, dominioMin), dominioMax);
    const y = paddingY + ((dominioMax - valorLimitado) * (altura - paddingY * 2)) / faixa;

    return { ...item, x, y };
  });

  const linha = pontos.map((ponto) => `${ponto.x},${ponto.y}`).join(" ");
  const corLinha = temaEscuro ? "#fb7185" : "#e11d48";
  const corGrade = temaEscuro ? "rgba(255,255,255,0.09)" : "rgba(15,23,42,0.13)";
  const corTexto = temaEscuro ? "#94a3b8" : "#64748b";
  const fundoTooltip = temaEscuro ? "rgba(15,23,42,0.96)" : "rgba(255,255,255,0.98)";
  const bordaTooltip = temaEscuro ? "rgba(255,255,255,0.14)" : "rgba(15,23,42,0.12)";
  const textoTooltip = temaEscuro ? "#ffffff" : "#0f172a";

  return (
    <div className="relative">
      {hover && (
        <div
          className="pointer-events-none fixed z-50 rounded-2xl border px-3 py-2 text-xs shadow-2xl"
          style={{
            top: hover.clientY - 62,
            left: hover.clientX + 14,
            background: fundoTooltip,
            borderColor: bordaTooltip,
            color: textoTooltip,
          }}
        >
          <div className="font-semibold">{hover.valor} BPM</div>
          <div>{formatarHora(hover.data)}</div>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">{titulo}</h3>
          <p className={`text-sm ${temaEscuro ? "text-slate-400" : "text-slate-500"}`}>
            {pontosOriginais.length} leituras
          </p>
        </div>
        <p className={`text-sm ${temaEscuro ? "text-slate-400" : "text-slate-500"}`}>
          {realMin} - {realMax} BPM
        </p>
      </div>

      <div className="overflow-x-auto pb-2">
        <svg width={largura} height={altura} className="block min-w-full">
          {[0, 1, 2, 3, 4].map((linhaGrade) => {
            const y = paddingY + (linhaGrade * (altura - paddingY * 2)) / 4;
            const valor =
              Math.round((dominioMax - (linhaGrade * (dominioMax - dominioMin)) / 4) * 10) / 10;

            return (
              <g key={linhaGrade}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={largura - paddingX}
                  y2={y}
                  stroke={corGrade}
                  strokeDasharray="4 6"
                />
                <text x={12} y={y + 4} fill={corTexto} fontSize="12">
                  {valor}
                </text>
              </g>
            );
          })}

          <polyline
            fill="none"
            stroke={corLinha}
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={linha}
          />

          {pontos.map((ponto) => (
            <g key={ponto.id}>
              <circle
                cx={ponto.x}
                cy={ponto.y}
                r="6"
                fill={corLinha}
                onMouseMove={(e) =>
                  setHover({
                    valor: ponto.valor,
                    data: ponto.recebido_em,
                    clientX: e.clientX,
                    clientY: e.clientY,
                  })
                }
                onMouseLeave={() => setHover(null)}
              >
                <title>{`${ponto.valor} BPM - ${formatarHora(ponto.recebido_em)}`}</title>
              </circle>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function GraficoBarrasBpm({ dados, temaEscuro }) {
  const dadosOrdenados = [...dados].reverse();
  const valores = dadosOrdenados
    .map((item) => Number(item.valor_bpm || 0))
    .filter((valor) => valor > 0);

  if (!valores.length) {
    return (
      <div
        className={`flex items-center justify-center rounded-3xl p-6 text-sm ${
          temaEscuro ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-600"
        }`}
      >
        Sem dados para o gráfico deste dia.
      </div>
    );
  }

  const max = Math.max(...valores);
  const min = Math.min(...valores);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Gráfico do dia</h3>
          <p className={`text-sm ${temaEscuro ? "text-slate-400" : "text-slate-500"}`}>
            {valores.length} leituras
          </p>
        </div>
        <p className={`text-sm ${temaEscuro ? "text-slate-400" : "text-slate-500"}`}>
          {min} - {max} BPM
        </p>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-end gap-3">
          {dadosOrdenados.map((item) => {
            const valor = Number(item.valor_bpm || 0);
            const altura = Math.max((valor / Math.max(max, 1)) * 180, 18);

            return (
              <div key={item.id} className="flex w-12 flex-col items-center gap-2">
                <div className="text-xs font-semibold">{valor}</div>
                <div
                  className="w-full rounded-t-2xl bg-rose-600"
                  style={{ height: `${altura}px` }}
                />
                <div className={`text-[11px] ${temaEscuro ? "text-slate-400" : "text-slate-500"}`}>
                  {formatarHora(item.recebido_em).slice(0, 5)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FundoLogin({ slideAtual, visualizacao }) {
  const slide = MEDICAL_SLIDES[slideAtual];

  if (visualizacao === "web") {
    return (
      <>
        <img
          src={slide.desktop}
          alt={slide.alt}
          className="absolute inset-0 h-full w-full object-cover object-center transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/66 via-slate-950/42 to-slate-950/82" />
      </>
    );
  }

  return (
    <>
      <img
        src={slide.mobile}
        alt={slide.alt}
        className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${slide.mobileClass}`}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/5 via-slate-950/0 to-slate-950/16" />
    </>
  );
}

function TelaLogin({ temaEscuro, alternarTema, visualizacao, alternarVisualizacao }) {
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
    }, 5000);

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

  const inputClasse = visualizacao === "web" ? ui.inputWeb : ui.inputMobile;

  const cardAcesso =
    visualizacao === "web"
      ? temaEscuro
        ? "border border-white/10 bg-slate-950/78 text-white shadow-2xl shadow-black/35 backdrop-blur-xl"
        : "border border-white/70 bg-white/86 text-slate-950 shadow-2xl shadow-slate-300/40 backdrop-blur-xl"
      : temaEscuro
      ? "border border-white/5 bg-slate-950/12 text-white shadow-lg shadow-black/10 backdrop-blur-0"
      : "border border-white/40 bg-white/24 text-slate-950 shadow-lg shadow-slate-300/20 backdrop-blur-0";

  if (visualizacao === "mobile") {
    return (
      <div className="min-h-screen overflow-x-auto bg-slate-950">
        <div className="mx-auto min-h-screen max-w-[430px] bg-slate-950">
          <div className="relative min-h-screen overflow-hidden">
            <FundoLogin slideAtual={slideAtual} visualizacao="mobile" />

            <div className="relative z-10 flex min-h-screen flex-col px-4 py-4">
              <div className="flex items-center justify-between gap-2">
                <LogoBpm compacto temaEscuro={temaEscuro} sobreImagem />
                <div className="flex gap-2">
                  <BotaoVisualizacao
                    visualizacao={visualizacao}
                    alternarVisualizacao={alternarVisualizacao}
                    temaEscuro={temaEscuro}
                  />
                  <BotaoTema temaEscuro={temaEscuro} alternarTema={alternarTema} />
                </div>
              </div>

              <div className="mt-7">
                <span className="inline-flex rounded-full border border-white/10 bg-slate-950/20 px-3 py-1 text-xs font-semibold text-white">
                  Dispositivo: {CODIGO_DISPOSITIVO}
                </span>

                <h1 className="mt-4 text-4xl font-black leading-tight text-white drop-shadow-lg">
                  Painel de BPM
                </h1>

                <p className="mt-2 max-w-[290px] text-sm leading-6 text-slate-100 drop-shadow">
                  Acompanhe as leituras do ESP32 e consulte o histórico diário do paciente.
                </p>
              </div>

              <div className="mt-auto pb-4">
                <div className={`mx-auto w-full max-w-[230px] rounded-[0.9rem] p-2 ${cardAcesso}`}>
                  <div className="mb-2 flex flex-col items-center text-center">
                    <div className="scale-[0.55]">
                      <IconeLogo />
                    </div>
                    <p className={`mt-1 text-[9px] font-bold uppercase tracking-[0.24em] ${ui.textoMuitoSuave}`}>
                      Acesso
                    </p>
                    <h2 className="mt-1 text-xl font-black">
                      {modoCadastro ? "Cadastro" : "Entrar"}
                    </h2>
                    <p className={`mt-1 max-w-[200px] text-[11px] leading-4 ${ui.textoSuave}`}>
                      {modoCadastro
                        ? "Cadastre os dados do paciente."
                        : "Entre com seu e-mail para acessar."}
                    </p>
                  </div>

                  <div className={`mb-3 grid grid-cols-2 rounded-xl p-1 ${temaEscuro ? "bg-slate-950/35" : "bg-white/30"}`}>
                    <button
                      onClick={() => {
                        setMensagem("");
                        setModoCadastro(false);
                      }}
                      className={`rounded-lg px-2 py-2 text-xs font-bold transition ${
                        !modoCadastro
                          ? "bg-rose-600 text-white shadow-lg shadow-rose-900/20"
                          : temaEscuro
                          ? "text-slate-400"
                          : "text-slate-600"
                      }`}
                    >
                      Login
                    </button>
                    <button
                      onClick={() => {
                        setMensagem("");
                        setModoCadastro(true);
                      }}
                      className={`rounded-lg px-2 py-2 text-xs font-bold transition ${
                        modoCadastro
                          ? "bg-rose-600 text-white shadow-lg shadow-rose-900/20"
                          : temaEscuro
                          ? "text-slate-400"
                          : "text-slate-600"
                      }`}
                    >
                      Cadastro
                    </button>
                  </div>

                  <form onSubmit={modoCadastro ? cadastrar : entrar} className="space-y-2">
                    {modoCadastro && (
                      <>
                        <input
                          type="text"
                          placeholder="Nome completo"
                          value={form.nome}
                          onChange={(e) => atualizarCampo("nome", e.target.value)}
                          className={inputClasse}
                        />

                        <input
                          type="number"
                          placeholder="Idade"
                          value={form.idade}
                          onChange={(e) => atualizarCampo("idade", e.target.value)}
                          className={inputClasse}
                        />

                        <select
                          value={form.sexo}
                          onChange={(e) => atualizarCampo("sexo", e.target.value)}
                          className={inputClasse}
                        >
                          <option value="masculino">Masculino</option>
                          <option value="feminino">Feminino</option>
                          <option value="outro">Outro</option>
                        </select>
                      </>
                    )}

                    <input
                      type="email"
                      placeholder="E-mail"
                      value={form.email}
                      onChange={(e) => atualizarCampo("email", e.target.value)}
                      className={inputClasse}
                    />

                    <input
                      type="password"
                      placeholder="Senha"
                      value={form.senha}
                      onChange={(e) => atualizarCampo("senha", e.target.value)}
                      className={inputClasse}
                    />

                    {modoCadastro && (
                      <input
                        type="password"
                        placeholder="Confirmar senha"
                        value={form.confirmarSenha}
                        onChange={(e) => atualizarCampo("confirmarSenha", e.target.value)}
                        className={inputClasse}
                      />
                    )}

                    {mensagem && (
                      <div
                        className={`rounded-xl border px-3 py-2 text-xs ${
                          mensagem.toLowerCase().includes("erro")
                            ? temaEscuro
                              ? "border-red-400/20 bg-red-500/10 text-red-200"
                              : "border-red-200 bg-red-50 text-red-700"
                            : temaEscuro
                            ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {mensagem}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={carregando}
                      className="w-full rounded-xl bg-rose-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {carregando
                        ? "Aguarde..."
                        : modoCadastro
                        ? "Criar cadastro"
                        : "Entrar"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-auto bg-slate-950">
      <div className="fixed inset-0 z-0">
        <FundoLogin slideAtual={slideAtual} visualizacao="web" />
      </div>

      <div className="relative z-10 min-h-screen min-w-[1080px] px-10 py-8">
        <div className="flex items-start justify-between">
          <LogoBpm temaEscuro={temaEscuro} sobreImagem />
          <div className="flex gap-2">
            <BotaoVisualizacao
              visualizacao={visualizacao}
              alternarVisualizacao={alternarVisualizacao}
              temaEscuro={temaEscuro}
            />
            <BotaoTema temaEscuro={temaEscuro} alternarTema={alternarTema} />
          </div>
        </div>

        <div className="mx-auto grid min-h-[calc(100vh-7rem)] max-w-7xl grid-cols-[1.08fr_0.92fr] gap-10">
          <div className="flex flex-col justify-between pb-8 pt-12">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/10 bg-slate-950/35 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md">
                Dispositivo: {CODIGO_DISPOSITIVO}
              </span>

              <h1 className="mt-6 text-7xl font-black leading-tight text-white drop-shadow-2xl">
                Painel de BPM
              </h1>

              <p className="mt-5 max-w-3xl text-2xl leading-10 text-slate-100 drop-shadow-xl">
                Acompanhe as leituras do ESP32, visualize o BPM atual e consulte o histórico
                diário do paciente.
              </p>
            </div>

            <div>
              <div className="mb-5 grid grid-cols-5 gap-3">
                {MEDICAL_SLIDES.map((slide, index) => (
                  <button
                    key={slide.desktop}
                    onClick={() => setSlideAtual(index)}
                    className={`h-24 overflow-hidden rounded-3xl border transition ${
                      index === slideAtual
                        ? "border-rose-400 opacity-100 scale-[1.02]"
                        : "border-white/10 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={slide.desktop}
                      alt={slide.alt}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4 backdrop-blur-md">
                  <p className="text-sm font-semibold uppercase tracking-wide text-white">Tempo real</p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Consulta periódica do BPM atual.
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4 backdrop-blur-md">
                  <p className="text-sm font-semibold uppercase tracking-wide text-white">Histórico</p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Registros por data e horário.
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4 backdrop-blur-md">
                  <p className="text-sm font-semibold uppercase tracking-wide text-white">Perfil</p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Dados reais do paciente.
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4 backdrop-blur-md">
                  <p className="text-sm font-semibold uppercase tracking-wide text-white">Supabase</p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Auth, banco e API REST.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className={`w-full max-w-[500px] rounded-[2rem] p-8 ${cardAcesso}`}>
              <div className="mb-6 flex flex-col items-center text-center">
                <IconeLogo />
                <p className={`mt-4 text-xs font-bold uppercase tracking-[0.35em] ${ui.textoMuitoSuave}`}>
                  Acesso
                </p>
                <h2 className="mt-3 text-3xl font-black">
                  {modoCadastro ? "Cadastro" : "Entrar"}
                </h2>
                <p className={`mt-2 max-w-sm text-sm ${ui.textoSuave}`}>
                  {modoCadastro
                    ? "Cadastre os dados do paciente."
                    : "Entre com seu e-mail para acessar o painel."}
                </p>
              </div>

              <div className={`mb-6 grid grid-cols-2 rounded-2xl p-1 ${temaEscuro ? "bg-white/5" : "bg-slate-100"}`}>
                <button
                  onClick={() => {
                    setMensagem("");
                    setModoCadastro(false);
                  }}
                  className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                    !modoCadastro
                      ? "bg-rose-600 text-white shadow-lg shadow-rose-900/20"
                      : temaEscuro
                      ? "text-slate-400"
                      : "text-slate-600"
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setMensagem("");
                    setModoCadastro(true);
                  }}
                  className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                    modoCadastro
                      ? "bg-rose-600 text-white shadow-lg shadow-rose-900/20"
                      : temaEscuro
                      ? "text-slate-400"
                      : "text-slate-600"
                  }`}
                >
                  Cadastro
                </button>
              </div>

              <form onSubmit={modoCadastro ? cadastrar : entrar} className="space-y-4">
                {modoCadastro && (
                  <>
                    <input
                      type="text"
                      placeholder="Nome completo"
                      value={form.nome}
                      onChange={(e) => atualizarCampo("nome", e.target.value)}
                      className={inputClasse}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <input
                        type="number"
                        placeholder="Idade"
                        value={form.idade}
                        onChange={(e) => atualizarCampo("idade", e.target.value)}
                        className={inputClasse}
                      />

                      <select
                        value={form.sexo}
                        onChange={(e) => atualizarCampo("sexo", e.target.value)}
                        className={inputClasse}
                      >
                        <option value="masculino">Masculino</option>
                        <option value="feminino">Feminino</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>
                  </>
                )}

                <input
                  type="email"
                  placeholder="E-mail"
                  value={form.email}
                  onChange={(e) => atualizarCampo("email", e.target.value)}
                  className={inputClasse}
                />

                <input
                  type="password"
                  placeholder="Senha"
                  value={form.senha}
                  onChange={(e) => atualizarCampo("senha", e.target.value)}
                  className={inputClasse}
                />

                {modoCadastro && (
                  <input
                    type="password"
                    placeholder="Confirmar senha"
                    value={form.confirmarSenha}
                    onChange={(e) => atualizarCampo("confirmarSenha", e.target.value)}
                    className={inputClasse}
                  />
                )}

                {mensagem && (
                  <div
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      mensagem.toLowerCase().includes("erro")
                        ? temaEscuro
                          ? "border-red-400/20 bg-red-500/10 text-red-200"
                          : "border-red-200 bg-red-50 text-red-700"
                        : temaEscuro
                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {mensagem}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={carregando}
                  className="w-full rounded-2xl bg-rose-600 px-4 py-3 font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {carregando
                    ? "Aguarde..."
                    : modoCadastro
                    ? "Criar cadastro"
                    : "Entrar no painel"}
                </button>
              </form>

              <div className={`mt-6 grid grid-cols-3 gap-2 ${temaEscuro ? "text-slate-400" : "text-slate-600"}`}>
                <div className={`rounded-2xl p-3 text-center ${temaEscuro ? "bg-white/5" : "bg-slate-100"}`}>
                  <p className="text-[11px]">Tempo real</p>
                  <p className="mt-1 text-xs font-semibold">BPM</p>
                </div>
                <div className={`rounded-2xl p-3 text-center ${temaEscuro ? "bg-white/5" : "bg-slate-100"}`}>
                  <p className="text-[11px]">Histórico</p>
                  <p className="mt-1 text-xs font-semibold">Diário</p>
                </div>
                <div className={`rounded-2xl p-3 text-center ${temaEscuro ? "bg-white/5" : "bg-slate-100"}`}>
                  <p className="text-[11px]">Vínculo</p>
                  <p className="mt-1 text-xs font-semibold">Auto</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ sessao, temaEscuro }) {
  const ui = obterClasses(temaEscuro);
  const [bpmAtual, setBpmAtual] = useState(null);
  const [ultima, setUltima] = useState(null);
  const [leiturasUsuario, setLeiturasUsuario] = useState([]);
  const [leiturasGerais, setLeiturasGerais] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  async function carregarDashboard() {
    if (!sessao?.user?.id) return;

    setCarregando(true);

    const { data: atual, error: erroAtual } = await supabase
      .from("bpm_tempo_real")
      .select("perfil_id, valor_bpm, recebido_em, atualizado_em")
      .eq("perfil_id", sessao.user.id)
      .maybeSingle();

    const { data: historico, error: erroHistorico } = await supabase
      .from("historico_bpm")
      .select("id, perfil_id, valor_bpm, registrado_em")
      .eq("perfil_id", sessao.user.id)
      .order("registrado_em", { ascending: false })
      .limit(40);

    const { data: geral } = await supabase
      .from("bpm_tempo_real")
      .select("perfil_id, valor_bpm, recebido_em, atualizado_em")
      .order("atualizado_em", { ascending: false })
      .limit(1);

    if (erroAtual && erroHistorico) {
      setErro(`Erro ao carregar dashboard: ${erroAtual.message}`);
      setBpmAtual(null);
      setUltima(null);
      setLeiturasUsuario([]);
      setLeiturasGerais([]);
      setCarregando(false);
      return;
    }

    const historicoNormalizado = (historico || []).map((item) => ({
      id: item.id,
      valor_bpm: item.valor_bpm,
      recebido_em: item.registrado_em,
      perfil_id: item.perfil_id,
    }));

    setErro("");
    setBpmAtual(atual?.valor_bpm ?? historicoNormalizado[0]?.valor_bpm ?? null);
    setUltima({
      recebido_em: atual?.atualizado_em || atual?.recebido_em || historicoNormalizado[0]?.recebido_em,
    });
    setLeiturasUsuario(historicoNormalizado);
    setLeiturasGerais(geral || []);
    setCarregando(false);
  }

  useEffect(() => {
    carregarDashboard();
    const intervalo = setInterval(carregarDashboard, 5000);

    return () => clearInterval(intervalo);
  }, [sessao?.user?.id]);

  const espEnviaParaOutroPerfil =
    !bpmAtual &&
    leiturasGerais.length > 0 &&
    leiturasGerais[0]?.perfil_id &&
    leiturasGerais[0]?.perfil_id !== sessao?.user?.id;

  return (
    <div>
      <PageHeader
        titulo="Início"
        subtitulo="Acompanhamento em tempo real. O painel consulta os dados salvos no banco a cada 5 segundos."
        temaEscuro={temaEscuro}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card
          titulo="BPM atual"
          valor={carregando ? "..." : bpmAtual ? `${bpmAtual} BPM` : "Sem dados"}
          subtitulo={`Última leitura recebida em ${formatarDataHora(ultima?.recebido_em)}.`}
          temaEscuro={temaEscuro}
        />

        <Card
          titulo="Classificação"
          valor={classificarBpm(bpmAtual)}
          subtitulo="Resultado com base no valor mais recente."
          temaEscuro={temaEscuro}
        />

        <Card
          titulo="Leituras recentes"
          valor={leiturasUsuario.length}
          subtitulo="Registros usados no gráfico e na lista abaixo."
          temaEscuro={temaEscuro}
        />
      </div>

      {erro && (
        <div className="mt-4 rounded-3xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
          {erro}
        </div>
      )}

      {espEnviaParaOutroPerfil && (
        <div className="mt-4 rounded-3xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-200">
          O ESP32 está enviando leituras, mas elas parecem estar vinculadas a outro perfil_id.
          <br />
          ID do usuário logado: {sessao.user.id}
          <br />
          Último perfil_id recebido: {leiturasGerais[0]?.perfil_id}
        </div>
      )}

      <div className={`mt-6 rounded-[2rem] p-5 md:p-6 ${ui.painel}`}>
        <GraficoBpm dados={leiturasUsuario} temaEscuro={temaEscuro} />
      </div>

      <div className={`mt-6 rounded-[2rem] p-5 md:p-6 ${ui.painel}`}>
        <div className="mb-4">
          <h2 className="text-xl font-bold">Últimas leituras</h2>
          <p className={`mt-1 text-sm ${ui.textoSuave}`}>
            Dados recentes enviados pelo ESP32.
          </p>
        </div>

        {leiturasUsuario.length === 0 ? (
          <div
            className={`rounded-3xl p-5 text-sm ${
              temaEscuro ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-600"
            }`}
          >
            Nenhuma leitura encontrada para este usuário.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {leiturasUsuario.slice(0, 8).map((item) => (
              <div
                key={item.id}
                className={`rounded-3xl p-4 ${
                  temaEscuro ? "bg-white/5" : "bg-slate-50 border border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xl font-bold">{item.valor_bpm} BPM</p>
                  <BadgeStatus valor={item.valor_bpm} />
                </div>
                <p className={`mt-3 text-sm ${ui.textoSuave}`}>
                  {formatarDataHora(item.recebido_em)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function normalizarRegistroHistorico(item, index) {
  const data =
    item.registrado_em ||
    item.recebido_em ||
    item.atualizado_em ||
    item.criado_em ||
    item.data_hora ||
    item.data_registro ||
    item.minuto ||
    item.dia ||
    null;

  const valor =
    item.valor_bpm ??
    item.bpm ??
    item.bpm_atual ??
    item.bpm_medio ??
    item.media_bpm ??
    item.bpm_media ??
    null;

  const minimo = item.bpm_minimo ?? item.minimo ?? item.bpm_min ?? null;
  const maximo = item.bpm_maximo ?? item.maximo ?? item.bpm_max ?? null;

  if (!data || valor === null || Number(valor) <= 0) {
    return null;
  }

  return {
    id: item.id ?? `${String(data)}-${index}`,
    valor_bpm: Math.round(Number(valor)),
    recebido_em: data,
    minimo: minimo !== null ? Number(minimo) : null,
    maximo: maximo !== null ? Number(maximo) : null,
  };
}

async function buscarHistoricoPorFonte(sessao) {
  const fontes = [
    "vw_bpm_historico_minuto",
    "v_bpm_historico_minuto",
    "bpm_historico_minuto",
    "historico_bpm",
    "bpm_tempo_real",
  ];

  for (const fonte of fontes) {
    const { data, error } = await supabase
      .from(fonte)
      .select("*")
      .eq("perfil_id", sessao.user.id)
      .limit(500);

    if (error || !data || data.length === 0) {
      continue;
    }

    const normalizados = data
      .map((item, index) => normalizarRegistroHistorico(item, index))
      .filter(Boolean)
      .sort((a, b) => new Date(b.recebido_em) - new Date(a.recebido_em));

    if (normalizados.length > 0) {
      return normalizados;
    }
  }

  return [];
}

function Historico({ sessao, temaEscuro }) {
  const ui = obterClasses(temaEscuro);
  const [leituras, setLeituras] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [dataAberta, setDataAberta] = useState(null);

  async function carregarHistorico() {
    if (!sessao?.user?.id) return;

    setCarregando(true);

    const dados = await buscarHistoricoPorFonte(sessao);

    if (!dados.length) {
      setErro("");
      setLeituras([]);
      setCarregando(false);
      return;
    }

    setErro("");
    setLeituras(dados);
    setCarregando(false);
  }

  useEffect(() => {
    carregarHistorico();
    const intervalo = setInterval(carregarHistorico, 10000);

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
      <div>
        <PageHeader
          titulo={grupoSelecionado.data}
          subtitulo={`${grupoSelecionado.itens.length} leituras registradas`}
          temaEscuro={temaEscuro}
        >
          <button onClick={() => setDataAberta(null)} className={ui.botaoSecundario}>
            Voltar para histórico
          </button>
        </PageHeader>

        <div className="grid gap-4 md:grid-cols-3">
          <Card
            titulo="Média"
            valor={grupoSelecionado.media ?? "--"}
            subtitulo="BPM médio do dia selecionado."
            temaEscuro={temaEscuro}
          />
          <Card
            titulo="Mín"
            valor={grupoSelecionado.menor ?? "--"}
            subtitulo="Menor valor de BPM."
            temaEscuro={temaEscuro}
          />
          <Card
            titulo="Máx"
            valor={grupoSelecionado.maior ?? "--"}
            subtitulo="Maior valor de BPM."
            temaEscuro={temaEscuro}
          />
        </div>

        <div className={`mt-6 rounded-[2rem] p-5 md:p-6 ${ui.painel}`}>
          <GraficoBarrasBpm dados={grupoSelecionado.itens} temaEscuro={temaEscuro} />
        </div>

        <div className={`mt-6 rounded-[2rem] p-5 md:p-6 ${ui.painel}`}>
          <h2 className="text-xl font-bold">Leituras do dia</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {grupoSelecionado.itens.map((item) => (
              <div
                key={item.id}
                className={`rounded-3xl p-4 ${
                  temaEscuro ? "bg-white/5" : "bg-slate-50 border border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xl font-bold">{item.valor_bpm} BPM</p>
                  <BadgeStatus valor={item.valor_bpm} />
                </div>
                <p className={`mt-3 text-sm ${ui.textoSuave}`}>
                  {formatarHora(item.recebido_em)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        titulo="Histórico"
        subtitulo="Selecione uma data para visualizar os valores registrados e o gráfico do dia."
        temaEscuro={temaEscuro}
      >
        <button onClick={carregarHistorico} className={ui.botaoSecundario}>
          Atualizar
        </button>
      </PageHeader>

      {erro && (
        <div className="mb-4 rounded-3xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
          {erro}
        </div>
      )}

      {carregando ? (
        <div className={`rounded-[2rem] p-6 ${ui.painel}`}>Carregando histórico...</div>
      ) : grupos.length === 0 ? (
        <div className={`rounded-[2rem] p-6 ${ui.painel}`}>
          Nenhuma leitura encontrada no histórico.
        </div>
      ) : (
        <div className="grid gap-4">
          {grupos.map((grupo) => (
            <button
              key={grupo.data}
              onClick={() => setDataAberta(grupo.data)}
              className={`rounded-[2rem] p-5 text-left transition hover:scale-[1.01] ${ui.painel}`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-bold">{grupo.data}</h2>
                  <p className={`mt-1 text-sm ${ui.textoSuave}`}>
                    {grupo.itens.length} leituras registradas
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 sm:w-auto">
                  <div className={`rounded-2xl px-4 py-3 ${ui.painelForte}`}>
                    <p className={`text-xs ${ui.textoSuave}`}>Média</p>
                    <p className="mt-1 text-lg font-bold">{grupo.media ?? "--"}</p>
                  </div>
                  <div className={`rounded-2xl px-4 py-3 ${ui.painelForte}`}>
                    <p className={`text-xs ${ui.textoSuave}`}>Mín</p>
                    <p className="mt-1 text-lg font-bold">{grupo.menor ?? "--"}</p>
                  </div>
                  <div className={`rounded-2xl px-4 py-3 ${ui.painelForte}`}>
                    <p className={`text-xs ${ui.textoSuave}`}>Máx</p>
                    <p className="mt-1 text-lg font-bold">{grupo.maior ?? "--"}</p>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Perfil({ sessao, perfil, temaEscuro }) {
  const ui = obterClasses(temaEscuro);

  return (
    <div>
      <PageHeader
        titulo="Perfil"
        subtitulo="Informações reais do usuário autenticado."
        temaEscuro={temaEscuro}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card
          titulo="Nome"
          valor={perfil?.nome || sessao?.user?.user_metadata?.nome || "Não informado"}
          subtitulo="Nome cadastrado do paciente."
          temaEscuro={temaEscuro}
        />
        <Card
          titulo="E-mail"
          valor={sessao?.user?.email || "Não informado"}
          subtitulo="Conta utilizada no login."
          temaEscuro={temaEscuro}
        />
        <Card
          titulo="Idade"
          valor={perfil?.idade ?? "Não informada"}
          subtitulo="Idade cadastrada no perfil."
          temaEscuro={temaEscuro}
        />
        <Card
          titulo="Sexo"
          valor={perfil?.sexo || "Não informado"}
          subtitulo="Sexo informado no cadastro."
          temaEscuro={temaEscuro}
        />
        <Card
          titulo="Criado em"
          valor={formatarDataHora(perfil?.criado_em)}
          subtitulo="Data de criação do perfil."
          temaEscuro={temaEscuro}
        />
        <Card
          titulo="Código do dispositivo"
          valor={CODIGO_DISPOSITIVO}
          subtitulo="Identificador exibido no painel."
          temaEscuro={temaEscuro}
        />
      </div>

      <div className={`mt-6 rounded-[2rem] p-5 md:p-6 ${ui.painel}`}>
        <h2 className="text-xl font-bold">ID do usuário logado</h2>
        <p className={`mt-3 break-all text-sm ${ui.textoSuave}`}>{sessao?.user?.id}</p>
      </div>
    </div>
  );
}

function obterVisualizacaoInicial() {
  const salva = localStorage.getItem("visualizacao-bpm");

  if (salva === "web" || salva === "mobile") {
    return salva;
  }

  return window.innerWidth >= 768 ? "web" : "mobile";
}

function App() {
  const [sessao, setSessao] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [carregandoSessao, setCarregandoSessao] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState("inicio");
  const [tema, setTema] = useState(() => localStorage.getItem("tema-bpm") || "escuro");
  const [visualizacao, setVisualizacao] = useState(obterVisualizacaoInicial);

  const temaEscuro = tema === "escuro";
  const ui = obterClasses(temaEscuro);

  function alternarTema() {
    setTema((atual) => {
      const novoTema = atual === "escuro" ? "claro" : "escuro";
      localStorage.setItem("tema-bpm", novoTema);
      return novoTema;
    });
  }

  function alternarVisualizacao() {
    setVisualizacao((atual) => {
      const novaVisualizacao = atual === "web" ? "mobile" : "web";
      localStorage.setItem("visualizacao-bpm", novaVisualizacao);
      return novaVisualizacao;
    });
  }

  async function carregarPerfil(sessaoAtual) {
    if (!sessaoAtual?.user?.id) {
      setPerfil(null);
      return;
    }

    try {
      await supabase.rpc("vincular_dispositivo_principal");
    } catch {
      console.error("Não foi possível vincular o dispositivo automaticamente.");
    }

    const { data, error } = await supabase
      .from("perfis")
      .select("*")
      .eq("id", sessaoAtual.user.id)
      .maybeSingle();

    if (error) {
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
      <div className={`flex min-h-screen items-center justify-center ${ui.pagina}`}>
        Carregando...
      </div>
    );
  }

  if (!sessao) {
    return (
      <TelaLogin
        temaEscuro={temaEscuro}
        alternarTema={alternarTema}
        visualizacao={visualizacao}
        alternarVisualizacao={alternarVisualizacao}
      />
    );
  }

  const nome =
    perfil?.nome ||
    sessao?.user?.user_metadata?.nome ||
    sessao?.user?.email ||
    "Paciente";

  if (visualizacao === "mobile") {
    return (
      <div className={`min-h-screen overflow-x-auto ${ui.pagina}`}>
        <div className="mx-auto min-h-screen max-w-[430px]">
          <main className="p-4 pb-24">
            <div className="mb-6 flex items-center justify-between">
              <LogoBpm temaEscuro={temaEscuro} />
              <div className="flex gap-2">
                <BotaoVisualizacao
                  visualizacao={visualizacao}
                  alternarVisualizacao={alternarVisualizacao}
                  temaEscuro={temaEscuro}
                />
                <BotaoTema temaEscuro={temaEscuro} alternarTema={alternarTema} />
              </div>
            </div>

            <div className="mb-6">
              <div className={`rounded-[2rem] p-4 ${ui.painel}`}>
                <p className="text-sm text-slate-400">Bem-vindo</p>
                <p className="mt-1 text-lg font-bold">{nome}</p>
                <p className="mt-1 break-all text-sm text-slate-400">{sessao.user.email}</p>
              </div>
            </div>

            {abaAtiva === "inicio" && <Dashboard sessao={sessao} temaEscuro={temaEscuro} />}
            {abaAtiva === "historico" && <Historico sessao={sessao} temaEscuro={temaEscuro} />}
            {abaAtiva === "perfil" && (
              <Perfil sessao={sessao} perfil={perfil} temaEscuro={temaEscuro} />
            )}
          </main>

          <div
            className={`fixed inset-x-0 bottom-0 z-40 border-t p-3 ${
              temaEscuro ? "border-white/10 bg-slate-950/95" : "border-slate-200 bg-white/95"
            } backdrop-blur-xl`}
          >
            <div className="mx-auto grid max-w-[430px] grid-cols-4 gap-2">
              <button
                onClick={() => setAbaAtiva("inicio")}
                className={`rounded-2xl px-3 py-3 text-sm font-semibold transition ${
                  abaAtiva === "inicio" ? ui.menuAtivo : ui.menuInativo
                }`}
              >
                Início
              </button>
              <button
                onClick={() => setAbaAtiva("historico")}
                className={`rounded-2xl px-3 py-3 text-sm font-semibold transition ${
                  abaAtiva === "historico" ? ui.menuAtivo : ui.menuInativo
                }`}
              >
                Histórico
              </button>
              <button
                onClick={() => setAbaAtiva("perfil")}
                className={`rounded-2xl px-3 py-3 text-sm font-semibold transition ${
                  abaAtiva === "perfil" ? ui.menuAtivo : ui.menuInativo
                }`}
              >
                Perfil
              </button>
              <button
                onClick={sair}
                className={`rounded-2xl px-3 py-3 text-sm font-semibold transition ${ui.menuInativo}`}
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${ui.pagina}`}>
      <div className="mx-auto flex min-h-screen min-w-[1080px] max-w-7xl flex-row">
        <aside
          className={`flex w-72 shrink-0 flex-col border-r p-6 ${
            temaEscuro ? "border-white/10 bg-slate-950/70" : "border-slate-200 bg-white"
          }`}
        >
          <LogoBpm temaEscuro={temaEscuro} />

          <div className="mt-4 flex flex-col gap-2">
            <BotaoVisualizacao
              visualizacao={visualizacao}
              alternarVisualizacao={alternarVisualizacao}
              temaEscuro={temaEscuro}
            />
            <BotaoTema temaEscuro={temaEscuro} alternarTema={alternarTema} />
          </div>

          <div className="mt-8 rounded-[2rem] border border-white/10 bg-rose-600/10 p-5">
            <p className="text-sm text-slate-400">Bem-vindo</p>
            <p className="mt-2 text-lg font-bold">{nome}</p>
            <p className="mt-1 break-all text-sm text-slate-400">{sessao.user.email}</p>
          </div>

          <nav className="mt-8 flex flex-col gap-2">
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

          <button
            onClick={sair}
            className="mt-auto rounded-2xl bg-white/10 px-4 py-3 font-semibold text-white transition hover:bg-white/20"
          >
            Sair
          </button>
        </aside>

        <main className="flex-1 p-8">
          {abaAtiva === "inicio" && <Dashboard sessao={sessao} temaEscuro={temaEscuro} />}
          {abaAtiva === "historico" && <Historico sessao={sessao} temaEscuro={temaEscuro} />}
          {abaAtiva === "perfil" && (
            <Perfil sessao={sessao} perfil={perfil} temaEscuro={temaEscuro} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;

