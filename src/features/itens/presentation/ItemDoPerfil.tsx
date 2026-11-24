import { CartaoItem } from '../../../core/ui/CartaoItem'
import { Selo } from '../../../core/ui/Selo'
import type { Item } from '../domain/Item'

/**
 * Um item na vitrine do perfil do vendedor (US09, visual da US21): foto em cima, selo, nome e preço.
 * Se o item está esgotado (`disponivel` falso), o nome aparece riscado e com a marca "Esgotado"
 * (RN09). A marca é texto, e não só o risco, para quem usa leitor de tela também saber o estado.
 * Disponível com o vendedor no campus vira "Disponível agora", como na busca.
 */
export function ItemDoPerfil({ item, ativoAgora = false }: { item: Item; ativoAgora?: boolean }) {
  const selo = !item.disponivel ? (
    <Selo tom="perigo" className="text-[13px]">
      Esgotado
    </Selo>
  ) : ativoAgora ? (
    <Selo className="text-[13px]">Disponível agora</Selo>
  ) : undefined

  return (
    <li>
      <CartaoItem
        nome={item.nome}
        preco={item.preco}
        fotoUrl={item.fotoUrl}
        selo={selo}
        esgotado={!item.disponivel}
        formato="coluna"
      />
    </li>
  )
}
