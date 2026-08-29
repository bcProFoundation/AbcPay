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
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  useIonToast
} from '@ionic/react';
import { Controller, useForm } from 'react-hook-form';
import { useHistory, useLocation } from 'react-router-dom';
import { Coin, Network } from '../lib/crypto';
import { useStore } from '../store/Store';

interface Form {
  name: string;
  coin: Coin;
  network: Network;
  copayerName: string;
  m: number;
  n: number;
}

export default function CreateWalletPage() {
  const { profile, createKey, createWallet } = useStore();
  const history = useHistory();
  const location = useLocation();
  const [toast] = useIonToast();
  const params = new URLSearchParams(location.search);
  const shared = params.get('kind') === 'shared';
  const { control, handleSubmit } = useForm<Form>({
    mode: 'onChange',
    defaultValues: {
      name: shared ? 'Shared Wallet' : 'Personal Wallet',
      coin: 'xec',
      network: 'livenet',
      copayerName: 'Me',
      m: shared ? 2 : 1,
      n: shared ? 2 : 1
    }
  });

  const onSubmit = async (values: Form) => {
    try {
      let keyId = params.get('keyId') || profile.keys[0]?.id;
      if (!keyId) {
        keyId = createKey('Personal Key').id;
      }
      const result = await createWallet({
        keyId,
        name: values.name,
        coin: values.coin,
        network: values.network,
        m: shared ? Number(values.m) : 1,
        n: shared ? Number(values.n) : 1,
        copayerName: values.copayerName
      });
      if (result.secret) {
        toast({ message: 'Share the invitation secret with copayers', duration: 2500 });
        history.replace(`/wallet/${result.wallet.id}/backup`);
      } else {
        history.replace(`/wallet/${result.wallet.id}/backup`);
      }
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
          <IonTitle>{shared ? 'Shared account' : 'Personal account'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <IonList>
            <IonItem>
              <IonLabel position="stacked">Account name</IonLabel>
              <Controller name="name" control={control} rules={{ required: true }} render={({ field }) => (
                <IonInput value={field.value} onIonInput={e => field.onChange(e.detail.value)} />
              )} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Coin</IonLabel>
              <Controller name="coin" control={control} render={({ field }) => (
                <IonSelect value={field.value} onIonChange={e => field.onChange(e.detail.value)}>
                  <IonSelectOption value="xec">eCash (XEC)</IonSelectOption>
                  <IonSelectOption value="doge">Dogecoin (DOGE)</IonSelectOption>
                </IonSelect>
              )} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Network</IonLabel>
              <Controller name="network" control={control} render={({ field }) => (
                <IonSelect value={field.value} onIonChange={e => field.onChange(e.detail.value)}>
                  <IonSelectOption value="livenet">Mainnet</IonSelectOption>
                  <IonSelectOption value="testnet">Testnet</IonSelectOption>
                </IonSelect>
              )} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Your name</IonLabel>
              <Controller name="copayerName" control={control} rules={{ required: true }} render={({ field }) => (
                <IonInput value={field.value} onIonInput={e => field.onChange(e.detail.value)} />
              )} />
            </IonItem>
            {shared && (
              <>
                <IonItem>
                  <IonLabel position="stacked">Required signatures (m)</IonLabel>
                  <Controller name="m" control={control} render={({ field }) => (
                    <IonInput type="number" value={field.value} onIonInput={e => field.onChange(Number(e.detail.value))} />
                  )} />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Total copayers (n)</IonLabel>
                  <Controller name="n" control={control} render={({ field }) => (
                    <IonInput type="number" value={field.value} onIonInput={e => field.onChange(Number(e.detail.value))} />
                  )} />
                </IonItem>
              </>
            )}
          </IonList>
          <IonButton expand="block" className="ion-margin" type="submit">
            Create
          </IonButton>
        </form>
      </IonContent>
    </IonPage>
  );
}
