import { TituloTela } from '../../../core/ui/TituloTela'
import type { VendedorRepository } from '../domain/VendedorRepository'
import { FormularioPerfilVendedor, PreviaPerfilVendedor } from './FormularioPerfilVendedor'
import { useCadastroVendedorViewModel } from './useCadastroVendedorViewModel'

interface QueroVenderPageProps {
  /** Id da conta logada (= perfis.id). A rota protegida da #58 passa o da sessão. */
  perfilId: string | null
  /** Só para os testes: repositório e compressão falsos. */
  repositorio?: VendedorRepository
  comprimir?: (foto: Blob) => Promise<Blob>
}

/**
 * Tela "Quero vender" (US03; visual da US21): cria o perfil de vendedor ambulante da conta logada.
 * No computador, a prévia do perfil fica à direita do formulário; no celular, embaixo dele.
 */
export function QueroVenderPage({ perfilId, repositorio, comprimir }: QueroVenderPageProps) {
  const vm = useCadastroVendedorViewModel({ repositorio, comprimir })
  const { dados } = vm

  if (!perfilId) {
    return (
      <section className="w-full max-w-[620px]">
        <p className="text-tinta">Entre na sua conta para criar seu perfil de vendedor.</p>
      </section>
    )
  }

  if (vm.vendedorSalvo) {
    return (
      <section className="w-full max-w-[620px]" role="status">
        <TituloTela
          titulo={`Pronto, ${vm.vendedorSalvo.nomeExibicao}!`}
          apoio="Seu perfil de vendedor foi criado. Agora os compradores podem encontrar você."
        />
      </section>
    )
  }

  return (
    <section className="flex w-full flex-col gap-8">
      <TituloTela
        titulo="Crie seu perfil de vendedor"
        apoio="Mostre o que você vende e facilite o contato com quem está no campus."
      />
      <div className="grid w-full items-start gap-10 lg:grid-cols-[minmax(0,620px)_minmax(0,1fr)] lg:gap-16">
        <FormularioPerfilVendedor
          dados={dados}
          erros={vm.erros}
          alterar={vm.alterar}
          previaFoto={vm.previaFoto}
          temFoto={vm.foto !== null}
          preparandoFoto={vm.preparandoFoto}
          erroFoto={vm.erroFoto}
          escolherFoto={(arquivo) => void vm.escolherFoto(arquivo)}
          salvando={vm.salvando}
          erroGeral={vm.erroGeral}
          textoBotao="Criar meu perfil de vendedor"
          iconeBotao="avancar"
          aoEnviar={() => vm.salvar(perfilId)}
        />
        <div className="lg:sticky lg:top-28">
          <PreviaPerfilVendedor
            nome={dados.nomeExibicao}
            descricao={dados.descricao}
            fotoUrl={vm.previaFoto}
            whatsapp={dados.whatsapp.trim() !== ''}
            telefone={dados.telefone.trim() !== ''}
          />
        </div>
      </div>
    </section>
  )
}
