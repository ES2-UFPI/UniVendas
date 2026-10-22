import { Falha } from '../../../core/falha'
import type { Tables } from '../../../types/database.types'
import { Contato } from './Contato'
import { normalizarTelefone, type DadosCadastroVendedor } from './validacoesVendedor'
import { VendedorAmbulante, type Vendedor } from './Vendedor'

export type VendedorRow = Tables<'vendedores'>

/**
 * Simple Factory: decide qual subclasse de `Vendedor` criar, com um `switch` sobre `tipo`.
 * Nenhuma outra parte do app precisa saber como montar cada tipo.
 */
export class VendedorFactory {
  /** Monta o vendedor a partir da linha da tabela `vendedores`. */
  static criar(linha: VendedorRow): Vendedor {
    switch (linha.tipo) {
      case 'ambulante':
        return new VendedorAmbulante(
          linha.id,
          linha.perfil_id,
          linha.nome_exibicao,
          linha.descricao ?? '',
          linha.foto_url,
        )
      default:
        // Quiosque e prestador entram no incremento 2.
        throw new Falha('Este tipo de vendedor ainda não está disponível.', 'tipo-nao-suportado')
    }
  }

  /**
   * Monta o vendedor ambulante e os contatos a partir do formulário "Quero vender" (já validado).
   * O `id` fica vazio até o banco criar o registro; os telefones saem no formato 55 + DDD (RN21).
   */
  static doFormulario(
    perfilId: string,
    dados: DadosCadastroVendedor,
  ): { vendedor: Vendedor; contatos: Contato[] } {
    const vendedor = new VendedorAmbulante(
      '',
      perfilId,
      dados.nomeExibicao.trim(),
      dados.descricao.trim(),
    )
    const contatos: Contato[] = []
    if (dados.whatsapp.trim())
      contatos.push(new Contato('whatsapp', normalizarTelefone(dados.whatsapp)))
    if (dados.telefone.trim())
      contatos.push(new Contato('telefone', normalizarTelefone(dados.telefone)))
    return { vendedor, contatos }
  }
}
