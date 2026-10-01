import { Outlet } from 'react-router-dom';
import PublicNav from '../PublicNav/PublicNav';
import PublicFooter from '../PublicFooter/PublicFooter';

export default function PublicLayout() {
  return (
    <>
      <PublicNav />
      <main>
        <Outlet />
      </main>
      <PublicFooter />
    </>
  );
}