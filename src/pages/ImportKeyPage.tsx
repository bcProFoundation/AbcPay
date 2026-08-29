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
  IonTextarea,
  IonTitle,
  IonToolbar,
  useIonToast
} from '@ionic/react';
import { Controller, useForm } from 'react-hook-form';
import { useHistory } from 'react-router-dom';
import { useStore } from '../store/Store';

export default function ImportKeyPage() {
  const { importKey } = useStore();
  const history = useHistory();
  const [toast] = useIonToast();
  const { control, handleSubmit } = useForm({
    mode: 'onChange',
    defaultValues: { name: 'Imported Key', mnemonic: '' }
  });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/onboarding" />
          </IonButtons>
          <IonTitle>Import recovery phrase</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <form
          onSubmit={handleSubmit(values => {
            try {
              importKey(values.name, values.mnemonic);
              history.replace('/add-wallet');
            } catch (error) {
              toast({ message: (error as Error).message, duration: 2500, color: 'danger' });
            }
          })}
        >
          <IonList>
            <IonItem>
              <IonLabel position="stacked">Key name</IonLabel>
              <Controller name="name" control={control} rules={{ required: true }} render={({ field }) => (
                <IonInput value={field.value} onIonInput={e => field.onChange(e.detail.value)} />
              )} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">12-word phrase</IonLabel>
              <Controller name="mnemonic" control={control} rules={{ required: true }} render={({ field }) => (
                <IonTextarea autoGrow value={field.value} onIonInput={e => field.onChange(e.detail.value)} />
              )} />
            </IonItem>
          </IonList>
          <IonButton expand="block" className="ion-margin" type="submit">
            Import
          </IonButton>
        </form>
      </IonContent>
    </IonPage>
  );
}
