import { redirect } from 'next/navigation';

// A home já é a busca responsiva (mobile + desktop). /anuncios redireciona pra lá.
export default function AnunciosPage() {
  redirect('/');
}
