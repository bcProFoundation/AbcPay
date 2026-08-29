import { IonApp, IonIcon, IonLabel, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { homeOutline, qrCodeOutline, walletOutline } from 'ionicons/icons';
import { Redirect, Route } from 'react-router-dom';
import { StoreProvider, useStore } from './store/Store';
import HomePage from './pages/HomePage';
import WalletsPage from './pages/WalletsPage';
import ScanPage from './pages/ScanPage';
import WalletDetailsPage from './pages/WalletDetailsPage';
import SendPage from './pages/SendPage';
import ReceivePage from './pages/ReceivePage';
import SettingsPage from './pages/SettingsPage';
import AddWalletPage from './pages/AddWalletPage';
import CreateWalletPage from './pages/CreateWalletPage';
import JoinWalletPage from './pages/JoinWalletPage';
import ImportKeyPage from './pages/ImportKeyPage';
import BackupPage from './pages/BackupPage';
import ProposalsPage from './pages/ProposalsPage';
import AddressBookPage from './pages/AddressBookPage';
import OnboardingPage from './pages/OnboardingPage';
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';

function Tabs() {
  const { profile } = useStore();
  if (profile.keys.length === 0) {
    return <Redirect to="/onboarding" />;
  }
  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route path="/tabs/home" component={HomePage} exact />
        <Route path="/tabs/scan" component={ScanPage} exact />
        <Route path="/tabs/wallets" component={WalletsPage} exact />
        <Redirect exact from="/tabs" to="/tabs/home" />
      </IonRouterOutlet>
      <IonTabBar slot="bottom">
        <IonTabButton tab="home" href="/tabs/home">
          <IonIcon icon={homeOutline} />
          <IonLabel>Home</IonLabel>
        </IonTabButton>
        <IonTabButton tab="scan" href="/tabs/scan">
          <IonIcon icon={qrCodeOutline} />
          <IonLabel>Scan</IonLabel>
        </IonTabButton>
        <IonTabButton tab="wallets" href="/tabs/wallets">
          <IonIcon icon={walletOutline} />
          <IonLabel>Wallets</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <IonApp>
        <IonReactRouter>
          <IonRouterOutlet>
            <Route path="/onboarding" component={OnboardingPage} exact />
            <Route path="/tabs" component={Tabs} />
            <Route path="/wallet/:id" component={WalletDetailsPage} exact />
            <Route path="/wallet/:id/send" component={SendPage} exact />
            <Route path="/wallet/:id/receive" component={ReceivePage} exact />
            <Route path="/wallet/:id/backup" component={BackupPage} exact />
            <Route path="/add-wallet" component={AddWalletPage} exact />
            <Route path="/create-wallet" component={CreateWalletPage} exact />
            <Route path="/join-wallet" component={JoinWalletPage} exact />
            <Route path="/import-key" component={ImportKeyPage} exact />
            <Route path="/settings" component={SettingsPage} exact />
            <Route path="/proposals" component={ProposalsPage} exact />
            <Route path="/address-book" component={AddressBookPage} exact />
            <Redirect exact from="/" to="/tabs/home" />
          </IonRouterOutlet>
        </IonReactRouter>
      </IonApp>
    </StoreProvider>
  );
}
