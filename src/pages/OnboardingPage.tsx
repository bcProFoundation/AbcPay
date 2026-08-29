import {
  IonButton,
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useStore } from '../store/Store';

export default function OnboardingPage() {
  const history = useHistory();
  const { createKey } = useStore();

  return (
    <IonPage>
      <IonHeader className="bp-header">
        <IonToolbar>
          <div className="header-brand">
            <img className="logo" src="/assets/img/abcpay-logo.svg" alt="AbcPay" />
            <img src="/assets/img/abcpay-text.svg" alt="AbcPay" height={18} />
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="empty-state" style={{ paddingTop: 64 }}>
          <img src="/assets/img/abcpay-logo.svg" width={72} alt="" />
          <h2>Secure Crypto Wallet</h2>
          <p>eCash and Dogecoin. Personal and multisig accounts. Keys stay on this device.</p>
        </div>
        <IonButton
          expand="block"
          className="ion-margin"
          onClick={() => {
            createKey('Personal Key');
            history.replace('/create-wallet');
          }}
        >
          Create a new key
        </IonButton>
        <IonButton expand="block" fill="outline" className="ion-margin" onClick={() => history.push('/import-key')}>
          Import a recovery phrase
        </IonButton>
        <IonButton expand="block" fill="clear" className="ion-margin" onClick={() => history.push('/join-wallet')}>
          Join a shared wallet
        </IonButton>
      </IonContent>
    </IonPage>
  );
}
