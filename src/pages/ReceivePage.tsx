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
  IonSpinner,
  IonTitle,
  IonToolbar,
  useIonToast
} from '@ionic/react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { deriveAddress } from '../lib/crypto';
import { useStore } from '../store/Store';

export default function ReceivePage() {
  const { id } = useParams<{ id: string }>();
  const { profile, authed } = useStore();
  const wallet = profile.wallets.find(w => w.id === id);
  const [address, setAddress] = useState('');
  const [path, setPath] = useState('');
  const [toast] = useIonToast();
  const [loading, setLoading] = useState(true);

  async function generate() {
    if (!wallet) return;
    setLoading(true);
    try {
      const created = await authed(wallet).createAddress();
      const info = await authed(wallet).getWallet();
      const xpubs = (info.copayers || []).map((c: { xPubKey: string }) => c.xPubKey);
      const local = deriveAddress({
        coin: wallet.coin,
        network: wallet.network,
        m: wallet.m,
        n: wallet.n,
        xpubs: xpubs.length ? xpubs : [wallet.xpub],
        path: created.path
      });
      if (xpubs.length === wallet.n && local !== created.address) {
        throw new Error('Server address did not match local derivation');
      }
      setAddress(created.address);
      setPath(created.path);
    } catch (error) {
      toast({ message: (error as Error).message, duration: 2500, color: 'danger' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    generate();
  }, [id]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={`/wallet/${id}`} />
          </IonButtons>
          <IonTitle>Request</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {loading ? (
          <div className="empty-state">
            <IonSpinner />
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
              {address && <QRCodeSVG value={address} size={220} />}
            </div>
            <IonList>
              <IonItem>
                <IonLabel position="stacked">Address</IonLabel>
                <IonInput readonly value={address} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Path</IonLabel>
                <IonInput readonly value={path} />
              </IonItem>
            </IonList>
            <IonButton
              expand="block"
              className="ion-margin-top"
              onClick={() => {
                navigator.clipboard.writeText(address);
                toast({ message: 'Address copied', duration: 1500 });
              }}
            >
              Copy
            </IonButton>
            <IonButton expand="block" fill="outline" onClick={generate}>
              New address
            </IonButton>
          </>
        )}
      </IonContent>
    </IonPage>
  );
}
