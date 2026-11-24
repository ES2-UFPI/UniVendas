import type { FormEvent, ReactNode } from 'react'
import { Avatar } from '../../../core/ui/Avatar'
import { Aviso } from '../../../core/ui/Aviso'
import { Botao } from '../../../core/ui/Botao'
import { CampoFormulario, estiloAreaTexto, estiloEntrada } from '../../../core/ui/CampoFormulario'
import { Icone } from '../../../core/ui/Icone'
import type { NomeIcone } from '../../../core/ui/icones'
import type { CanalTipo } from '../domain/Contato'
import type { DadosCadastroVendedor, ErrosCadastroVendedor } from '../domain/validacoesVendedor'

interface FormularioPerfilVendedorProps {
  dados: DadosCadastroVendedor
  erros: ErrosCadastroVendedor
  alterar: (campo: keyof DadosCadastroVendedor, valor: string) => void
  /** Endereço da foto (a nova escolhida ou a já salva), ou null. */
  previaFoto: string | null
  /** Já tem foto: o texto vira "Trocar foto do perfil". */
  temFoto: boolean
  preparandoFoto: boolean
  erroFoto: string | null
  escolherFoto: (arquivo: Blob | null) => void
  salvando: boolean
  erroGeral: string | null
  /** "Criar meu perfil de vendedor" ou "Salvar alterações". */
  textoBotao: string
  iconeBotao: NomeIcone
  aoEnviar: () => Promise<unknown>
  /** Embaixo de cada número (no Meu perfil, o interruptor "Mostrar", US19). */
  extraDoContato?: (canal: CanalTipo, rotulo: string) => ReactNode
  /** Depois dos contatos (no Meu perfil, o aviso de números ocultos). */
  depoisDosContatos?: ReactNode
  /** Logo antes do botão (no Meu perfil, o "Perfil atualizado."). */
  antesDoBotao?: ReactNode
}

const CONTATOS: { canal: CanalTipo; rotulo: string; placeholder: string; autoComplete?: string }[] =
  [
    { canal: 'whatsapp', rotulo: 'WhatsApp', placeholder: '(86) 99999-8888', autoComplete: 'tel' },
    { canal: 'telefone', rotulo: 'Telefone', placeholder: '(86) 3215-1234' },
  ]

/**
 * Formulário do perfil de vendedor (US03, US14; visual da US21), o mesmo no "Quero vender" e no
 * "Meu perfil": foto, nome, o que vende e os contatos (ao menos um, RN06). Cada tela passa o
 * estado do seu ViewModel e o que tem a mais.
 */
export function FormularioPerfilVendedor({
  dados,
  erros,
  alterar,
  previaFoto,
  temFoto,
  preparandoFoto,
  erroFoto,
  escolherFoto,
  salvando,
  erroGeral,
  textoBotao,
  iconeBotao,
  aoEnviar,
  extraDoContato,
  depoisDosContatos,
  antesDoBotao,
}: FormularioPerfilVendedorProps) {
  const ocupado = salvando || preparandoFoto

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    await aoEnviar()
  }

  return (
    <form onSubmit={enviar} noValidate className="flex min-w-0 flex-col gap-6">
      {/* O campo de arquivo fica escondido; o anel de foco aparece em volta da foto e do texto. */}
      <div className="flex flex-col gap-1 rounded-controle has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-4 has-[input:focus-visible]:outline-marca-600">
        <label htmlFor="foto" className="flex cursor-pointer items-center gap-4">
          {previaFoto ? (
            <img
              src={previaFoto}
              alt=""
              className="h-[76px] w-[76px] shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full border border-dashed border-borda bg-marca-50 text-marca-600">
              <Icone nome="mais" className="h-6 w-6" />
            </span>
          )}
          <span className="font-bold text-marca-600 underline-offset-2 hover:underline">
            {preparandoFoto
              ? 'Preparando a foto…'
              : temFoto
                ? 'Trocar foto do perfil'
                : 'Adicionar foto do perfil'}
          </span>
        </label>
        <input
          id="foto"
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={ocupado}
          aria-describedby={erroFoto ? 'foto-erro' : 'foto-ajuda'}
          onChange={(e) => escolherFoto(e.target.files?.[0] ?? null)}
        />
        <p id="foto-ajuda" className="pl-[92px] text-sm text-tinta-suave">
          Opcional. Sua foto ou a do seu negócio.
        </p>
        {erroFoto && (
          <p id="foto-erro" className="pl-[92px] text-sm text-perigo">
            {erroFoto}
          </p>
        )}
      </div>

      <CampoFormulario
        id="nomeExibicao"
        rotulo="Nome que os compradores vão ver"
        erro={erros.nomeExibicao}
      >
        <input
          id="nomeExibicao"
          className={estiloEntrada}
          value={dados.nomeExibicao}
          onChange={(e) => alterar('nomeExibicao', e.target.value)}
          aria-invalid={!!erros.nomeExibicao}
          aria-describedby={erros.nomeExibicao ? 'nomeExibicao-erro' : undefined}
          placeholder="Ex.: Doces da Ana"
        />
      </CampoFormulario>

      <CampoFormulario id="descricao" rotulo="O que você vende" opcional>
        <textarea
          id="descricao"
          className={estiloAreaTexto}
          rows={3}
          value={dados.descricao}
          onChange={(e) => alterar('descricao', e.target.value)}
          placeholder="Ex.: Brownies e bolos caseiros para o seu intervalo no campus."
        />
      </CampoFormulario>

      <fieldset
        className="flex min-w-0 flex-col gap-4"
        aria-describedby={erros.contato ? 'contato-erro' : 'contato-ajuda'}
      >
        <legend className="font-titulo text-xl tracking-[-0.035em] text-tinta">
          Como podem falar com você?
        </legend>
        <p id="contato-ajuda" className="-mt-2 text-sm text-tinta-suave">
          Informe pelo menos um contato.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {CONTATOS.map(({ canal, rotulo, placeholder, autoComplete }) => (
            <CampoFormulario key={canal} id={canal} rotulo={rotulo} erro={erros[canal]}>
              <input
                id={canal}
                type="tel"
                inputMode="tel"
                autoComplete={autoComplete}
                className={estiloEntrada}
                value={dados[canal]}
                onChange={(e) => alterar(canal, e.target.value)}
                aria-invalid={!!erros[canal]}
                aria-describedby={erros[canal] ? `${canal}-erro` : undefined}
                placeholder={placeholder}
              />
              {extraDoContato?.(canal, rotulo)}
            </CampoFormulario>
          ))}
        </div>
        {erros.contato && (
          <p id="contato-erro" className="text-sm text-perigo">
            {erros.contato}
          </p>
        )}
        {depoisDosContatos}
      </fieldset>

      {erroGeral && <Aviso tipo="erro">{erroGeral}</Aviso>}
      {antesDoBotao}

      <Botao type="submit" icone={iconeBotao} disabled={ocupado} className="w-full">
        {salvando ? 'Salvando…' : textoBotao}
      </Botao>
    </form>
  )
}

