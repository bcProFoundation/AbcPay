import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonToast
} from '@ionic/react';
import { useEffect, useState } from 'react';
import { formatAmount, proposalBuildOpts, signInputs } from '../lib/crypto';
import { useStore } from '../store/Store';

export default function ProposalsPage() {
  const { profile, authed } = useStore();
  const [items, setItems] = useState<Array<{ walletId: string; walletName: string; coin: any; proposal: any; xpriv: string }>>([]);
  const [toast] = useIonToast();

  async function load() {
    const next = [];
    for (const wallet of profile.wallets) {
      try {
        const proposals = await authed(wallet).listProposals();
        for (const proposal of proposals || []) {
          if (proposal.status === 'pending' || proposal.status === 'temporary' || proposal.status === 'accepted') {
            next.push({ walletId: wallet.id, walletName: wallet.name, coin: wallet.coin, proposal, xpriv: wallet.xpriv, client: authed(wallet), wallet });
          }
        }
      } catch {
        // ignore
      }
    }
    setItems(next as any);
  }

  useEffect(() => {
    load();
  }, [profile.wallets.length]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/tabs/home" />
          </IonButtons>
          <IonTitle>Pending proposals</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {items.length === 0 && <div className="empty-state">No pending proposals</div>}
        <IonList>
          {items.map(item => (
            <IonItem key={item.proposal.id}>
              <IonLabel>
                <h2>{item.walletName}</h2>
                <p>
                  {formatAmount(Number(item.proposal.amount), item.coin)} to {item.proposal.toAddress}
                </p>
              </IonLabel>
              <IonNote slot="end">
                <IonButton
                  size="small"
                  onClick={async () => {
                    try {
                      const wallet = profile.wallets.find(w => w.id === item.walletId)!;
                      const signatures = signInputs(
                        wallet.coin,
                        item.proposal.raw,
                        item.proposal.inputs,
                        wallet.xpriv,
                        { ...proposalBuildOpts(item.proposal), m: wallet.m, network: wallet.network }
                      );
                      const client = authed(wallet);
                      const signed = await client.signProposal(item.proposal.id, signatures);
                      if (wallet.m === 1 || signed.status === 'accepted') {
                        await client.broadcastProposal(item.proposal.id, signed.raw);
                      }
                      toast({ message: 'Signed', duration: 1500, color: 'success' });
                      load();
                    } catch (error) {
                      toast({ message: (error as Error).message, duration: 2500, color: 'danger' });
                    }
                  }}
                >
                  Sign
                </IonButton>
                <IonButton
                  size="small"
                  fill="outline"
                  color="danger"
                  onClick={async () => {
                    const wallet = profile.wallets.find(w => w.id === item.walletId)!;
                    await authed(wallet).rejectProposal(item.proposal.id);
                    load();
                  }}
                >
                  Reject
                </IonButton>
              </IonNote>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
}
