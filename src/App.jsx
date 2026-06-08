import { useEffect, useMemo, useRef, useState } from "react";
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
    desktop: "https://h3med.com.br/wp-content/uploads/2022/04/frequencia-cardiaca.jpg",
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
    pagina: temaEscuro ? "min-h-screen bg-slate-950 text-white" : "min-h-screen bg-slate-100 text-slate-950",
    painel: temaEscuro
      ? "border border-white/10 bg-slate-900/90 shadow-xl shadow-black/20"
      : "border border-slate-200 bg-white shadow-xl shadow-slate-200/70",
    painelForte: temaEscuro ? "border border-white/10 bg-slate-950/80" : "border border-slate-200 bg-slate-50",
    textoSuave: temaEscuro ? "text-slate-300" : "text-slate-600",
    textoMuitoSuave: temaEscuro ? "text-slate-400" : "text-slate-500",
    inputWeb: temaEscuro
      ? "w-full rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-rose-400"
      : "w-full rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-rose-500",
    inputMobile: temaEscuro
      ? "w-full rounded-xl border border-white/10 bg-slate-950/48 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-rose-400"
      : "w-full rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-rose-500",
    botaoSecundario: temaEscuro
      ? "rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
      : "rounded-2xl border border-slate-300/70 bg-white/75 px-4 py-2 text-sm font-semibold text-slate-950 backdrop-blur-md transition hover:bg-white",
    botaoPrimario:
      "rounded-2xl bg-rose-600 px-5 py-3 text-base font-black text-white shadow-lg shadow-rose-950/30 transition hover:bg-rose-500",
    menuAtivo: "bg-rose-600 text-white shadow-lg shadow-rose-950/30",
    menuInativo: temaEscuro ? "text-slate-300 hover:bg-white/5" : "text-slate-600 hover:bg-slate-100",
  };
}

function EstilosGlobais() {
  return (
    <style>{`
      .scrollbar-none {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }

      .scrollbar-none::-webkit-scrollbar {
        display: none;
      }
    `}</style>
  );
}

function IconeLogo() {
  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-600 shadow-lg shadow-rose-950/30">
      <span className="text-2xl font-black text-white">♥</span>
    </div>
  );
}