interface PreviaPerfilVendedorProps {
  nome: string
  descricao: string
  fotoUrl: string | null
  /** Os números que os compradores vão ver (preenchidos e, no Meu perfil, não ocultos). */
  whatsapp: boolean
  telefone: boolean
}

/** Uma pílula de contato da prévia: só mostra, não liga nem abre nada. */
function PilulaContato({ icone, children }: { icone: NomeIcone; children: string }) {
  return (
    <li className="inline-flex h-[42px] items-center gap-2 rounded-controle border border-linha bg-white px-4 text-[15px] font-bold text-marca-600">
      <Icone nome={icone} className="h-[18px] w-[18px]" />
      {children}
    </li>
  )
}

/**
 * "Como seu perfil vai aparecer" (US21): a prévia do perfil público, que acompanha o que a
 * pessoa digita no formulário. O "Chat" sempre aparece, porque é falado dentro do app (US18).
 */
export function PreviaPerfilVendedor({
  nome,
  descricao,
  fotoUrl,
  whatsapp,
  telefone,
}: PreviaPerfilVendedorProps) {
  const nomeVisivel = nome.trim()
  return (
    <aside
      aria-labelledby="titulo-previa"
      className="flex min-w-0 flex-col gap-6 rounded-cartao bg-marca-50 p-6 md:p-7"
    >
      <h3 id="titulo-previa" className="font-titulo text-lg tracking-[-0.035em] text-tinta">
        Como seu perfil vai aparecer
      </h3>
      <div className="flex min-w-0 items-center gap-4">
        <Avatar nome={nomeVisivel || '?'} fotoUrl={fotoUrl} className="h-16 w-16 text-2xl" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p
            className={`font-titulo text-2xl leading-tight tracking-[-0.035em] break-words ${nomeVisivel ? 'text-tinta' : 'text-tinta-suave'}`}
          >
            {nomeVisivel || 'Seu nome aqui'}
          </p>
          <p className="text-sm text-tinta-suave">Vendedor ambulante</p>
        </div>
      </div>
      <p className={`break-words ${descricao.trim() ? 'text-tinta' : 'text-tinta-suave'}`}>
        {descricao.trim() || 'Conte em poucas palavras o que você vende.'}
      </p>
      <ul aria-label="Contatos na prévia" className="flex flex-wrap gap-3">
        {whatsapp && <PilulaContato icone="telefone">WhatsApp</PilulaContato>}
        {telefone && <PilulaContato icone="telefone">Telefone</PilulaContato>}
        <PilulaContato icone="chat">Chat</PilulaContato>
      </ul>
    </aside>
  )
}
