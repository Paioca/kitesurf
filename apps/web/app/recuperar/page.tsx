import { RecoveryForm } from './recovery-form';

export default function Recuperar({ searchParams }: { searchParams: { token?: string } }) {
  return <RecoveryForm token={searchParams.token ?? ''} />;
}
