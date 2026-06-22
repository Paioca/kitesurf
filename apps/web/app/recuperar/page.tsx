import { RecoveryForm } from './recovery-form';

export default async function Recuperar(props: { searchParams: Promise<{ token?: string }> }) {
  const searchParams = await props.searchParams;
  return <RecoveryForm token={searchParams.token ?? ''} />;
}
