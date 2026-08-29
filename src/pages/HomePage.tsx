import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { eyeOffOutline, eyeOutline, notificationsOutline, settingsOutline, statsChartOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { COINS, formatAmount } from '../lib/crypto';
import { WalletRecord } from '../lib/storage';
import { useStore } from '../store/Store';

export default function HomePage() {
  const { profile, settings, setSettings, authed, client } = useStore();
  const history = useHistory();
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [proposals, setProposals] = useState(0);

  async function refresh() {
    setLoading(true);
    const next: Record<string, number> = {};
    let pending = 0;
    for (const wallet of profile.wallets) {
      try {
        const client = authed(wallet);
        const balance = await client.getBalance();
        next[wallet.id] = balance.totalAmount || 0;
        const txps = await client.listProposals();
        pending += (txps || []).filter((p: { status: string }) => p.status === 'pending' || p.status === 'accepted').length;
      } catch {
        next[wallet.id] = balances[wallet.id] || 0;
      }
    }
    try {
      const coins = Array.from(new Set(profile.wallets.map(w => w.coin)));
      const nextRates: Record<string, number> = {};
      for (const coin of coins) {
        const fiat = await client.getRates(coin);
        const match = (fiat.rates || []).find((r: { code: string }) => r.code === settings.currency);
        if (match) nextRates[coin] = match.rate;
      }
      setRates(r => ({ ...r, ...nextRates }));
    } catch {
      // rates are optional
    }
    setBalances(next);
    setProposals(pending);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, [profile.wallets.length]);

  const fiatTotal = useMemo(() => {
    return profile.wallets.reduce((sum, wallet) => {
      const sats = balances[wallet.id] || 0;
      const coins = sats / COINS[wallet.coin].unitToSat;
      return sum + coins * (rates[wallet.coin] || 0);
    }, 0);
  }, [profile.wallets, balances, rates]);

  return (
    <IonPage>
      <IonHeader className="bp-header">
        <IonToolbar>
          <IonTitle>
            <div className="home-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <IonButtons>
                <IonButton onClick={() => history.push('/settings')}>
                  <IonIcon icon={settingsOutline} />
                </IonButton>
              </IonButtons>
              <h2 className="page-title">Home</h2>
              <IonButtons>
                <IonButton>
                  <IonIcon icon={statsChartOutline} />
                </IonButton>
                <IonButton onClick={() => history.push('/proposals')}>
                  <IonIcon icon={notificationsOutline} />
                </IonButton>
              </IonButtons>
            </div>
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={async ev => { await refresh(); ev.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>
        <div className="total-amount">
          <div className="label">Total cash value</div>
          <div className="value">
            <IonIcon
              icon={settings.hideBalance ? eyeOffOutline : eyeOutline}
              onClick={() => setSettings({ hideBalance: !settings.hideBalance })}
            />
            {loading && !Object.keys(balances).length ? (
              <IonSpinner name="crescent" />
            ) : settings.hideBalance ? (
              '******'
            ) : (
              <>
                {fiatTotal.toFixed(2)}
                <span className="unit">{settings.currency}</span>
              </>
            )}
          </div>
        </div>
        {proposals > 0 && (
          <div className="proposal-banner" onClick={() => history.push('/proposals')}>
            <span>Pending proposals</span>
            <strong>{proposals}</strong>
          </div>
        )}
        <div className="section-label">Accounts</div>
        {profile.wallets.length === 0 && (
          <div className="empty-state">
            <p>No accounts yet. Create a personal or shared wallet.</p>
            <IonButton onClick={() => history.push('/add-wallet')}>Create a new account</IonButton>
          </div>
        )}
        {profile.wallets.map(wallet => (
          <WalletRow
            key={wallet.id}
            wallet={wallet}
            hide={settings.hideBalance}
            sats={balances[wallet.id] || 0}
            onClick={() => history.push(`/wallet/${wallet.id}`)}
          />
        ))}
      </IonContent>
    </IonPage>
  );
}

function WalletRow({
  wallet,
  sats,
  hide,
  onClick
}: {
  wallet: WalletRecord;
  sats: number;
  hide: boolean;
  onClick: () => void;
}) {
  return (
    <div className="wallet-card" onClick={onClick}>
      <img className="coin-avatar" src={COINS[wallet.coin].icon} alt="" />
      <div className="meta">
        <div className="name">{wallet.name}</div>
        <div className="sub">
          {COINS[wallet.coin].name}
          {wallet.n > 1 ? ` · ${wallet.m}-of-${wallet.n}` : ''}
        </div>
      </div>
      <div className="amount">{hide ? '******' : formatAmount(sats, wallet.coin)}</div>
    </div>
  );
}
