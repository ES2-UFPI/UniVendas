import type { Item } from '../domain/Item'
import { formatarPreco } from '../domain/validacoesItem'

/**
 * Uma linha de item no perfil do vendedor (US09). Se o item está esgotado (`disponivel` falso),
 * o nome aparece riscado e com a marca "Esgotado" (RN09). A marca é texto, e não só o risco,
 * para quem usa leitor de tela também saber o estado.
 */
export function ItemDoPerfil({ item }: { item: Item }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className={item.disponivel ? 'text-gray-900' : 'text-gray-500 line-through'}>
        {item.nome}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {!item.disponivel && (
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
            Esgotado
          </span>
        )}
        <span className="text-gray-700">{formatarPreco(item.preco)}</span>
      </span>
    </li>
  )
}
