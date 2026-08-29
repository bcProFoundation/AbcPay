import {
  IonButton,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTextarea,
  IonTitle,
  IonToolbar,
  useIonToast
} from '@ionic/react';
import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useStore } from '../store/Store';

export default function ScanPage() {
  const [value, setValue] = useState('');
  const [toast] = useIonToast();
  const history = useHistory();
  const { profile } = useStore();

  function handle() {
    const text = value.trim();
    if (!text) return;
    if (text.startsWith('ecash:') || text.startsWith('dogecoin:') || text.startsWith('D') || text.startsWith('ecash')) {
      const wallet = profile.wallets.find(w => (text.startsWith('ecash') ? w.coin === 'xec' : w.coin === 'doge')) || profile.wallets[0];
      if (!wallet) {
        toast({ message: 'Create a wallet first', duration: 2000 });
        return;
      }
      history.push(`/wallet/${wallet.id}/send?to=${encodeURIComponent(text.replace(/^dogecoin:/, ''))}`);
      return;
    }
    history.push(`/join-wallet?secret=${encodeURIComponent(text)}`);
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>
            <h2 className="page-title">Scan</h2>
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="scan-target">Paste an address or invitation secret. Camera scan ships with the native build.</div>
        <IonList>
          <IonItem>
            <IonLabel position="stacked">Address or secret</IonLabel>
            <IonTextarea value={value} onIonInput={e => setValue(e.detail.value || '')} autoGrow />
          </IonItem>
        </IonList>
        <IonButton expand="block" className="ion-margin" onClick={handle}>
          Continue
        </IonButton>
      </IonContent>
    </IonPage>
  );
}
