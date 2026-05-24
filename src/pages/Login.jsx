import { useState } from 'react'
import { HeartPulse } from 'lucide-react'
import { supabase } from '../lib/supabaseClient.js'

export function Login({ onLogin }) {
  const [modo, setModo] = useState('login')
  const [nome, setNome] = useState('')
  const [idade, setIdade] = useState('')
  const [sexo, setSexo] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  async function entrar(event) {
    event.preventDefault()
    setErro('')
    setMensagem('')
    setCarregando(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha
    })

    setCarregando(false)

    if (error) {
      setErro(error.message)
      return
    }

    onLogin(data.session)
  }

  async function cadastrar(event) {
    event.preventDefault()
    setErro('')
    setMensagem('')

    const nomeTratado = nome.trim()
    const emailTratado = email.trim().toLowerCase()
    const idadeNumero = Number(idade)

    if (!nomeTratado) {
      setErro('Digite o nome do paciente.')
      return
    }

    if (!idadeNumero || idadeNumero <= 0 || idadeNumero > 130) {
      setErro('Digite uma idade válida.')
      return
    }

    if (!sexo) {
      setErro('Selecione o sexo.')
      return
    }

    if (!emailTratado) {
      setErro('Digite um e-mail válido.')
      return
    }

    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.')
      return
    }

    if (senha !== confirmarSenha) {
      setErro('As senhas não são iguais.')
      return
    }

    setCarregando(true)

    const { data, error } = await supabase.auth.signUp({
      email: emailTratado,
      password: senha,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          nome: nomeTratado,
          full_name: nomeTratado,
          idade: idadeNumero,
          sexo
        }
      }
    })

    setCarregando(false)

    if (error) {
      setErro(error.message)
      return
    }

    if (data.session) {
      onLogin(data.session)
      return
    }

    setMensagem('Cadastro realizado. Verifique seu e-mail para confirmar a conta antes de entrar.')
    setModo('login')
    setSenha('')
    setConfirmarSenha('')
  }

  function trocarModo(novoModo) {
    setModo(novoModo)
    setErro('')
    setMensagem('')
  }

  const estaNoCadastro = modo === 'cadastro'

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-8 text-slate-100">
      <section className="w-full max-w-md rounded-[2rem] border border-slate-800 bg-slate-900 p-7 shadow-2xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/15 text-red-400">
            <HeartPulse size={44} />
          </div>

          <h1 className="text-3xl font-bold tracking-tight">Monitor BPM</h1>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            {estaNoCadastro
              ? 'Crie sua conta para acessar o monitoramento cardíaco.'
              : 'Acompanhe os batimentos cardíacos em tempo real e consulte o histórico do paciente.'}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-2xl border border-slate-700 bg-slate-950 p-1">
          <button
            type="button"
            onClick={() => trocarModo('login')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              modo === 'login'
                ? 'bg-red-500 text-white'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            Entrar
          </button>

          <button
            type="button"
            onClick={() => trocarModo('cadastro')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              modo === 'cadastro'
                ? 'bg-red-500 text-white'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            Cadastrar
          </button>
        </div>

        <form onSubmit={estaNoCadastro ? cadastrar : entrar} className="space-y-4">
          {estaNoCadastro && (
            <>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Nome do paciente
                </span>
                <input
                  type="text"
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
                  placeholder="Digite o nome"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-red-400"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Idade
                </span>
                <input
                  type="number"
                  value={idade}
                  onChange={(event) => setIdade(event.target.value)}
                  placeholder="Digite a idade"
                  min="1"
                  max="130"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-red-400"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Sexo
                </span>
                <select
                  value={sexo}
                  onChange={(event) => setSexo(event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-red-400"
                  required
                >
                  <option value="">Selecione</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                  <option value="outro">Outro</option>
                </select>
              </label>
            </>
          )}

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="usuario@email.com"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-red-400"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Senha</span>
            <input
              type="password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              placeholder="Digite sua senha"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-red-400"
              required
            />
          </label>

          {estaNoCadastro && (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                Confirmar senha
              </span>
              <input
                type="password"
                value={confirmarSenha}
                onChange={(event) => setConfirmarSenha(event.target.value)}
                placeholder="Digite a senha novamente"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-red-400"
                required
              />
            </label>
          )}

          {erro && (
            <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {erro}
            </p>
          )}

          {mensagem && (
            <p className="rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
              {mensagem}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-2xl bg-red-500 px-5 py-3 font-semibold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {carregando
              ? estaNoCadastro
                ? 'Cadastrando...'
                : 'Entrando...'
              : estaNoCadastro
                ? 'Criar conta'
                : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  )
}