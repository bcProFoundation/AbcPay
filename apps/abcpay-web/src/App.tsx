import { Routes, Route } from 'react-router-dom';
import { TabBar } from './components/ui';
import { HomePage } from './pages/HomePage';
import { WalletsPage } from './pages/WalletsPage';
import { ScanPage } from './pages/ScanPage';
import { CreateWalletPage } from './pages/CreateWalletPage';
import { JoinWalletPage } from './pages/JoinWalletPage';
import { WalletDetailPage } from './pages/WalletDetailPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <div className="min-h-screen pb-20">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/wallets" element={<WalletsPage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/create-wallet" element={<CreateWalletPage />} />
        <Route path="/join-wallet" element={<JoinWalletPage />} />
        <Route path="/wallet/:id" element={<WalletDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <TabBar />
    </div>
  );
}
