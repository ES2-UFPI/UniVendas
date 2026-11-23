import { useEffect, useState } from 'react'
import { comprimirImagem } from '../../../core/comprimirImagem'
import { Falha } from '../../../core/falha'
import { SupabaseVendedorRepository } from '../data/SupabaseVendedorRepository'
import type { Contato } from '../domain/Contato'
import type { Vendedor } from '../domain/Vendedor'
import { VendedorFactory } from '../domain/VendedorFactory'
import type { VendedorRepository } from '../domain/VendedorRepository'
import {
  formatarTelefone,
  validarCadastroVendedor,
  type DadosCadastroVendedor,
  type ErrosCadastroVendedor,
} from '../domain/validacoesVendedor'

const VAZIO: DadosCadastroVendedor = { nomeExibicao: '', descricao: '', whatsapp: '', telefone: '' }

const MENSAGEM_CARREGAR = 'Não foi possível carregar seu perfil. Tente de novo.'
const MENSAGEM_SALVAR = 'Não foi possível salvar o perfil. Tente de novo.'

interface Opcoes {
  /** Id da conta logada (= perfis.id). Sem ele, nada é carregado. */
  perfilId?: string | null
  /** Nos testes, um repositório falso; no app, o do Supabase. */
  repositorio?: VendedorRepository
  /** Nos testes, uma compressão falsa (o jsdom não tem canvas); no app, a do `core`. */
  comprimir?: (foto: Blob) => Promise<Blob>
}

function mensagemDe(erro: unknown, padrao: string): string {
  return erro instanceof Falha ? erro.mensagem : padrao
}

/** Os campos do formulário a partir do perfil salvo; os telefones aparecem como a pessoa digita. */
function dadosDoPerfil(vendedor: Vendedor, contatos: Contato[]): DadosCadastroVendedor {
  const valorDe = (canal: Contato['canal']) =>
    formatarTelefone(contatos.find((c) => c.canal === canal)?.valor ?? '')
  return {
    nomeExibicao: vendedor.nomeExibicao,
    descricao: vendedor.descricao,
    whatsapp: valorDe('whatsapp'),
    telefone: valorDe('telefone'),
  }
}

/**
 * ViewModel da tela "Meu perfil" (US14): carrega o perfil de vendedor da conta, guarda os campos
 * (nome, descrição, foto e contatos), valida com as mesmas regras do cadastro (US03) e salva
 * com o `atualizarPerfil` do `VendedorRepository`.
 */
export function useMeuPerfilViewModel({
  perfilId = null,
  repositorio,
  comprimir = comprimirImagem,
}: Opcoes = {}) {
  const [vendedor, setVendedor] = useState<Vendedor | null>(null)
  const [dados, setDados] = useState<DadosCadastroVendedor>(VAZIO)
  const [erros, setErros] = useState<ErrosCadastroVendedor>({})
  const [carregando, setCarregando] = useState(perfilId !== null)
  const [semPerfil, setSemPerfil] = useState(false)
  const [erroCarga, setErroCarga] = useState<string | null>(null)

  const [fotoNova, setFotoNova] = useState<Blob | null>(null)
  const [previaNova, setPreviaNova] = useState<string | null>(null)
  const [erroFoto, setErroFoto] = useState<string | null>(null)
  const [preparandoFoto, setPreparandoFoto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)

  // Libera a prévia anterior da memória quando a foto muda ou a tela fecha.
  useEffect(() => {
    return () => {
      if (previaNova) URL.revokeObjectURL(previaNova)
    }
  }, [previaNova])

  useEffect(() => {
    if (!perfilId) return
    let ativo = true

    async function carregar(id: string) {
      try {
        const repo = repositorio ?? new SupabaseVendedorRepository()
        const doUsuario = await repo.buscarDoUsuario(id)
        if (!doUsuario) {
          if (ativo) setSemPerfil(true)
          return
        }
        // Os contatos vêm do perfil público, que já os traz junto com o vendedor.
        const perfil = await repo.buscarPerfil(doUsuario.id)
        if (ativo) {
          setVendedor(doUsuario)
          setDados(dadosDoPerfil(doUsuario, perfil?.contatos ?? []))
        }
      } catch (e) {
        if (ativo) setErroCarga(mensagemDe(e, MENSAGEM_CARREGAR))
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    void carregar(perfilId)
    // Se a tela fechar antes de a busca terminar, a resposta é descartada.
    return () => {
      ativo = false
    }
  }, [perfilId, repositorio])

  function alterar(campo: keyof DadosCadastroVendedor, valor: string) {
    setSalvo(false)
    setDados((atual) => ({ ...atual, [campo]: valor }))
  }

  /** Valida os campos, mostra os erros e devolve true se o formulário pode ser salvo. */
  function validar(): boolean {
    const novosErros = validarCadastroVendedor(dados)
    setErros(novosErros)
    return Object.keys(novosErros).length === 0
  }

  /** Comprime a foto escolhida no celular (RN10). `null` desfaz a escolha e mantém a foto atual. */
  async function escolherFoto(arquivo: Blob | null) {
    setSalvo(false)
    setErroFoto(null)
    setFotoNova(null)
    setPreviaNova(null)
    if (!arquivo) return
    setPreparandoFoto(true)
    try {
      const comprimida = await comprimir(arquivo)
      setFotoNova(comprimida)
      setPreviaNova(
        typeof URL.createObjectURL === 'function' ? URL.createObjectURL(comprimida) : null,
      )
    } catch (e) {
      setErroFoto(mensagemDe(e, 'Não foi possível usar esta foto. Tente outra.'))
    } finally {
      setPreparandoFoto(false)
    }
  }

  /** Salva o perfil. Devolve true se deu certo; senão, o motivo fica em `erroGeral`. */
  async function salvar(): Promise<boolean> {
    setErroGeral(null)
    setSalvo(false)
    if (!vendedor || !validar() || preparandoFoto) return false

    setSalvando(true)
    try {
      const { vendedor: editado, contatos } = VendedorFactory.doFormulario(
        vendedor.perfilId,
        dados,
        vendedor.id,
      )
      const repo = repositorio ?? new SupabaseVendedorRepository()
      setVendedor(await repo.atualizarPerfil(editado, contatos, fotoNova ?? undefined))
      // A foto nova já virou a foto do perfil; a prévia passa a vir do vendedor salvo.
      setFotoNova(null)
      setPreviaNova(null)
      setSalvo(true)
      return true
    } catch (e) {
      setErroGeral(mensagemDe(e, MENSAGEM_SALVAR))
      return false
    } finally {
      setSalvando(false)
    }
  }

  return {
    dados,
    erros,
    alterar,
    validar,
    carregando,
    semPerfil,
    erroCarga,
    previaFoto: previaNova ?? vendedor?.fotoUrl ?? null,
    temFoto: (previaNova ?? vendedor?.fotoUrl) != null,
    erroFoto,
    preparandoFoto,
    escolherFoto,
    salvando,
    erroGeral,
    salvo,
    salvar,
  }
}
