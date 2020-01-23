## Applications

### API

- Domain: https://api.poap.xyz
- Deployed in Google App Engine.
- node.js application

API For all the operations. Handles validation of check in signatures.

### APP

- Domain: https://app.poap.xyz
- Deployed in Firebase
- It's a react application, connects to api

POAP application interface. Is the main interface where users can check into your event

### Signer

- Hosted by event organizer on a private ip (should not be accesible from outside the event)
- It's a npm package that anyone can run

Small server that is able to 'sign' proof of attendance. Is to be deployed in the event's local network.

To run it, you need a computer with `node` installed, and then run:

```
npx poap-signer -p <PORT> -e <EventAddress> --sk <SignerPrivateKey>
```

if you don't yet have a private key, you can generate one by:

```
npx poap-signer --genkeys
```

After doing so, you need to go the backoffice and configure the signer address & signer url.
