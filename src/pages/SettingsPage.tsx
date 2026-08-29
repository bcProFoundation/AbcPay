import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar
} from '@ionic/react';
import { useStore } from '../store/Store';

export default function SettingsPage() {
  const { settings, setSettings, profile } = useStore();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/tabs/home" />
          </IonButtons>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          <IonItem>
            <IonLabel>Theme</IonLabel>
            <IonSelect value={settings.theme} onIonChange={e => setSettings({ theme: e.detail.value })}>
              <IonSelectOption value="light">Light</IonSelectOption>
              <IonSelectOption value="dark">Dark</IonSelectOption>
            </IonSelect>
          </IonItem>
          <IonItem>
            <IonLabel>Display currency</IonLabel>
            <IonSelect value={settings.currency} onIonChange={e => setSettings({ currency: e.detail.value })}>
              <IonSelectOption value="USD">USD</IonSelectOption>
              <IonSelectOption value="EUR">EUR</IonSelectOption>
              <IonSelectOption value="GBP">GBP</IonSelectOption>
            </IonSelect>
          </IonItem>
          <IonItem>
            <IonLabel>Hide balances</IonLabel>
            <IonToggle checked={settings.hideBalance} onIonChange={e => setSettings({ hideBalance: e.detail.checked })} />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Wallet service URL</IonLabel>
            <IonInput
              value={settings.bwsUrl}
              onIonInput={e => setSettings({ bwsUrl: String(e.detail.value || '') })}
            />
          </IonItem>
          <IonItem>
            <IonLabel>Language</IonLabel>
            <IonNote slot="end">English</IonNote>
          </IonItem>
          <IonItem>
            <IonLabel>Version</IonLabel>
            <IonNote slot="end">3.0.0</IonNote>
          </IonItem>
          <IonItem>
            <IonLabel>Keys on this device</IonLabel>
            <IonNote slot="end">{profile.keys.length}</IonNote>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
}