function LogoBpm({ compacto = false, temaEscuro = true, sobreImagem = false }) {
  const tituloClasse = sobreImagem
    ? temaEscuro
      ? "text-white"
      : "text-slate-950"
    : temaEscuro
      ? "text-white"
      : "text-slate-950";

  const subtituloClasse = sobreImagem
    ? temaEscuro
      ? "text-white/80"
      : "text-slate-950/70"
    : temaEscuro
      ? "text-slate-400"
      : "text-slate-600";

  return (
    <div className="flex items-center gap-3">
      <IconeLogo />

      {!compacto && (
        <div>
          <h1 className={`text-xl font-black tracking-tight ${tituloClasse}`}>Monitor BPM</h1>
          <p className={`text-sm ${subtituloClasse}`}>Painel de acompanhamento</p>
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
  const ui = obterClasses(temaEscuro);

  return (
    <button onClick={alternarVisualizacao} className={ui.botaoSecundario}>
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

  return <span className={`rounded-full border px-3 py-1 text-xs font-bold ${classe}`}>{status}</span>;
}

function PageHeader({ titulo, subtitulo, temaEscuro, children }) {
  const ui = obterClasses(temaEscuro);

  return (
    <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{titulo}</h1>
        {subtitulo && <p className={`mt-2 max-w-3xl text-sm sm:text-base ${ui.textoSuave}`}>{subtitulo}</p>}
      </div>

      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
}

function CardResumo({ titulo, valor, subtitulo, temaEscuro }) {
  const ui = obterClasses(temaEscuro);

  return (
    <div className={`min-w-0 rounded-[1.7rem] p-5 ${ui.painel}`}>
      <p className={`text-sm font-semibold ${ui.textoMuitoSuave}`}>{titulo}</p>
      <h3 className="mt-2 truncate text-3xl font-black">{valor}</h3>
      {subtitulo && <p className={`mt-2 text-sm ${ui.textoSuave}`}>{subtitulo}</p>}
    </div>
  );
}

function SliderArea({ children, temaEscuro, className = "", alturaSlider = "h-56" }) {
  const ref = useRef(null);
  const [valor, setValor] = useState(0);
  const [maximo, setMaximo] = useState(0);

  function atualizarMaximo() {
    const el = ref.current;

    if (!el) return;

    const novoMaximo = Math.max(el.scrollWidth - el.clientWidth, 0);

    setMaximo(novoMaximo);
    setValor(Math.min(el.scrollLeft, novoMaximo));
  }

  useEffect(() => {
    atualizarMaximo();

    const el = ref.current;

    if (!el) return;

    const aoScroll = () => {
      setValor(el.scrollLeft);
    };

    el.addEventListener("scroll", aoScroll);
    window.addEventListener("resize", atualizarMaximo);

    return () => {
      el.removeEventListener("scroll", aoScroll);
      window.removeEventListener("resize", atualizarMaximo);
    };
  }, [children]);

  function mover(e) {
    const novoValor = Number(e.target.value);
    const el = ref.current;

    setValor(novoValor);

    if (el) {
      el.scrollLeft = novoValor;
    }
  }

  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-3">
        <div
          ref={ref}
          className={`scrollbar-none max-w-full flex-1 overflow-x-auto overflow-y-hidden ${className}`}
        >
          {children}
        </div>

        {maximo > 0 && (
          <div className={`flex w-12 shrink-0 items-center justify-center ${alturaSlider}`}>
            <input
              type="range"
              min="0"
              max={maximo}
              value={valor}
              onChange={mover}
              className={`h-2 w-44 cursor-pointer accent-rose-500 ${temaEscuro ? "bg-slate-800" : "bg-slate-200"}`}
              style={{ transform: "rotate(90deg)" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function GraficoBpm({ dados, temaEscuro, titulo = "Variação recente", altura = 280, mostrarHora = true }) {
  const [hover, setHover] = useState(null);
  const ui = obterClasses(temaEscuro);

  const pontosOriginais = [...dados]
    .reverse()
    .map((item) => ({
      id: item.id,
      valor: Number(item.valor_bpm || 0),
      recebido_em: item.recebido_em,
    }))
    .filter((item) => item.valor > 0);

  if (!pontosOriginais.length) {
    return (
      <div className={`rounded-[1.7rem] p-5 ${ui.painel}`}>
        <h3 className="text-lg font-black">{titulo}</h3>
        <div className={`mt-4 rounded-2xl p-8 text-center ${ui.painelForte}`}>Sem dados para o gráfico.</div>
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
  const largura = Math.max(760, pontosOriginais.length * 58);
  const paddingX = 52;
  const paddingY = 40;

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
    <div className={`relative min-w-0 rounded-[1.7rem] p-5 ${ui.painel}`}>
      {hover && (
        <div
          className="pointer-events-none fixed z-50 rounded-2xl border px-4 py-3 text-sm shadow-2xl"
          style={{
            left: Math.min(hover.clientX + 16, window.innerWidth - 180),
            top: Math.max(hover.clientY - 78, 16),
            background: fundoTooltip,
            borderColor: bordaTooltip,
            color: textoTooltip,
          }}
        >
          <p className="font-black">{hover.valor} BPM</p>
          <p className="opacity-80">{mostrarHora ? formatarHora(hover.data) : formatarData(hover.data)}</p>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-black">{titulo}</h3>
          <p className={`text-sm ${ui.textoMuitoSuave}`}>{pontosOriginais.length} leituras</p>
        </div>

        <div className={`rounded-full px-3 py-1 text-sm font-bold ${ui.painelForte}`}>
          {realMin} - {realMax} BPM
        </div>
      </div>

      <SliderArea temaEscuro={temaEscuro}>
        <svg width={largura} height={altura} role="img" className="block">
          {[0, 1, 2, 3, 4].map((linhaGrade) => {
            const y = paddingY + (linhaGrade * (altura - paddingY * 2)) / 4;
            const valor = Math.round((dominioMax - (linhaGrade * (dominioMax - dominioMin)) / 4) * 10) / 10;

            return (
              <g key={linhaGrade}>
                <line x1={paddingX} x2={largura - paddingX} y1={y} y2={y} stroke={corGrade} strokeWidth="1" />
                <text x="10" y={y + 4} fill={corTexto} fontSize="12">
                  {valor}
                </text>
              </g>
            );
          })}

          <polyline fill="none" stroke={corLinha} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={linha} />

          {pontos.map((ponto) => (
            <g key={`${ponto.id}-${ponto.recebido_em}`}>
              <circle cx={ponto.x} cy={ponto.y} r="6" fill={corLinha} />
              <circle
                cx={ponto.x}
                cy={ponto.y}
                r="18"
                fill="transparent"
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
                <title>{`${ponto.valor} BPM - ${mostrarHora ? formatarHora(ponto.recebido_em) : formatarData(ponto.recebido_em)}`}</title>
              </circle>
            </g>
          ))}
        </svg>
      </SliderArea>
    </div>
  );
}

function obterEstiloBarra(valor, temaEscuro) {
  if (valor < 60) {
    return {
      classeBarra: "bg-sky-500",
      classeTexto: temaEscuro ? "text-sky-300" : "text-sky-700",
      elevado: false,
    };
  }

  if (valor > 100) {
    return {
      classeBarra: "bg-amber-500",
      classeTexto: temaEscuro ? "text-amber-300" : "text-amber-700",
      elevado: true,
    };
  }

  return {
    classeBarra: "bg-emerald-500",
    classeTexto: temaEscuro ? "text-emerald-300" : "text-emerald-700",
    elevado: false,
  };
}

function GraficoBarrasBpm({ dados, temaEscuro }) {
  const ui = obterClasses(temaEscuro);

  const dadosOrdenados = [...dados].reverse();
  const valores = dadosOrdenados.map((item) => Number(item.valor_bpm || 0)).filter((valor) => valor > 0);

  if (!valores.length) {
    return (
      <div className={`rounded-[1.7rem] p-5 ${ui.painel}`}>
        <h3 className="text-lg font-black">Gráfico de barras do dia</h3>
        <div className={`mt-4 rounded-2xl p-8 text-center ${ui.painelForte}`}>Sem dados para o gráfico deste dia.</div>
      </div>
    );
  }

  const max = Math.max(...valores);
  const min = Math.min(...valores);

  return (
    <div className={`min-w-0 rounded-[1.7rem] p-5 ${ui.painel}`}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-black">Gráfico de barras do dia</h3>
          <p className={`text-sm ${ui.textoMuitoSuave}`}>Azul = baixo | Verde = normal | Laranja = elevado</p>
        </div>

        <div className={`rounded-full px-3 py-1 text-sm font-bold ${ui.painelForte}`}>
          {min} - {max} BPM
        </div>
      </div>

      <SliderArea temaEscuro={temaEscuro}>
        <div className="flex min-w-max items-end gap-3 px-1 pt-6">
          {dadosOrdenados.map((item) => {
            const valor = Number(item.valor_bpm || 0);
            const altura = Math.max((valor / Math.max(max, 1)) * 190, 18);
            const estilo = obterEstiloBarra(valor, temaEscuro);

            return (
              <div key={`${item.id}-${item.recebido_em}`} className="flex w-14 flex-col items-center gap-2">
                <div className={`text-xs font-bold ${estilo.classeTexto}`}>{valor}</div>

                {estilo.elevado ? (
                  <div className="grid h-5 w-5 place-items-center rounded-full bg-amber-500 text-[11px] font-black text-slate-950">
                    !
                  </div>
                ) : (
                  <div className="h-5" />
                )}

                <div
                  className={`w-8 rounded-t-2xl ${estilo.classeBarra} shadow-lg`}
                  style={{ height: `${altura}px` }}
                />

                <div className={`text-[11px] ${ui.textoMuitoSuave}`}>{formatarHora(item.recebido_em).slice(0, 5)}</div>
              </div>
            );
          })}
        </div>
      </SliderArea>
    </div>
  );
}

function ListaLeiturasHorizontal({ leituras, temaEscuro }) {
  const ui = obterClasses(temaEscuro);

  if (!leituras.length) {
    return <div className={`rounded-[1.7rem] p-6 text-center ${ui.painel}`}>Nenhuma leitura encontrada para este usuário.</div>;
  }

  return (
    <div className={`min-w-0 rounded-[1.7rem] p-5 ${ui.painel}`}>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-black">Últimas leituras</h2>
          <p className={`text-sm ${ui.textoSuave}`}>Dados recentes enviados pelo ESP32.</p>
        </div>

        <span className={`text-sm font-semibold ${ui.textoMuitoSuave}`}>{leituras.length} registros</span>
      </div>

      <SliderArea temaEscuro={temaEscuro} alturaSlider="h-48">
        <div className="flex min-w-max gap-4 pr-2">
          {leituras.map((item) => (
            <div key={`${item.id}-${item.recebido_em}`} className={`w-64 shrink-0 rounded-[1.4rem] p-5 ${ui.painelForte}`}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-2xl font-black">{item.valor_bpm} BPM</h3>
                <BadgeStatus valor={item.valor_bpm} />
              </div>

              <p className={`mt-4 text-sm ${ui.textoSuave}`}>{formatarDataHora(item.recebido_em)}</p>
            </div>
          ))}
        </div>
      </SliderArea>
    </div>
  );
}

function IconeCardiograma({ temaEscuro }) {
  return (
    <div className={`grid h-12 w-12 place-items-center rounded-2xl ${temaEscuro ? "bg-rose-500/15 text-rose-300" : "bg-rose-100 text-rose-700"}`}>
      <span className="text-2xl font-black">⌁</span>
    </div>
  );
}

function IconeHistorico({ temaEscuro }) {
  return (
    <div className={`grid h-12 w-12 place-items-center rounded-2xl ${temaEscuro ? "bg-sky-500/15 text-sky-300" : "bg-sky-100 text-sky-700"}`}>
      <span className="text-2xl font-black">↺</span>
    </div>
  );
}

function IconePerfil({ temaEscuro }) {
  return (
    <div className={`grid h-12 w-12 place-items-center rounded-2xl ${temaEscuro ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-100 text-emerald-700"}`}>
      <span className="text-xl font-black">ID</span>
    </div>
  );
}

function IconeNuvem({ temaEscuro }) {
  return (
    <div className={`grid h-12 w-12 place-items-center rounded-2xl ${temaEscuro ? "bg-violet-500/15 text-violet-300" : "bg-violet-100 text-violet-700"}`}>
      <span className="text-2xl font-black">☁</span>
    </div>
  );
}

function CardSimbolo({ icone, titulo, texto, temaEscuro }) {
  const ui = obterClasses(temaEscuro);

  return (
    <div className={`rounded-[1.5rem] p-4 ${ui.painel}`}>
      {icone}
      <h3 className="mt-4 font-black">{titulo}</h3>
      <p className={`mt-2 text-sm ${ui.textoSuave}`}>{texto}</p>
    </div>
  );
}

function FundoLogin({ slideAtual, visualizacao, temaEscuro = true }) {
  const slide = MEDICAL_SLIDES[slideAtual];

  if (visualizacao === "web") {
    return (
      <>
        <img src={slide.desktop} alt={slide.alt} className="absolute inset-0 h-full w-full object-cover transition-all duration-700" />

        <div
          className={`absolute inset-0 ${
            temaEscuro
              ? "bg-gradient-to-r from-slate-950 via-slate-950/78 to-slate-950/28"
              : "bg-gradient-to-r from-white via-white/76 to-white/24"
          }`}
        />

        <div
          className={`absolute inset-0 ${
            temaEscuro
              ? "bg-gradient-to-t from-slate-950/86 via-transparent to-slate-950/35"
              : "bg-gradient-to-t from-slate-100/80 via-transparent to-white/30"
          }`}
        />
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

      <div
        className={`absolute inset-0 ${
          temaEscuro
            ? "bg-gradient-to-b from-slate-950/48 via-slate-950/20 to-slate-950/72"
            : "bg-gradient-to-b from-white/34 via-white/14 to-white/62"
        }`}
      />

      <div className={temaEscuro ? "absolute inset-0 bg-blue-950/20" : "absolute inset-0 bg-blue-100/15"} />
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
        ? "border border-white/10 bg-slate-950/76 text-white shadow-2xl shadow-black/35 backdrop-blur-xl"
        : "border border-white/70 bg-white/84 text-slate-950 shadow-2xl shadow-slate-300/40 backdrop-blur-xl"
      : temaEscuro
        ? "border border-white/5 bg-slate-950/16 text-white shadow-lg shadow-black/10 backdrop-blur-0"
        : "border border-white/40 bg-white/34 text-slate-950 shadow-lg shadow-slate-300/20 backdrop-blur-0";

  if (visualizacao === "mobile") {
    return (
      <main className="relative min-h-screen overflow-hidden">
        <FundoLogin slideAtual={slideAtual} visualizacao={visualizacao} temaEscuro={temaEscuro} />
        <EstilosGlobais />

        <div className="relative z-10 flex min-h-screen flex-col justify-between px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <LogoBpm temaEscuro={temaEscuro} sobreImagem compacto />
            <div className="flex items-center gap-3">
              <BotaoVisualizacao visualizacao={visualizacao} alternarVisualizacao={alternarVisualizacao} temaEscuro={temaEscuro} />
              <BotaoTema temaEscuro={temaEscuro} alternarTema={alternarTema} />
            </div>
          </div>

          <section className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-5">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-rose-300">Dispositivo: {CODIGO_DISPOSITIVO}</p>
              <h1 className={temaEscuro ? "text-4xl font-black text-white" : "text-4xl font-black text-slate-950"}>Painel de BPM</h1>
              <p className={temaEscuro ? "mt-3 text-sm text-white/80" : "mt-3 text-sm text-slate-950/75"}>
                Acompanhe as leituras do ESP32, visualize o BPM atual e consulte o histórico diário do paciente.
              </p>
            </div>

            <form onSubmit={modoCadastro ? cadastrar : entrar} className={`rounded-[1.7rem] p-4 ${cardAcesso}`}>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-rose-300">Acesso</p>
              <h2 className="mt-2 text-2xl font-black">{modoCadastro ? "Cadastro" : "Entrar"}</h2>
              <p className={temaEscuro ? "mt-1 text-sm text-slate-300" : "mt-1 text-sm text-slate-700"}>
                {modoCadastro ? "Cadastre os dados do paciente." : "Entre com seu e-mail para acessar."}
              </p>

              <div className="mt-4 grid grid-cols-2 rounded-xl bg-black/10 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMensagem("");
                    setModoCadastro(false);
                  }}
                  className={`rounded-lg px-2 py-2 text-xs font-bold transition ${
                    !modoCadastro ? "bg-rose-600 text-white shadow-lg shadow-rose-900/20" : temaEscuro ? "text-slate-400" : "text-slate-700"
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
                  className={`rounded-lg px-2 py-2 text-xs font-bold transition ${
                    modoCadastro ? "bg-rose-600 text-white shadow-lg shadow-rose-900/20" : temaEscuro ? "text-slate-400" : "text-slate-700"
                  }`}
                >
                  Cadastro
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {modoCadastro && (
                  <>
                    <input
                      type="text"
                      placeholder="Nome"
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

                    <select value={form.sexo} onChange={(e) => atualizarCampo("sexo", e.target.value)} className={inputClasse}>
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
              </div>

              {mensagem && <p className="mt-4 rounded-xl bg-rose-500/15 p-3 text-sm text-rose-200">{mensagem}</p>}

              <button
                disabled={carregando}
                className="mt-4 w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-black text-white shadow-xl shadow-rose-950/20 transition hover:bg-rose-500 disabled:opacity-60"
              >
                {carregando ? "Aguarde..." : modoCadastro ? "Criar cadastro" : "Entrar"}
              </button>
            </form>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <FundoLogin slideAtual={slideAtual} visualizacao={visualizacao} temaEscuro={temaEscuro} />
      <EstilosGlobais />

      <div className="relative z-10 grid min-h-screen grid-cols-[minmax(0,1fr)_minmax(360px,460px)] gap-8 px-10 py-8">
        <section className="flex min-w-0 flex-col justify-between">
          <div className="flex items-center justify-between">
            <LogoBpm temaEscuro={temaEscuro} sobreImagem />
            <div className="flex items-center gap-4">
              <BotaoVisualizacao visualizacao={visualizacao} alternarVisualizacao={alternarVisualizacao} temaEscuro={temaEscuro} />
              <BotaoTema temaEscuro={temaEscuro} alternarTema={alternarTema} />
            </div>
          </div>

          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.28em] text-rose-300">Dispositivo: {CODIGO_DISPOSITIVO}</p>
            <h1 className={temaEscuro ? "text-6xl font-black tracking-tight text-white" : "text-6xl font-black tracking-tight text-slate-950"}>
              Painel de BPM
            </h1>
            <p className={temaEscuro ? "mt-5 text-xl leading-8 text-white/80" : "mt-5 text-xl leading-8 text-slate-950/75"}>
              Acompanhe as leituras do ESP32, visualize o BPM atual e consulte o histórico diário do paciente.
            </p>
          </div>

          <div className="grid max-w-5xl grid-cols-4 gap-4">
            <CardSimbolo
              temaEscuro={temaEscuro}
              icone={<IconeCardiograma temaEscuro={temaEscuro} />}
              titulo="Tempo real"
              texto="Consulta periódica do BPM atual."
            />
            <CardSimbolo
              temaEscuro={temaEscuro}
              icone={<IconeHistorico temaEscuro={temaEscuro} />}
              titulo="Histórico"
              texto="Registros por data e horário."
            />
            <CardSimbolo
              temaEscuro={temaEscuro}
              icone={<IconePerfil temaEscuro={temaEscuro} />}
              titulo="Perfil"
              texto="Usuário vinculado ao login."
            />
            <CardSimbolo
              temaEscuro={temaEscuro}
              icone={<IconeNuvem temaEscuro={temaEscuro} />}
              titulo="Integração"
              texto="ESP32, Supabase e site."
            />
          </div>
        </section>

        <section className="flex min-w-0 items-center">
          <form onSubmit={modoCadastro ? cadastrar : entrar} className={`w-full rounded-[2rem] p-7 ${cardAcesso}`}>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-rose-300">Acesso</p>
            <h2 className="mt-2 text-3xl font-black">{modoCadastro ? "Cadastro" : "Entrar"}</h2>
            <p className={temaEscuro ? "mt-1 text-sm text-slate-300" : "mt-1 text-sm text-slate-700"}>
              {modoCadastro ? "Cadastre os dados do paciente." : "Entre com seu e-mail para acessar o painel."}
            </p>

            <div className="mt-6 grid grid-cols-2 rounded-2xl bg-black/10 p-1">
              <button
                type="button"
                onClick={() => {
                  setMensagem("");
                  setModoCadastro(false);
                }}
                className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                  !modoCadastro ? "bg-rose-600 text-white shadow-lg shadow-rose-900/20" : temaEscuro ? "text-slate-400" : "text-slate-700"
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
                  modoCadastro ? "bg-rose-600 text-white shadow-lg shadow-rose-900/20" : temaEscuro ? "text-slate-400" : "text-slate-700"
                }`}
              >
                Cadastro
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {modoCadastro && (
                <>
                  <input
                    type="text"
                    placeholder="Nome"
                    value={form.nome}
                    onChange={(e) => atualizarCampo("nome", e.target.value)}
                    className={inputClasse}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      placeholder="Idade"
                      value={form.idade}
                      onChange={(e) => atualizarCampo("idade", e.target.value)}
                      className={inputClasse}
                    />

                    <select value={form.sexo} onChange={(e) => atualizarCampo("sexo", e.target.value)} className={inputClasse}>
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
            </div>

            {mensagem && <p className="mt-5 rounded-2xl bg-rose-500/15 p-4 text-sm text-rose-200">{mensagem}</p>}

            <button
              disabled={carregando}
              className="mt-6 w-full rounded-2xl bg-rose-600 px-5 py-4 text-sm font-black text-white shadow-xl shadow-rose-950/20 transition hover:bg-rose-500 disabled:opacity-60"
            >
              {carregando ? "Aguarde..." : modoCadastro ? "Criar cadastro" : "Entrar no painel"}
            </button>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className={`rounded-2xl p-3 text-center ${temaEscuro ? "bg-white/5" : "bg-white/60"}`}>
                <p className="text-sm font-black">Tempo real</p>
                <p className={`text-xs ${ui.textoMuitoSuave}`}>BPM</p>
              </div>

              <div className={`rounded-2xl p-3 text-center ${temaEscuro ? "bg-white/5" : "bg-white/60"}`}>
                <p className="text-sm font-black">Histórico</p>
                <p className={`text-xs ${ui.textoMuitoSuave}`}>Diário</p>
              </div>

              <div className={`rounded-2xl p-3 text-center ${temaEscuro ? "bg-white/5" : "bg-white/60"}`}>
                <p className="text-sm font-black">Vínculo</p>
                <p className={`text-xs ${ui.textoMuitoSuave}`}>Auto</p>
              </div>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

async function buscarTodasLeiturasDoDia(perfilId, inicioHojeISO, fimHojeISO) {
  const tamanhoPagina = 1000;
  const todasLeituras = [];
  let inicio = 0;

  while (true) {
    const fim = inicio + tamanhoPagina - 1;

    const { data, error } = await supabase
      .from("historico_bpm")
      .select("id, perfil_id, valor_bpm, registrado_em")
      .eq("perfil_id", perfilId)
      .gte("registrado_em", inicioHojeISO)
      .lt("registrado_em", fimHojeISO)
      .order("registrado_em", { ascending: false })
      .range(inicio, fim);

    if (error) {
      return {
        data: [],
        error,
      };
    }

    const pagina = data || [];
    todasLeituras.push(...pagina);

    if (pagina.length < tamanhoPagina) {
      break;
    }

    inicio += tamanhoPagina;
  }

  return {
    data: todasLeituras,
    error: null,
  };
}

function Dashboard({ sessao, temaEscuro, alternarTema, visualizacao, alternarVisualizacao }) {
  const ui = obterClasses(temaEscuro);

  const [bpmAtual, setBpmAtual] = useState(null);
  const [ultima, setUltima] = useState(null);
  const [leiturasUsuario, setLeiturasUsuario] = useState([]);
  const [mediaDia, setMediaDia] = useState(null);
  const [totalLeiturasDia, setTotalLeiturasDia] = useState(0);
  const [leiturasGerais, setLeiturasGerais] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  async function carregarDashboard() {
    if (!sessao?.user?.id) return;

    setCarregando(true);

    const inicioHoje = new Date();
    inicioHoje.setHours(0, 0, 0, 0);

    const fimHoje = new Date(inicioHoje);
    fimHoje.setDate(fimHoje.getDate() + 1);

    const inicioHojeISO = inicioHoje.toISOString();
    const fimHojeISO = fimHoje.toISOString();

    const { data: atual, error: erroAtual } = await supabase
      .from("bpm_tempo_real")
      .select("perfil_id, valor_bpm, recebido_em, atualizado_em")
      .eq("perfil_id", sessao.user.id)
      .gte("atualizado_em", inicioHojeISO)
      .lt("atualizado_em", fimHojeISO)
      .maybeSingle();

    const { data: historicoCompleto, error: erroHistorico } =
      await buscarTodasLeiturasDoDia(
        sessao.user.id,
        inicioHojeISO,
        fimHojeISO
      );

    const { data: geral } = await supabase
      .from("bpm_tempo_real")
      .select("perfil_id, valor_bpm, recebido_em, atualizado_em")
      .gte("atualizado_em", inicioHojeISO)
      .lt("atualizado_em", fimHojeISO)
      .order("atualizado_em", { ascending: false })
      .limit(1);

    if (erroAtual && erroHistorico) {
      setErro(`Erro ao carregar dashboard: ${erroAtual.message}`);
      setBpmAtual(null);
      setUltima(null);
      setLeiturasUsuario([]);
      setMediaDia(null);
      setTotalLeiturasDia(0);
      setLeiturasGerais([]);
      setCarregando(false);
      return;
    }

    const historicoNormalizadoCompleto = (historicoCompleto || []).map((item) => ({
      id: item.id,
      valor_bpm: item.valor_bpm,
      recebido_em: item.registrado_em,
      perfil_id: item.perfil_id,
    }));

    const leiturasParaPainel = historicoNormalizadoCompleto.slice(0, 80);
    const mediaCalculadaDia = calcularMedia(historicoNormalizadoCompleto);

    setErro("");
    setBpmAtual(
      atual?.valor_bpm ??
        historicoNormalizadoCompleto[0]?.valor_bpm ??
        null
    );
    setUltima({
      recebido_em:
        atual?.atualizado_em ||
        atual?.recebido_em ||
        historicoNormalizadoCompleto[0]?.recebido_em,
    });
    setLeiturasUsuario(leiturasParaPainel);
    setMediaDia(mediaCalculadaDia);
    setTotalLeiturasDia(historicoNormalizadoCompleto.length);
    setLeiturasGerais(geral || []);
    setCarregando(false);
  }

  useEffect(() => {
    carregarDashboard();

    const intervalo = setInterval(carregarDashboard, 5000);

    return () => clearInterval(intervalo);
  }, [sessao?.user?.id]);

  const espEnviaParaOutroPerfil =
    !bpmAtual && leiturasGerais.length > 0 && leiturasGerais[0]?.perfil_id && leiturasGerais[0]?.perfil_id !== sessao?.user?.id;

  return (
    <div className="mx-auto flex h-full max-w-[1500px] flex-col overflow-hidden">
      <PageHeader
        temaEscuro={temaEscuro}
        titulo="Início"
        subtitulo="Acompanhamento em tempo real com dados registrados somente no dia atual."
      >
        <button onClick={carregarDashboard} className={ui.botaoPrimario}>
          Atualizar
        </button>
        <BotaoTema temaEscuro={temaEscuro} alternarTema={alternarTema} />
        <BotaoVisualizacao visualizacao={visualizacao} alternarVisualizacao={alternarVisualizacao} temaEscuro={temaEscuro} />
      </PageHeader>

      {erro && <div className="mb-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">{erro}</div>}

      {espEnviaParaOutroPerfil && (
        <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          O ESP32 está enviando leituras, mas elas parecem estar vinculadas a outro perfil.
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-4">
        <CardResumo
          temaEscuro={temaEscuro}
          titulo="BPM atual"
          valor={carregando ? "..." : bpmAtual ? `${bpmAtual} BPM` : "Sem dados"}
          subtitulo={ultima?.recebido_em ? formatarDataHora(ultima.recebido_em) : "Aguardando leitura do ESP32"}
        />

        <CardResumo
          temaEscuro={temaEscuro}
          titulo="Status"
          valor={classificarBpm(bpmAtual)}
          subtitulo="Classificação automática pela faixa do BPM"
        />

        <CardResumo
          temaEscuro={temaEscuro}
          titulo="Média do dia"
          valor={mediaDia ? `${mediaDia} BPM` : "--"}
          subtitulo="Baseada em todas as leituras registradas hoje"
        />

        <CardResumo
          temaEscuro={temaEscuro}
          titulo="Registros de hoje"
          valor={totalLeiturasDia}
          subtitulo="Total de leituras registradas no dia"
        />
      </div>

      <div className="mt-4 grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <div className="min-w-0">
          <GraficoBpm dados={leiturasUsuario} temaEscuro={temaEscuro} titulo="Variação de hoje" altura={280} />
        </div>

        <div className="min-w-0">
          <ListaLeiturasHorizontal leituras={leiturasUsuario.slice(0, 20)} temaEscuro={temaEscuro} />
        </div>
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

  const valor = item.valor_bpm ?? item.bpm ?? item.bpm_atual ?? item.bpm_medio ?? item.media_bpm ?? item.bpm_media ?? null;
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
  const fontes = ["vw_bpm_historico_minuto", "v_bpm_historico_minuto", "bpm_historico_minuto", "historico_bpm", "bpm_tempo_real"];

  for (const fonte of fontes) {
    const { data, error } = await supabase.from(fonte).select("*").eq("perfil_id", sessao.user.id).limit(500);

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

function Historico({ sessao, temaEscuro, alternarTema, visualizacao, alternarVisualizacao }) {
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
      recebido_em: itens[0]?.recebido_em,
    }));
  }, [leituras]);

  const grupoSelecionado = grupos.find((grupo) => grupo.data === dataAberta);

  if (grupoSelecionado) {
    return (
      <div className="mx-auto flex h-full max-w-[1500px] flex-col overflow-hidden">
        <PageHeader
          temaEscuro={temaEscuro}
          titulo={grupoSelecionado.data}
          subtitulo="Leituras registradas dentro da data selecionada."
        >
          <button onClick={() => setDataAberta(null)} className={ui.botaoPrimario}>
            Voltar
          </button>
          <BotaoTema temaEscuro={temaEscuro} alternarTema={alternarTema} />
          <BotaoVisualizacao visualizacao={visualizacao} alternarVisualizacao={alternarVisualizacao} temaEscuro={temaEscuro} />
        </PageHeader>

        <div className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-2">
          <GraficoBpm dados={grupoSelecionado.itens} temaEscuro={temaEscuro} titulo="Curva do dia" altura={260} />
          <GraficoBarrasBpm dados={grupoSelecionado.itens} temaEscuro={temaEscuro} />
        </div>

        <div className="mt-4">
          <ListaLeiturasHorizontal leituras={grupoSelecionado.itens} temaEscuro={temaEscuro} />
        </div>
      </div>
    );
  }

  const gruposParaGrafico = grupos.map((grupo, index) => ({
    id: index + 1,
    valor_bpm: grupo.media || 0,
    recebido_em: grupo.recebido_em || new Date().toISOString(),
  }));

  return (
    <div className="mx-auto flex h-full max-w-[1500px] flex-col overflow-hidden">
      <PageHeader
        temaEscuro={temaEscuro}
        titulo="Histórico"
        subtitulo="Datas com leituras registradas. Abra um dia para ver os valores e os gráficos."
      >
        <button onClick={carregarHistorico} className={ui.botaoPrimario}>
          Atualizar
        </button>
        <BotaoTema temaEscuro={temaEscuro} alternarTema={alternarTema} />
        <BotaoVisualizacao visualizacao={visualizacao} alternarVisualizacao={alternarVisualizacao} temaEscuro={temaEscuro} />
      </PageHeader>

      {erro && <div className="mb-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">{erro}</div>}

      {carregando ? (
        <div className={`rounded-[1.7rem] p-8 text-center ${ui.painel}`}>Carregando histórico...</div>
      ) : grupos.length === 0 ? (
        <div className={`rounded-[1.7rem] p-8 text-center ${ui.painel}`}>Nenhuma leitura encontrada no histórico.</div>
      ) : (
        <>
          <div className="mb-4 min-w-0">
            <GraficoBpm dados={gruposParaGrafico} temaEscuro={temaEscuro} titulo="Média por dia" altura={240} mostrarHora={false} />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {grupos.map((grupo) => (
                <button
                  key={grupo.data}
                  onClick={() => setDataAberta(grupo.data)}
                  className={`rounded-[1.7rem] p-5 text-left transition hover:scale-[1.01] ${ui.painel}`}
                >
                  <h2 className="text-xl font-black">{grupo.data}</h2>
                  <p className={`mt-1 text-sm ${ui.textoSuave}`}>{grupo.itens.length} leituras registradas</p>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className={`rounded-2xl p-3 text-center ${ui.painelForte}`}>
                      <p className={`text-xs ${ui.textoMuitoSuave}`}>Média</p>
                      <p className="text-lg font-black">{grupo.media ?? "--"}</p>
                    </div>

                    <div className={`rounded-2xl p-3 text-center ${ui.painelForte}`}>
                      <p className={`text-xs ${ui.textoMuitoSuave}`}>Mín</p>
                      <p className="text-lg font-black">{grupo.menor ?? "--"}</p>
                    </div>

                    <div className={`rounded-2xl p-3 text-center ${ui.painelForte}`}>
                      <p className={`text-xs ${ui.textoMuitoSuave}`}>Máx</p>
                      <p className="text-lg font-black">{grupo.maior ?? "--"}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Perfil({ sessao, perfil, temaEscuro, alternarTema, visualizacao, alternarVisualizacao }) {
  const ui = obterClasses(temaEscuro);

  return (
    <div className="mx-auto max-w-[1500px] overflow-hidden">
      <PageHeader temaEscuro={temaEscuro} titulo="Perfil" subtitulo="Dados reais do paciente autenticado no Supabase.">
        <BotaoTema temaEscuro={temaEscuro} alternarTema={alternarTema} />
        <BotaoVisualizacao visualizacao={visualizacao} alternarVisualizacao={alternarVisualizacao} temaEscuro={temaEscuro} />
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={`rounded-[1.7rem] p-6 ${ui.painel}`}>
          <h2 className="text-xl font-black">Dados do paciente</h2>

          <div className="mt-5 space-y-4">
            <div>
              <p className={`text-sm ${ui.textoMuitoSuave}`}>Nome</p>
              <p className="font-bold">{perfil?.nome || sessao?.user?.user_metadata?.nome || "--"}</p>
            </div>

            <div>
              <p className={`text-sm ${ui.textoMuitoSuave}`}>E-mail</p>
              <p className="break-all font-bold">{sessao?.user?.email}</p>
            </div>

            <div>
              <p className={`text-sm ${ui.textoMuitoSuave}`}>Idade</p>
              <p className="font-bold">{perfil?.idade ?? "--"}</p>
            </div>

            <div>
              <p className={`text-sm ${ui.textoMuitoSuave}`}>Sexo</p>
              <p className="font-bold">{perfil?.sexo || "--"}</p>
            </div>
          </div>
        </div>

        <div className={`rounded-[1.7rem] p-6 ${ui.painel}`}>
          <h2 className="text-xl font-black">Vínculo do dispositivo</h2>

          <div className="mt-5 space-y-4">
            <div>
              <p className={`text-sm ${ui.textoMuitoSuave}`}>Dispositivo</p>
              <p className="font-bold">{CODIGO_DISPOSITIVO}</p>
            </div>

            <div>
              <p className={`text-sm ${ui.textoMuitoSuave}`}>ID do usuário logado</p>
              <p className="break-all font-mono text-sm">{sessao?.user?.id}</p>
            </div>

            <div>
              <p className={`text-sm ${ui.textoMuitoSuave}`}>Criação do perfil</p>
              <p className="font-bold">{perfil?.criado_em ? formatarDataHora(perfil.criado_em) : "--"}</p>
            </div>
          </div>
        </div>
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

    const { data, error } = await supabase.from("perfis").select("*").eq("id", sessaoAtual.user.id).maybeSingle();

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
      <>
        <EstilosGlobais />
        <div className={`grid min-h-screen place-items-center ${ui.pagina}`}>
          <div className="text-lg font-black">Carregando...</div>
        </div>
      </>
    );
  }

  if (!sessao) {
    return (
      <>
        <EstilosGlobais />
        <TelaLogin
          temaEscuro={temaEscuro}
          alternarTema={alternarTema}
          visualizacao={visualizacao}
          alternarVisualizacao={alternarVisualizacao}
        />
      </>
    );
  }

  const nome = perfil?.nome || sessao?.user?.user_metadata?.nome || sessao?.user?.email || "Paciente";

  if (visualizacao === "mobile") {
    return (
      <>
        <EstilosGlobais />

        <main className={`${ui.pagina} h-screen overflow-hidden`}>
          <div className="flex h-screen flex-col overflow-hidden">
            <header className={`shrink-0 border-b px-4 py-4 ${temaEscuro ? "border-white/10 bg-slate-950" : "border-slate-200 bg-white"}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className={`text-xs font-bold uppercase tracking-[0.2em] ${ui.textoMuitoSuave}`}>Bem-vindo</p>
                  <h1 className="truncate text-lg font-black">{nome}</h1>
                  <p className={`truncate text-xs ${ui.textoMuitoSuave}`}>{sessao.user.email}</p>
                </div>

                <button onClick={sair} className={ui.botaoSecundario}>
                  Sair
                </button>
              </div>
            </header>

            <section className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
              {abaAtiva === "inicio" && (
                <Dashboard
                  sessao={sessao}
                  temaEscuro={temaEscuro}
                  alternarTema={alternarTema}
                  visualizacao={visualizacao}
                  alternarVisualizacao={alternarVisualizacao}
                />
              )}
              {abaAtiva === "historico" && (
                <Historico
                  sessao={sessao}
                  temaEscuro={temaEscuro}
                  alternarTema={alternarTema}
                  visualizacao={visualizacao}
                  alternarVisualizacao={alternarVisualizacao}
                />
              )}
              {abaAtiva === "perfil" && (
                <Perfil
                  sessao={sessao}
                  perfil={perfil}
                  temaEscuro={temaEscuro}
                  alternarTema={alternarTema}
                  visualizacao={visualizacao}
                  alternarVisualizacao={alternarVisualizacao}
                />
              )}
            </section>

            <nav className={`shrink-0 border-t px-4 py-3 ${temaEscuro ? "border-white/10 bg-slate-950" : "border-slate-200 bg-white"}`}>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => setAbaAtiva("inicio")}
                  className={`rounded-2xl px-3 py-3 text-sm font-semibold transition ${abaAtiva === "inicio" ? ui.menuAtivo : ui.menuInativo}`}
                >
                  Início
                </button>

                <button
                  onClick={() => setAbaAtiva("historico")}
                  className={`rounded-2xl px-3 py-3 text-sm font-semibold transition ${abaAtiva === "historico" ? ui.menuAtivo : ui.menuInativo}`}
                >
                  Histórico
                </button>

                <button
                  onClick={() => setAbaAtiva("perfil")}
                  className={`rounded-2xl px-3 py-3 text-sm font-semibold transition ${abaAtiva === "perfil" ? ui.menuAtivo : ui.menuInativo}`}
                >
                  Perfil
                </button>

                <button onClick={sair} className={`rounded-2xl px-3 py-3 text-sm font-semibold transition ${ui.menuInativo}`}>
                  Sair
                </button>
              </div>
            </nav>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <EstilosGlobais />

      <main className={`${ui.pagina} h-screen overflow-hidden`}>
        <div className="grid h-screen min-w-0 grid-cols-[280px_minmax(0,1fr)] overflow-hidden">
          <aside className={`flex min-h-0 flex-col border-r p-5 ${temaEscuro ? "border-white/10 bg-slate-950" : "border-slate-200 bg-white"}`}>
            <LogoBpm temaEscuro={temaEscuro} />

            <div className={`mt-6 rounded-[1.5rem] p-4 ${ui.painel}`}>
              <p className={`text-xs font-bold uppercase tracking-[0.2em] ${ui.textoMuitoSuave}`}>Bem-vindo</p>
              <h2 className="mt-1 break-words text-lg font-black">{nome}</h2>
              <p className={`mt-1 break-all text-xs ${ui.textoMuitoSuave}`}>{sessao.user.email}</p>
            </div>

            <nav className="mt-6 flex flex-col gap-2">
              <button
                onClick={() => setAbaAtiva("inicio")}
                className={`rounded-2xl px-4 py-3 text-left font-semibold transition ${abaAtiva === "inicio" ? ui.menuAtivo : ui.menuInativo}`}
              >
                Início
              </button>

              <button
                onClick={() => setAbaAtiva("historico")}
                className={`rounded-2xl px-4 py-3 text-left font-semibold transition ${abaAtiva === "historico" ? ui.menuAtivo : ui.menuInativo}`}
              >
                Histórico
              </button>

              <button
                onClick={() => setAbaAtiva("perfil")}
                className={`rounded-2xl px-4 py-3 text-left font-semibold transition ${abaAtiva === "perfil" ? ui.menuAtivo : ui.menuInativo}`}
              >
                Perfil
              </button>
            </nav>

            <div className="mt-auto flex flex-col gap-3">
              <button onClick={sair} className={ui.botaoSecundario}>
                Sair
              </button>
            </div>
          </aside>

          <section className="min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-6">
            {abaAtiva === "inicio" && (
              <Dashboard
                sessao={sessao}
                temaEscuro={temaEscuro}
                alternarTema={alternarTema}
                visualizacao={visualizacao}
                alternarVisualizacao={alternarVisualizacao}
              />
            )}
            {abaAtiva === "historico" && (
              <Historico
                sessao={sessao}
                temaEscuro={temaEscuro}
                alternarTema={alternarTema}
                visualizacao={visualizacao}
                alternarVisualizacao={alternarVisualizacao}
              />
            )}
            {abaAtiva === "perfil" && (
              <Perfil
                sessao={sessao}
                perfil={perfil}
                temaEscuro={temaEscuro}
                alternarTema={alternarTema}
                visualizacao={visualizacao}
                alternarVisualizacao={alternarVisualizacao}
              />
            )}
          </section>
        </div>
      </main>
    </>
  );
}

export default App;