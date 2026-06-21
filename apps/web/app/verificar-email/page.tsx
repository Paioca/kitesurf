import { VerifyEmailForm } from './verify-email-form';

export default function VerificarEmail({ searchParams }: { searchParams: { token?: string } }) {
  return <VerifyEmailForm token={searchParams.token ?? ''} />;
}
