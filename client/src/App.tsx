import { Routes, Route, Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { Layout } from './components/Layout';
import { useAuth } from './lib/auth';
import Home from './pages/Home';
import PostPage from './pages/PostPage';
import Saved from './pages/Saved';
import Refer from './pages/Refer';
import Alerts from './pages/Alerts';
import Profile from './pages/Profile';
import Join from './pages/Join';
import AdminLayout from './admin/AdminLayout';
import Dashboard from './admin/Dashboard';
import AdminPosts from './admin/Posts';
import Moderation from './admin/Moderation';
import Customers from './admin/Customers';
import CustomerDetail from './admin/CustomerDetail';
import AdminReferrals from './admin/Referrals';
import AdminRewards from './admin/Rewards';
import Settings from './admin/Settings';

function OwnerOnly({ children }: { children: ReactElement }) {
  const { user, loading, isOwner } = useAuth();
  if (loading) return <div className="p-8 text-center">…</div>;
  return isOwner ? children : <Navigate to={user ? '/' : '/join'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/post/:id" element={<PostPage />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/refer" element={<Refer />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/join" element={<Join />} />
        <Route path="/login" element={<Join />} />
      </Route>
      <Route path="/admin" element={<OwnerOnly><AdminLayout /></OwnerOnly>}>
        <Route index element={<Dashboard />} />
        <Route path="posts" element={<AdminPosts />} />
        <Route path="moderation" element={<Moderation />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="referrals" element={<AdminReferrals />} />
        <Route path="rewards" element={<AdminRewards />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
