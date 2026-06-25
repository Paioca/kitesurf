// Editar perfil — só o próprio usuário logado.
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../../lib/session';
import { color } from '../../../lib/tokens';
import { SiteHeader } from '../../../components/SiteHeader';
import { Footer } from '../../../components/Footer';
import { MobileAppBar, MobileTabBar } from '../../../components/MobileChrome';
import { EditProfileForm } from '../../../components/EditProfileForm';

export const dynamic = 'force-dynamic';

export default async function EditarPerfil() {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar?next=%2Fconta%2Feditar');

  const initial = {
    name: user.name ?? '',
    lastName: user.lastName ?? '',
    spot: user.spot ?? '',
    country: user.country ?? '',
    email: user.email ?? '',
    emailVerified: user.emailVerified,
    avatarUrl: user.avatarUrl ?? '',
    locale: user.locale ?? 'pt',
  };
  const form = <EditProfileForm initial={initial} />;

  return (
    <>
      <div className="only-mobile" style={{ width: '100%', maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: color.bg }}>
        <MobileAppBar />
        <div style={{ padding: '22px 18px 96px' }}>{form}</div>
        <MobileTabBar />
      </div>
      <div className="only-desktop">
        <SiteHeader />
        <main style={{ padding: '40px 32px 80px' }}>{form}</main>
        <Footer />
      </div>
    </>
  );
}
