import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonToast
} from '@ionic/react';
import { Controller, useForm } from 'react-hook-form';
import { useHistory, useLocation } from 'react-router-dom';
import { useStore } from '../store/Store';

export default function JoinWalletPage() {
  const { profile, createKey, joinWallet } = useStore();
  const history = useHistory();
  const location = useLocation();
  const [toast] = useIonToast();
  const params = new URLSearchParams(location.search);
  const { control, handleSubmit } = useForm({
    mode: 'onChange',
    defaultValues: { secret: params.get('secret') || '', copayerName: 'Me' }
  });

  const onSubmit = async (values: { secret: string; copayerName: string }) => {
    try {
      let keyId = profile.keys[0]?.id;
      if (!keyId) keyId = createKey('Shared Key').id;
      const wallet = await joinWallet({ keyId, secret: values.secret.trim(), copayerName: values.copayerName });
      history.replace(`/wallet/${wallet.id}`);
    } catch (error) {
      toast({ message: (error as Error).message, duration: 3000, color: 'danger' });
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/add-wallet" />
          </IonButtons>
          <IonTitle>Join shared account</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <IonList>
            <IonItem>
              <IonLabel position="stacked">Invitation secret</IonLabel>
              <Controller name="secret" control={control} rules={{ required: true }} render={({ field }) => (
                <IonInput value={field.value} onIonInput={e => field.onChange(e.detail.value)} />
              )} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Your name</IonLabel>
              <Controller name="copayerName" control={control} rules={{ required: true }} render={({ field }) => (
                <IonInput value={field.value} onIonInput={e => field.onChange(e.detail.value)} />
              )} />
            </IonItem>
          </IonList>
          <IonButton expand="block" className="ion-margin" type="submit">
            Join
          </IonButton>
        </form>
      </IonContent>
    </IonPage>
  );
}
