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
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { parseAmount, proposalBuildOpts, signInputs, validateAddress } from '../lib/crypto';
import { useStore } from '../store/Store';

interface Form {
  to: string;
  amount: string;
  message: string;
}

export default function SendPage() {
  const { id } = useParams<{ id: string }>();
  const { profile, authed } = useStore();
  const wallet = profile.wallets.find(w => w.id === id);
  const history = useHistory();
  const location = useLocation();
  const [toast] = useIonToast();
  const params = new URLSearchParams(location.search);
  const { control, handleSubmit, formState } = useForm<Form>({
    mode: 'onChange',
    defaultValues: { to: params.get('to') || '', amount: '', message: '' }
  });

  if (!wallet) return null;

  const onSubmit = async (values: Form) => {
    try {
      if (!validateAddress(wallet.coin, wallet.network, values.to)) {
        throw new Error('Invalid address');
      }
      const amount = parseAmount(values.amount, wallet.coin);
      const client = authed(wallet);
      const proposal = await client.createProposal({
        toAddress: values.to,
        amount,
        message: values.message || undefined
      });
      await client.publishProposal(proposal.id);
      const signatures = signInputs(
        wallet.coin,
        proposal.raw,
        proposal.inputs,
        wallet.xpriv,
        { ...proposalBuildOpts(proposal), m: wallet.m, network: wallet.network }
      );
      const signed = await client.signProposal(proposal.id, signatures);
      if (wallet.m === 1 || signed.status === 'accepted') {
        await client.broadcastProposal(proposal.id, signed.raw);
        toast({ message: 'Sent', duration: 2000, color: 'success' });
      } else {
        toast({ message: 'Proposal created. Waiting for copayers.', duration: 2500 });
      }
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
            <IonBackButton defaultHref={`/wallet/${id}`} />
          </IonButtons>
          <IonTitle>Send</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <IonList>
            <IonItem>
              <IonLabel position="stacked">To</IonLabel>
              <Controller
                name="to"
                control={control}
                rules={{ required: 'Address is required' }}
                render={({ field }) => (
                  <IonInput value={field.value} onIonInput={e => field.onChange(e.detail.value)} />
                )}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Amount ({wallet.coin.toUpperCase()})</IonLabel>
              <Controller
                name="amount"
                control={control}
                rules={{ required: 'Amount is required' }}
                render={({ field }) => (
                  <IonInput type="number" step="any" value={field.value} onIonInput={e => field.onChange(e.detail.value)} />
                )}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Note</IonLabel>
              <Controller
                name="message"
                control={control}
                render={({ field }) => (
                  <IonInput value={field.value} onIonInput={e => field.onChange(e.detail.value)} />
                )}
              />
            </IonItem>
          </IonList>
          {formState.errors.to && <p className="ion-padding">{formState.errors.to.message}</p>}
          <IonButton expand="block" className="ion-margin" type="submit">
            {wallet.n > 1 ? 'Propose' : 'Slide to send'}
          </IonButton>
        </form>
      </IonContent>
    </IonPage>
  );
}
