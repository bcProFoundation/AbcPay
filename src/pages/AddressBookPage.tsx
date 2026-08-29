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
  IonToolbar
} from '@ionic/react';
import { Controller, useForm } from 'react-hook-form';
import { Coin } from '../lib/crypto';
import { useStore } from '../store/Store';

export default function AddressBookPage() {
  const { profile, addAddress, removeAddress } = useStore();
  const { control, handleSubmit, reset } = useForm({
    mode: 'onChange',
    defaultValues: { name: '', address: '', coin: 'xec' as Coin }
  });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/tabs/wallets" />
          </IonButtons>
          <IonTitle>Address book</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <form
          onSubmit={handleSubmit(values => {
            addAddress(values);
            reset();
          })}
        >
          <IonList>
            <IonItem>
              <IonLabel position="stacked">Name</IonLabel>
              <Controller name="name" control={control} rules={{ required: true }} render={({ field }) => (
                <IonInput value={field.value} onIonInput={e => field.onChange(e.detail.value)} />
              )} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Address</IonLabel>
              <Controller name="address" control={control} rules={{ required: true }} render={({ field }) => (
                <IonInput value={field.value} onIonInput={e => field.onChange(e.detail.value)} />
              )} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Coin</IonLabel>
              <Controller name="coin" control={control} render={({ field }) => (
                <IonSelect value={field.value} onIonChange={e => field.onChange(e.detail.value)}>
                  <IonSelectOption value="xec">XEC</IonSelectOption>
                  <IonSelectOption value="doge">DOGE</IonSelectOption>
                </IonSelect>
              )} />
            </IonItem>
          </IonList>
          <IonButton expand="block" className="ion-margin" type="submit">
            Save
          </IonButton>
        </form>
        <div className="section-label">Saved</div>
        {profile.addressBook.length === 0 && <div className="empty-state">No saved addresses</div>}
        <IonList>
          {profile.addressBook.map(entry => (
            <IonItem key={entry.id}>
              <IonLabel>
                <h2>{entry.name}</h2>
                <p>{entry.address}</p>
              </IonLabel>
              <IonButton fill="clear" color="danger" onClick={() => removeAddress(entry.id)}>
                Remove
              </IonButton>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
}
