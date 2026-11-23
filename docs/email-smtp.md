# E-mails do app (SMTP próprio)

O Supabase envia os e-mails de autenticação do UniVendas, como o link do "Esqueci a senha" (US15). O servidor de e-mail padrão do Supabase **só entrega para os e-mails da equipe do projeto**, então qualquer pessoa de fora ficaria sem receber o link. Por isso o projeto usa um provedor próprio, o **Brevo** (plano gratuito, 300 e-mails por dia).

O Resend não serve aqui: sem um domínio próprio verificado, ele só envia para o e-mail do dono da conta.

## Como está configurado

Fica no painel do Supabase, não no código: **Authentication → Emails → SMTP Settings**, com **Enable custom SMTP** ligado. Só quem é Owner ou Administrator da organização consegue mudar.

| Campo        | Valor                                              |
| ------------ | -------------------------------------------------- |
| Sender email | E-mail verificado como remetente no Brevo          |
| Sender name  | `UniVendas`                                        |
| Host         | `smtp-relay.brevo.com`                             |
| Port         | `587`                                              |
| Username     | Login SMTP, na aba SMTP do Brevo                   |
| Password     | Chave SMTP do Brevo (nunca vai para o repositório) |

A chave SMTP é criada no Brevo, em **SMTP e API → SMTP → Gerar nova chave SMTP**, e aparece uma vez só. Ela vale por 1 ano e expira também após 90 dias sem uso. Se vencer, é só criar outra e trocar o campo Password no Supabase.

O remetente precisa estar verificado em **Remetentes, domínios e IPs dedicados → Remetentes** (o Brevo manda um link de confirmação para o e-mail).

## URLs de redirecionamento

Em **Authentication → URL Configuration**:

- **Site URL:** `https://univendas-ufpi.netlify.app`
- **Redirect URLs:** `https://univendas-ufpi.netlify.app/**` e `http://localhost:5173/**`

O `**` libera qualquer caminho, inclusive a tela `/nova-senha`, que é para onde o link do e-mail leva.

## Como testar

1. Abra o app e vá em **Entrar → Recuperar**.
2. Digite um e-mail **de fora da equipe** que tenha conta no app.
3. O e-mail chega (confira o spam), com o remetente "UniVendas".
4. O link abre a tela `/nova-senha`, onde se define a nova senha.

Se o e-mail não chegar, veja a mensagem de erro em **Authentication → Logs** no Supabase.

## Limites

O Supabase ainda limita o envio por hora, mesmo com SMTP próprio (**Authentication → Rate Limits**). Para a demo basta. Quem pedir link demais recebe a mensagem de "muitas tentativas" do app.
