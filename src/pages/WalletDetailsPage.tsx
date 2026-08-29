import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { arrowDownOutline, arrowUpOutline } from 'ionicons/icons';
import { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { COINS, formatAmount } from '../lib/crypto';
import { useStore } from '../store/Store';

export default function WalletDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { profile, settings, authed } = useStore();
  const wallet = profile.wallets.find(w => w.id === id);
  const history = useHistory();
  const [balance, setBalance] = useState<any>();
  const [historyTxs, setHistoryTxs] = useState<any[]>([]);
  const [txps, setTxps] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!wallet) return;
    setLoading(true);
    try {
      const client = authed(wallet);
      setBalance(await client.getBalance());
      setHistoryTxs(await client.getHistory());
      setTxps((await client.listProposals()) || []);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  if (!wallet) {
    return (
      <IonPage>
        <IonContent className="ion-padding">Wallet not found.</IonContent>
      </IonPage>
    );
  }

  const pending = txps.filter(p => p.status === 'pending' || p.status === 'accepted');

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/tabs/wallets" />
          </IonButtons>
          <IonTitle>{wallet.name}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className={`balance-hero ${wallet.coin}`}>
          <div className="coin">
            {COINS[wallet.coin].name}
            {wallet.n > 1 ? ` · ${wallet.m}-of-${wallet.n}` : ''}
          </div>
          <div className="amount">
            {settings.hideBalance ? '******' : formatAmount(balance?.totalAmount || 0, wallet.coin)} {COINS[wallet.coin].ticker}
          </div>
          <div className="fiat">{wallet.network === 'testnet' ? 'Testnet' : 'Mainnet'}</div>
        </div>
        <div className="action-row">
          <IonButton onClick={() => history.push(`/wallet/${wallet.id}/receive`)}>
            <IonIcon slot="start" icon={arrowDownOutline} />
            Request
          </IonButton>
          <IonButton onClick={() => history.push(`/wallet/${wallet.id}/send`)}>
            <IonIcon slot="start" icon={arrowUpOutline} />
            Send
          </IonButton>
        </div>
        {error && <div className="empty-state">{error}</div>}
        {pending.length > 0 && (
          <div className="proposal-banner" onClick={() => history.push('/proposals')}>
            <span>Pending proposals</span>
            <strong>{pending.length}</strong>
          </div>
        )}
        <div className="section-label">Transactions</div>
        {loading && <div className="empty-state"><IonSpinner /></div>}
        {!loading && historyTxs.length === 0 && <div className="empty-state">No transactions yet</div>}
        {historyTxs.map(tx => (
          <div className="tx-row" key={tx.txid}>
            <img
              className="badge"
              src={`/assets/img/tx-action/icon-${tx.action === 'sent' ? 'sent' : 'received'}-light.svg`}
              alt=""
            />
            <div className="meta" style={{ flex: 1 }}>
              <div className="name">{tx.action === 'sent' ? 'Sent' : 'Received'}</div>
              <div className="sub">{tx.txid.slice(0, 10)}…</div>
            </div>
            <div className="amount">
              {tx.action === 'sent' ? '-' : '+'}
              {formatAmount(Math.abs(tx.amount || 0), wallet.coin)}
            </div>
          </div>
        ))}
      </IonContent>
    </IonPage>
  );
}
