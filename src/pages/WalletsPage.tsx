import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { bookOutline, notificationsOutline, settingsOutline } from 'ionicons/icons';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { COINS, formatAmount } from '../lib/crypto';
import { useStore } from '../store/Store';

export default function WalletsPage() {
  const { profile, settings, authed } = useStore();
  const history = useHistory();
  const [balances, setBalances] = useState<Record<string, number>>({});
  const key = profile.keys[0];

  useEffect(() => {
    profile.wallets.forEach(async wallet => {
      try {
        const balance = await authed(wallet).getBalance();
        setBalances(b => ({ ...b, [wallet.id]: balance.totalAmount || 0 }));
      } catch {
        // ignore offline
      }
    });
  }, [profile.wallets.length]);

  const total = profile.wallets.reduce((sum, w) => sum + (balances[w.id] || 0) / COINS[w.coin].unitToSat, 0);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.push('/settings')}>
              <IonIcon icon={settingsOutline} />
            </IonButton>
          </IonButtons>
          <IonTitle>
            <h2 className="page-title">{key?.name || 'Your keys'}</h2>
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => history.push('/address-book')}>
              <IonIcon icon={bookOutline} />
            </IonButton>
            <IonButton onClick={() => history.push('/proposals')}>
              <IonIcon icon={notificationsOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="total-amount">
          <div className="value">
            {settings.hideBalance ? '******' : total.toFixed(2)}
            <span className="unit">{settings.currency}</span>
          </div>
          <IonButton fill="clear" onClick={() => history.push('/add-wallet')}>
            Create a new account
          </IonButton>
        </div>
        <div className="section-label">Accounts</div>
        {profile.wallets.map(wallet => (
          <div key={wallet.id} className="wallet-card" onClick={() => history.push(`/wallet/${wallet.id}`)}>
            <img className="coin-avatar" src={COINS[wallet.coin].icon} alt="" />
            <div className="meta">
              <div className="name">{wallet.name}</div>
              <div className="sub">
                {wallet.m}-of-{wallet.n} · {wallet.status}
              </div>
            </div>
            <div className="amount">
              {settings.hideBalance ? '******' : formatAmount(balances[wallet.id] || 0, wallet.coin)}
            </div>
          </div>
        ))}
        {profile.wallets.length === 0 && (
          <div className="empty-state">Create or join an XEC or DOGE account to get started.</div>
        )}
      </IonContent>
    </IonPage>
  );
}
