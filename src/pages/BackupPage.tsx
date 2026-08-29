import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonToast
} from '@ionic/react';
import { useParams, useHistory } from 'react-router-dom';
import { useStore } from '../store/Store';

export default function BackupPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useStore();
  const wallet = profile.wallets.find(w => w.id === id);
  const key = profile.keys.find(k => k.id === wallet?.keyId);
  const history = useHistory();
  const [toast] = useIonToast();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={wallet ? `/wallet/${wallet.id}` : '/tabs/home'} />
          </IonButtons>
          <IonTitle>Backup</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="ion-padding">
          <h2>Write down your recovery phrase</h2>
          <p>AbcPay never sends this phrase to the wallet service. Anyone with it can spend your funds.</p>
        </div>
        <div className="mnemonic-box">{key?.mnemonic}</div>
        {wallet?.secret && (
          <>
            <div className="ion-padding">
              <h3>Invitation secret</h3>
              <p>Share this with copayers so they can join this {wallet.m}-of-{wallet.n} account.</p>
            </div>
            <div className="mnemonic-box">{wallet.secret}</div>
            <IonButton
              expand="block"
              fill="outline"
              className="ion-margin"
              onClick={() => {
                navigator.clipboard.writeText(wallet.secret || '');
                toast({ message: 'Secret copied', duration: 1500 });
              }}
            >
              Copy secret
            </IonButton>
          </>
        )}
        <IonButton expand="block" className="ion-margin" onClick={() => history.replace(wallet ? `/wallet/${wallet.id}` : '/tabs/home')}>
          I have written it down
        </IonButton>
      </IonContent>
    </IonPage>
  );
}
