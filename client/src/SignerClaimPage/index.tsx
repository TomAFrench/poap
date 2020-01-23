import React, { useCallback, useState } from 'react';
import { RouteComponentProps } from 'react-router';
import { Link } from 'react-router-dom';
import classNames from 'classnames';

import { getEvent, checkSigner, KickbackEvent, Address } from '../api';
import { tryGetAccount, hasMetamask, isMetamaskLogged, tryCheckIn } from '../poap-eth';
import { useAsync, useBodyClassName } from '../react-helpers';
import { ClaimFooter } from '../components/ClaimFooter';

import { Loading } from '../components/Loading';
import HeaderShadowDesktopGreenImg from '../images/header-shadow-desktop-green.svg';
import HeaderShadowDesktopImg from '../images/header-shadow-desktop.svg';
import HeaderShadowGreenImg from '../images/header-shadow-green.svg';
import HeaderShadowImg from '../images/header-shadow.svg';

type ClaimPageState = {
  event: null | KickbackEvent;
  invalidEventFlag: boolean;
};

export const LoadEvent: React.FC<{
  fancyId: string;
  render: (event: KickbackEvent) => React.ReactElement;
}> = ({ fancyId, render }) => {
  const getEventMemo = useCallback(() => getEvent(fancyId), [fancyId]);
  const [event, fetchingEvent, fetchEventError] = useAsync(getEventMemo);

  if (event == null || fetchEventError) {
    return <ClaimFooter />;
  } else if (fetchingEvent) {
    return <Loading />;
  }
  return render(event);
};

export const CheckAccount: React.FC<{
  render: (address: string) => React.ReactElement;
}> = ({ render }) => {
  const [account, fetchingAccount, fetchAccountError] = useAsync(tryGetAccount);
  const metamaskLoggedOut = hasMetamask() && !isMetamaskLogged();
  if (fetchingAccount) {
    return <p>Checking Browser for Web3</p>;
  } else if (fetchAccountError) {
    return <p className="error">There was a problem obtaining your account</p>;
  } else if (account == null) {
    return <p className="error">You need a Web3 enabled browser to get your badge here</p>;
  } else if (metamaskLoggedOut) {
    return <div className="error">Metamask is Logged Out. Login and Refresh</div>;
  }

  return render(account);
};

export const SignerClaimPage: React.FC<RouteComponentProps<{ event: string }>> = ({ match }) => {
  return (
    <>
      <LoadEvent fancyId={match.params.event} render={event => <ClaimPageInner event={event} />} />
      <ClaimFooter />
    </>
  );
};

enum ClaimState {
  Idle,
  Working,
  Finished,
  Failed,
  MetaMaskLoggedOut,
}

const ClaimPageInner: React.FC<{ event: KickbackEvent }> = React.memo(({ event }) => {
  const hasSigner = event.signer != null && event.signer_ip != null;
  const checkLocation = useCallback(() => checkSigner(event.signer_ip, event.eventAddress), [event]);
  const [onLocation, checkingLocation] = useAsync(checkLocation);

  const [claimState, setClaimState] = useState(ClaimState.Idle);
  const checkIn = useCallback(async (event: KickbackEvent, account: Address) => {
    setClaimState(ClaimState.Working);
    try {
      await tryCheckIn(event, account);
      setClaimState(ClaimState.Finished);
    } catch (err) {
      console.log(err);
      setClaimState(ClaimState.Failed);
    }
  }, []);
  useBodyClassName(claimState ? 'eventsapp green' : 'eventsapp');

  return (
    <>
      <ClaimHeader event={event} />
      <main id="site-main" role="main" className={classNames('main-events', claimState && 'green')}>
        <div className="image-main">
          <ResponsiveImg
            mobile={claimState ? HeaderShadowGreenImg : HeaderShadowImg}
            desktop={claimState ? HeaderShadowDesktopGreenImg : HeaderShadowDesktopImg}
          />
        </div>
        <div className="main-content">
          <div className="container">
            <div
              className="content-event"
              data-aos="fade-up"
              data-aos-delay="300"
              style={{ minHeight: 65 }}
            >
              <CheckAccount
                render={account => (
                  <>
                    <h2>Wallet</h2>
                    <p className="wallet-number">{account}</p>
                    {claimState === ClaimState.Idle && (
                      <ClaimButton
                        hasSigner={hasSigner}
                        onLocation={onLocation}
                        checkingLocation={checkingLocation}
                        obtainBadge={() => checkIn(event, account)}
                      />
                    )}
                    {claimState === ClaimState.Working && <Loading />}
                    {claimState === ClaimState.Finished && (
                      <>
                        <h3>You’re all set!</h3>
                        <p>Your new badge will show up shortly on</p>
                        <Link to={`/scan/${account}`}>
                          <button className="btn">POAPScan</button>
                        </Link>
                        <p>Smash that refresh button</p>
                      </>
                    )}
                    {claimState === ClaimState.Failed && (
                      <p className="error">There was an error with your claim</p>
                    )}
                  </>
                )}
              />
            </div>
          </div>
        </div>
      </main>
    </>
  );
});

const ResponsiveImg: React.FC<{ mobile: string; desktop: string }> = React.memo(
  ({ mobile, desktop }) => (
    <>
      <img alt="" src={mobile} className="mobile" />
      <img alt="" src={desktop} className="desktop" />
    </>
  )
);

type ClaimButtonProps = {
  obtainBadge: () => void;
  onLocation: null | boolean;
  checkingLocation: boolean;
  hasSigner: boolean;
};
const ClaimButton: React.FC<ClaimButtonProps> = React.memo(
  ({ obtainBadge, onLocation, checkingLocation, hasSigner }) => {
    if (!hasSigner) {
      return (
        <button className="btn" disabled>
          Venue is inactive
        </button>
      );
    } else if (checkingLocation) {
      return <button className="btn loading" disabled />;
    } else if (!onLocation) {
      return (
        <button className="btn" disabled>
          You're not on the venue!
        </button>
      );
    }

    return (
      <button className="btn" onClick={obtainBadge}>
        <span>I am right here</span>
        <br />
        <span className="small-text">so give me by badge</span>
      </button>
    );
  }
);

const ClaimHeader: React.FC<{ event: KickbackEvent }> = React.memo(({ event }) => (
  <header id="site-header" role="banner" className="header-events">
    <div className="container">
      <h1>{event.name}</h1>
      <div className="logo-event" data-aos="fade-up">
        <img src={event.image_url} alt="Event" />
      </div>
    </div>
  </header>
));

/**

1) Cargo... todavia no se si tengo web3 [ Detecting web3...]
2) Espero a ver si tengo web3 (3 segundos)
3) Si es Metmask => Pido enable() (en el claimer)
4) Si no es metamask => Pido first account y la uso
5) Si no tengo nada => muestro mensaje de error

post (3) y (4)


Estados:
  - CheckingWeb3
  - WalletReady
  - MintingToken
  - WalletMissing
 */
