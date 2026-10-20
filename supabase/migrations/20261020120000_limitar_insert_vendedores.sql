-- Ajuste da revisão do #80: no cadastro, o dono só preenche os dados do formulário.
-- tipo, latitude e longitude ficam com o padrão (no MVP, só ambulante; prestador nunca aparece no mapa).
revoke insert on public.vendedores from authenticated;
grant insert (perfil_id, nome_exibicao, descricao, foto_url) on public.vendedores to authenticated;
