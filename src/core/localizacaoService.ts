import { Falha } from './falha'

export interface LatLng {
  latitude: number
  longitude: number
}

export type CodigoErroLocalizacao =
  'permissao-negada' | 'indisponivel' | 'tempo-esgotado' | 'nao-suportado'

const MENSAGENS: Record<CodigoErroLocalizacao, string> = {
  'permissao-negada':
    'Sem a permissão de localização não dá para mostrar que você está no campus. Libere o acesso nas configurações do navegador.',
  indisponivel: 'Não foi possível descobrir sua posição agora. Tente de novo em instantes.',
  'tempo-esgotado': 'A localização demorou demais para responder. Tente de novo.',
  'nao-suportado': 'Este aparelho ou navegador não oferece localização.',
}

/** Cria a `Falha` padrão do app com a mensagem do código: `codigo` para decidir, `mensagem` para a tela. */
function falha(codigo: CodigoErroLocalizacao): Falha {
  return new Falha(MENSAGENS[codigo], codigo)
}

// Códigos de GeolocationPositionError
const PERMISSAO_NEGADA = 1
const TEMPO_ESGOTADO = 3

const OPCOES_PADRAO: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 0,
}

function traduzirErro(erro: GeolocationPositionError): Falha {
  if (erro.code === PERMISSAO_NEGADA) return falha('permissao-negada')
  if (erro.code === TEMPO_ESGOTADO) return falha('tempo-esgotado')
  return falha('indisponivel')
}

/**
 * Acesso à localização do aparelho (navigator.geolocation).
 * RN12: sem permissão, o botão "Estou no campus" não liga; quem usa o serviço
 * decide isso com `pedirPermissao()` e mostra `Falha.mensagem`.
 */
export class LocalizacaoService {
  /** Lê a posição atual. Rejeita com Falha. */
  posicaoAtual(opcoes?: PositionOptions): Promise<LatLng> {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        reject(falha('nao-suportado'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
        (erro) => reject(traduzirErro(erro)),
        { ...OPCOES_PADRAO, ...opcoes },
      )
    })
  }

  /**
   * Faz o navegador mostrar o pedido de permissão (se ainda não foi respondido).
   * Devolve false se o usuário negou ou o aparelho não tem localização.
   * Falhas que não são de permissão (sem sinal, tempo esgotado) contam como permitido.
   */
  async pedirPermissao(): Promise<boolean> {
    try {
      await this.posicaoAtual()
      return true
    } catch (erro) {
      if (erro instanceof Falha) {
        return erro.codigo !== 'permissao-negada' && erro.codigo !== 'nao-suportado'
      }
      throw erro
    }
  }
}
