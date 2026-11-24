import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { ROTAS } from '../../../core/routes'
import { Aviso } from '../../../core/ui/Aviso'
import { Botao } from '../../../core/ui/Botao'
import { CampoFormulario, estiloAreaTexto, estiloEntrada } from '../../../core/ui/CampoFormulario'
import { Cartao } from '../../../core/ui/Cartao'
import { FotoOuInicial } from '../../../core/ui/FotoOuInicial'
import { Icone } from '../../../core/ui/Icone'
import { Interruptor } from '../../../core/ui/Interruptor'
import { Selo } from '../../../core/ui/Selo'
import { TituloTela } from '../../../core/ui/TituloTela'
import type { VendedorRepository } from '../../vendedores/domain/VendedorRepository'
import { agruparFolhas, raizDe, raizes } from '../domain/Categoria'
import type { Item } from '../domain/Item'
import type { ItemRepository } from '../domain/ItemRepository'
import { formatarPreco } from '../domain/validacoesItem'
import { useItensViewModel } from './useItensViewModel'

interface MeusItensPageProps {
  /** Id da conta logada (= perfis.id). A rota protegida passa o da sessão. */
  perfilId: string | null
  /** Só para os testes: repositórios falsos. */
  repositorio?: ItemRepository
  vendedores?: VendedorRepository
  comprimir?: (foto: Blob) => Promise<Blob>
}

type ViewModel = ReturnType<typeof useItensViewModel>

