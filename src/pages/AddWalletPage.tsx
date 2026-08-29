import {
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { chevronForwardOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useStore } from '../store/Store';

export default function AddWalletPage() {
  const history = useHistory();
  const { profile } = useStore();
  const theme = useStore().settings.theme;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Create a new account</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="choice-card" onClick={() => history.push('/create-wallet?kind=personal')}>
          <img src={`/assets/img/add-wallet/simple-wallet-${theme}.svg`} alt="" />
          <div>
            <h3>Personal account</h3>
            <p>1-of-1 XEC or DOGE wallet on this device</p>
          </div>
        </div>
        <div className="choice-card" onClick={() => history.push('/create-wallet?kind=shared')}>
          <img src={`/assets/img/add-wallet/shared-wallet-${theme}.svg`} alt="" />
          <div>
            <h3>Shared account</h3>
            <p>Multisig. Invite copayers with a secret</p>
          </div>
        </div>
        <div className="choice-card" onClick={() => history.push('/join-wallet')}>
          <img src={`/assets/img/add-wallet/join-shared-wallet-${theme}.svg`} alt="" />
          <div>
            <h3>Join shared account</h3>
            <p>Use an invitation secret from a copayer</p>
          </div>
        </div>
        <div className="choice-card" onClick={() => history.push('/import-key')}>
          <img src={`/assets/img/add-wallet/import-wallet-light.svg`} alt="" />
          <div>
            <h3>Import recovery phrase</h3>
            <p>Restore a key, then recreate accounts</p>
          </div>
        </div>
        {profile.keys.length > 0 && (
          <IonList className="ion-margin-top">
            {profile.keys.map(key => (
              <IonItem key={key.id} button onClick={() => history.push(`/create-wallet?keyId=${key.id}`)}>
                <IonLabel>
                  {key.name}
                  <p>Add another account to this key</p>
                </IonLabel>
                <IonNote slot="end">
                  {profile.wallets.filter(w => w.keyId === key.id).length} accounts
                </IonNote>
                <IonIcon icon={chevronForwardOutline} slot="end" />
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
}
