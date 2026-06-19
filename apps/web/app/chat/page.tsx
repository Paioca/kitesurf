// Chat livre aposentado — contato agora é estruturado (oferta/visita) em /pedidos.
import { redirect } from 'next/navigation';

export default function Chat() {
  redirect('/pedidos');
}