/** "1 item cadastrado", "4 itens cadastrados". */
function contar(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`
}

/** Botão de ícone das linhas (editar, remover): 40 px de área de toque e o nome no `aria-label`. */
const estiloBotaoIcone =
  'flex h-10 w-10 items-center justify-center rounded-controle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600'

/**
 * Formulário do item (US08): foto, nome, tipo de produto, categoria folha (RN07), preço e
 * descrição. Sem item escolhido, adiciona um novo; com "Editar", muda o item da lista.
 * O tipo de produto é a raiz da árvore de categorias e só filtra as folhas que aparecem.
 */
function FormularioItem({
  vm,
  campoNome,
}: {
  vm: ViewModel
  campoNome: RefObject<HTMLInputElement | null>
}) {
  const { dados, erros } = vm
  const ocupado = vm.salvando || vm.preparandoFoto
  const tipos = raizes(vm.categorias)
  const [tipoEscolhido, setTipoEscolhido] = useState<number | null>(null)
  // Com uma categoria já escolhida (ao editar), o tipo é a raiz dela.
  const tipo = raizDe(dados.categoriaId, vm.categorias)?.id ?? tipoEscolhido
  const grupos = agruparFolhas(vm.categorias)
    .filter((g) => tipo === null || raizDe(g.folhas[0].id, vm.categorias)?.id === tipo)
    // Com o tipo escolhido, o nome dele sai do grupo ("Alimentação › Doces" vira "Doces").
    .map((g) => ({
      ...g,
      rotulo: tipo === null ? g.grupo : g.grupo.split(' › ').slice(1).join(' › ') || g.grupo,
    }))

  function escolherTipo(id: number) {
    setTipoEscolhido(id)
    if (raizDe(dados.categoriaId, vm.categorias)?.id !== id) vm.alterar('categoriaId', null)
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    await vm.salvar()
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
      <h3 className="flex items-center gap-3 font-titulo text-2xl tracking-[-0.035em] text-tinta">
        <Icone nome={vm.editando ? 'lapis' : 'mais'} className="h-6 w-6 text-marca-600" />
        {vm.editando ? 'Editar item' : 'Adicionar item'}
      </h3>

      {/* O campo de arquivo fica escondido; o anel de foco aparece em volta da foto e do texto. */}
      <div className="flex flex-col gap-1 rounded-controle has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-4 has-[input:focus-visible]:outline-marca-600">
        <label htmlFor="foto-item" className="flex cursor-pointer items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-borda bg-white text-marca-600">
            {vm.previaFoto ? (
              <img src={vm.previaFoto} alt="" className="h-full w-full object-cover" />
            ) : (
              <Icone nome="mais" className="h-6 w-6" />
            )}
          </span>
          <span className="font-bold text-marca-600 underline-offset-2 hover:underline">
            {vm.preparandoFoto
              ? 'Preparando a foto…'
              : vm.previaFoto
                ? 'Trocar foto'
                : 'Adicionar foto'}
          </span>
        </label>
        <input
          id="foto-item"
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={ocupado}
          aria-describedby={vm.erroFoto ? 'foto-item-erro' : 'foto-item-ajuda'}
          onChange={(e) => vm.escolherFoto(e.target.files?.[0] ?? null)}
        />
        <p id="foto-item-ajuda" className="pl-20 text-sm text-tinta-suave">
          Opcional. Uma boa foto ajuda a escolher.
        </p>
        {vm.erroFoto && (
          <p id="foto-item-erro" className="pl-20 text-sm text-perigo">
            {vm.erroFoto}
          </p>
        )}
      </div>

      <CampoFormulario id="nome-item" rotulo="Nome do item" erro={erros.nome}>
        <input
          id="nome-item"
          ref={campoNome}
          className={estiloEntrada}
          value={dados.nome}
          onChange={(e) => vm.alterar('nome', e.target.value)}
          aria-invalid={erros.nome ? true : undefined}
          aria-describedby={erros.nome ? 'nome-item-erro' : undefined}
          placeholder="Ex.: Brownie de chocolate"
        />
      </CampoFormulario>

      {tipos.length > 0 && (
        <div className="flex flex-col gap-2">
          <p id="tipo-item" className="font-titulo text-sm tracking-[-0.035em] text-tinta">
            Tipo de produto
          </p>
          <div role="group" aria-labelledby="tipo-item" className="grid grid-cols-2 gap-2.5">
            {tipos.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={tipo === t.id}
                onClick={() => escolherTipo(t.id)}
                className={`flex min-h-[46px] items-center justify-center rounded-controle border px-3 py-2 text-center text-[15px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600 ${
                  tipo === t.id
                    ? 'border-marca-600 bg-marca-600 text-white'
                    : 'border-linha bg-white text-marca-600 hover:border-marca-600'
                }`}
              >
                {t.nome}
              </button>
            ))}
          </div>
        </div>
      )}

      <CampoFormulario id="categoria-item" rotulo="Categoria" erro={erros.categoria}>
        <select
          id="categoria-item"
          className={estiloEntrada}
          value={dados.categoriaId ?? ''}
          onChange={(e) =>
            vm.alterar('categoriaId', e.target.value === '' ? null : Number(e.target.value))
          }
          aria-invalid={erros.categoria ? true : undefined}
          aria-describedby={erros.categoria ? 'categoria-item-erro' : undefined}
        >
          <option value="">Escolha a categoria</option>
          {grupos.map((g) => (
            <optgroup key={g.grupo} label={g.rotulo}>
              {g.folhas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </CampoFormulario>

      <CampoFormulario id="preco-item" rotulo="Preço" erro={erros.preco}>
        <input
          id="preco-item"
          inputMode="decimal"
          className={estiloEntrada}
          value={dados.preco}
          onChange={(e) => vm.alterar('preco', e.target.value)}
          aria-invalid={erros.preco ? true : undefined}
          aria-describedby={erros.preco ? 'preco-item-erro' : undefined}
          placeholder="R$ 0,00"
        />
      </CampoFormulario>

      <CampoFormulario id="descricao-item" rotulo="Descrição" opcional>
        <textarea
          id="descricao-item"
          rows={2}
          className={estiloAreaTexto}
          value={dados.descricao}
          onChange={(e) => vm.alterar('descricao', e.target.value)}
          placeholder="Ex.: Com nozes, fatia grande"
        />
      </CampoFormulario>

      {vm.erroFormulario && <Aviso tipo="erro">{vm.erroFormulario}</Aviso>}

      <div className="flex flex-col gap-2.5">
        <Botao type="submit" icone={vm.editando ? 'check' : 'mais'} disabled={ocupado}>
          {vm.salvando ? 'Salvando…' : vm.editando ? 'Salvar alterações' : 'Adicionar item'}
        </Botao>
        {vm.editando && (
          <Botao variante="secundario" onClick={vm.cancelar} disabled={vm.salvando}>
            Cancelar edição
          </Botao>
        )}
      </div>
      <p className="text-sm text-tinta-suave">O item aparece no seu perfil assim que é salvo.</p>
    </form>
  )
}

/**
 * Uma linha da lista: foto, nome, preço, o selo e o interruptor de disponível/esgotado (um toque,
 * RN08), o lápis de editar e a lixeira de remover, que pede confirmação.
 */
function LinhaItem({
  item,
  aoEditar,
  aoRemover,
  aoAlternar,
}: {
  item: Item
  aoEditar: () => void
  aoRemover: () => Promise<boolean>
  aoAlternar: () => Promise<boolean>
}) {
  const [confirmando, setConfirmando] = useState(false)
  const [removendo, setRemovendo] = useState(false)
  const [alternando, setAlternando] = useState(false)

  async function alternar() {
    setAlternando(true)
    await aoAlternar()
    setAlternando(false)
  }

  async function confirmar() {
    setRemovendo(true)
    // Se deu certo, a linha some da lista; se não, volta ao normal e o erro aparece no topo.
    if (!(await aoRemover())) {
      setRemovendo(false)
      setConfirmando(false)
    }
  }

  return (
    <li className="flex flex-col gap-4 border-b border-linha py-5 first:pt-0">
      <div className="flex items-center gap-3 sm:gap-[18px]">
        <FotoOuInicial
          url={item.fotoUrl}
          nome={item.nome}
          className={`h-16 w-16 rounded-2xl text-2xl sm:h-24 sm:w-24 sm:text-3xl ${item.disponivel ? '' : 'opacity-60'}`}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-[17px] leading-snug font-bold break-words text-tinta">{item.nome}</p>
          <p className="font-bold text-marca-900">{formatarPreco(item.preco)}</p>
          {item.disponivel ? (
            <Selo tom="ativo" className="text-[13px]">
              Disponível
            </Selo>
          ) : (
            <Selo tom="neutro" className="text-[13px]">
              Esgotado
            </Selo>
          )}
        </div>
        {!confirmando && (
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
            <span className="mr-1 flex">
              <Interruptor
                ligado={item.disponivel}
                aoMudar={() => void alternar()}
                rotulo={`${item.nome} disponível`}
                desabilitado={alternando}
              />
            </span>
            <button
              type="button"
              onClick={aoEditar}
              aria-label={`Editar ${item.nome}`}
              className={`${estiloBotaoIcone} text-marca-600 hover:bg-marca-50`}
            >
              <Icone nome="lapis" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              aria-label={`Remover ${item.nome}`}
              className={`${estiloBotaoIcone} text-perigo hover:bg-red-50`}
            >
              <Icone nome="lixeira" />
            </button>
          </div>
        )}
      </div>

      {confirmando && (
        <div
          role="alertdialog"
          aria-label={`Remover ${item.nome}?`}
          className="flex flex-col gap-3 rounded-controle bg-red-50 p-4"
        >
          <p className="text-[15px] text-tinta">
            Remover <strong>{item.nome}</strong>? Isso não pode ser desfeito.
          </p>
          <div className="flex flex-wrap gap-2">
            <Botao
              variante="secundario"
              onClick={() => setConfirmando(false)}
              disabled={removendo}
              className="flex-1"
            >
              Cancelar
            </Botao>
            <button
              type="button"
              onClick={() => void confirmar()}
              disabled={removendo}
              className="inline-flex h-[50px] flex-1 items-center justify-center gap-2.5 rounded-controle bg-perigo px-5 font-bold whitespace-nowrap text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-perigo disabled:opacity-45"
            >
              <Icone nome="lixeira" className="h-[18px] w-[18px]" />
              {removendo ? 'Removendo…' : 'Sim, remover'}
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

/**
 * Tela "Meus itens" (US08; visual da US21): o resumo e a lista dos itens do vendedor logado, com
 * disponível/esgotado, editar e remover, e o formulário de adicionar item sempre à mão: ao lado da
 * lista no computador e embaixo dela no celular. "Editar" leva o item para esse formulário.
 */
export function MeusItensPage({
  perfilId,
  repositorio,
  vendedores,
  comprimir,
}: MeusItensPageProps) {
  const vm = useItensViewModel({ perfilId, repositorio, vendedores, comprimir })
  const campoNome = useRef<HTMLInputElement>(null)
  const { novo, formularioAberto, podeCadastrar, editando } = vm

  // O formulário fica sempre aberto: depois de salvar ou cancelar, volta vazio para um item novo.
  useEffect(() => {
    if (podeCadastrar && !formularioAberto) novo()
  }, [podeCadastrar, formularioAberto, novo])

  // Ao tocar em "Editar", leva o foco (e a tela, no celular) para o nome no formulário.
  useEffect(() => {
    if (editando) campoNome.current?.focus()
  }, [editando])

  const disponiveis = vm.itens.filter((i) => i.disponivel).length
  const esgotados = vm.itens.length - disponiveis

  return (
    <section className="flex w-full flex-col gap-8">
      <TituloTela
        titulo="Meus itens"
        apoio="Seus produtos, preços e disponibilidade em um só lugar."
      />

      {vm.erro && <Aviso tipo="erro">{vm.erro}</Aviso>}

      {vm.carregando ? (
        <p role="status" className="text-tinta-suave">
          Carregando seus itens…
        </p>
      ) : vm.semPerfil ? (
        <p className="text-tinta">
          Para cadastrar itens, crie primeiro seu{' '}
          <Link
            to={ROTAS.queroVender}
            className="font-bold text-marca-600 underline underline-offset-2"
          >
            perfil de vendedor
          </Link>
          .
        </p>
      ) : (
        <div className="grid w-full items-start gap-10 lg:grid-cols-[minmax(0,1fr)_448px] lg:gap-16">
          <div className="flex min-w-0 flex-col gap-5">
            {vm.itens.length > 0 && (
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-bold text-tinta">
                  {contar(vm.itens.length, 'item cadastrado', 'itens cadastrados')}
                </span>
                <span className="text-sm text-tinta-suave">
                  {contar(disponiveis, 'disponível', 'disponíveis')} ·{' '}
                  {contar(esgotados, 'esgotado', 'esgotados')}
                </span>
              </p>
            )}
            {vm.itens.length === 0 && !vm.erro ? (
              <p className="text-tinta-suave">Você ainda não cadastrou nenhum item.</p>
            ) : (
              <ul className="flex flex-col">
                {vm.itens.map((item) => (
                  <LinhaItem
                    key={item.id}
                    item={item}
                    aoEditar={() => vm.editar(item)}
                    aoRemover={() => vm.remover(item.id)}
                    aoAlternar={() => vm.alternarDisponibilidade(item)}
                  />
                ))}
              </ul>
            )}
          </div>

          {podeCadastrar && formularioAberto && (
            <Cartao className="shadow-[0_12px_32px_rgba(25,44,34,0.06)] lg:sticky lg:top-36">
              <FormularioItem vm={vm} campoNome={campoNome} />
            </Cartao>
          )}
        </div>
      )}
    </section>
  )
}
