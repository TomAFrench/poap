## Applications

### API

- node.js application

API For all the operations. Handles validation of check in signatures.

### APP

- It's a react application, connects to api

POAP application interface. Is the main interface where users can check into your event

### Signer

- Hosted by event organizer on a private ip (should not be accessible from outside the event)
- It's a npm package that anyone can run

Small server that is able to 'sign' proof of attendance. Is to be deployed in the event's local network.

## Setup

First clone this repository and enter it.

```bash
git clone git@github.com:TomAFrench/poap.git
cd poap
```

You'll need 3 terminals open to run each component.

#### Server

Enter `server/` and build and run

```bash
cd server
yarn build
yarn start
```
The server pulls data from `https://kovan.api.kickback.events` as it needs to so no further set up is required

It currently assumes that the signer is running on `http://localhost:8080`

#### Signer

Currently some urls are semi-hardcoded and assume you're running on the default ports on localhost.

```bash
cd signer
yarn build
```
The signer is then built at `dist/poap-signer.js`. It takes some command line parameters to which you can see by calling

```bash
node dist/poap-signer.js
```
You can explore these options but the minimum config is

```bash
node dist/poap-signer.js -e <EventAddress> --sk <SignerPrivateKey>
```
Where:
- `EventAddress` is the contract address of the event you are taking registrations for
- `SignerPrivateKey` is the private key of an address listed as an admin for the event.

On startup, the signer will query `https://kovan.api.kickback.events` for information on the event you have specified. If the event doesn't exist or the provided key isn't an admin for that event, it will error and show a warning. It will also pull a list of registered attendees in order to validate whether to sign check in requests.

If you don't want to input your private key, you can generate one by:

```
node dist/poap-signer.js --genkeys
```

After doing so, you need to go the Kickback event admin panel and add the provided address.

#### Client:

This is the jankiest part of the three components so excuse any ugliness. I've frankensteined it as it would need a completely new ui.

Enter `client/` and build and run

```bash
cd client
yarn start
```
This will open a react app on `http://localhost:3000`. Going to `http://localhost:3000/signer/claim/<EventAddress>` will display an interface to send a check in request to the signer.

You can try this with accounts which are/aren't registered for the event to observe the difference.
