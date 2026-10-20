-- #60 [US03] Bucket das fotos de vendedor no Storage, com as regras de acesso.
-- Cada usuário guarda as próprias fotos numa pasta com o id dele: fotos/<auth.uid()>/<arquivo>.

-- Só imagens (JPEG, PNG ou WebP) de até 2 MB (RN10). O limite vale no servidor, mesmo se o app for alterado.
-- Bucket público: a foto do vendedor é vista no mapa e no perfil, então é lida pela URL pública
-- (vendedores.foto_url), sem precisar gerar link assinado. Telefones e dados pessoais não ficam aqui.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

-- Só quem está logado envia, e só para a própria pasta (RN11).
create policy "fotos: cada um envia na própria pasta"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Ler pela API (necessário para trocar a foto com upsert) também só na própria pasta.
-- A exibição no app usa a URL pública, que não passa por esta política.
create policy "fotos: cada um lê a própria pasta"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Trocar ou apagar a foto: só o dono (RN11).
create policy "fotos: cada um troca a própria foto"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "fotos: cada um apaga a própria foto"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
