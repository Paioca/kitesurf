import { VerifyEmailForm } from './verify-email-form';

export default async function VerificarEmail(props: { searchParams: Promise<{ token?: string }> }) {
  const searchParams = await props.searchParams;
  return <VerifyEmailForm token={searchParams.token ?? ''} />;
}
