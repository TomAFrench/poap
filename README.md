# POAP: Proof of Attendance Protocol

## Directory Sructure

Kickback POAP is divided in the following applications/projects:

- **server**: POAP's api server. All server logic goes here.
- **client**: React web application that represents the UI of the application. Uses _server_ as backend.
- **signer**: Signer server, to be deployed on the event site in a private network address.

## Architecture

Kickback POAP app is composed of:

- **Backend Server**. Node.js server backend. Provides an API to automatically verify check in receipts and update the status of users.
- **Client**. React application. It provides a UI for claim, scan and the backoffice. All operations goes
  through the backend server API.
- **Signer**. Small node.js server that plays an important part on the attestation protocol. The client accesses it during the claim procedure. The event organizer runs it as a npm module with `npx poap-signer`. One signer is to be deployed for every event, on the event site.

## How does a claim work?

POAP attestation protocol works by deploying a signer in the venue of the event. The signer is to be deployed on an private ip, that's only accesible by those who are on the local wifi network. Thus, if you can reach the signer, that "attests" that you are on the venue for that event.

Claim steps:

1. The user enters the claim url on the client app: `https://checkin.kickback.events/claim/{my-event}`
2. The client app obtains the _signer ip_ from the _backend api_; and tests it can connect to it. (subject to change)
3. The client app obtains the user's _address_ from the user's wallet (Metamask for example)
4. The client app asks the user to signed a claim request made up of the event contracts and user's addresses.
5. The client app sends the claim request to the signer. 
6. The signer service receives the claim request, validates it's for the correct event and the user is registered for the event. If so, then it cryptographically signs the request with an admin key to make a receipt.

Now that the receipt has the signature of both parties, it acts as a proof of attendance.

This receipt is then shared between several parties:

1. The signer sends the receipt to the Kickback servers so that the user is marked as checked in on the website.
2. The signer also saves a local copy of the receipt in case Kickback is uncontactable.
3. The signer sends a copy of the receipt back to the user so that they can verify that they have been correctly checked in.

## Setup

## Initial Setup

### Install dependencies

    yarn install
    (cd server; yarn install)
    (cd client; yarn install)
    (cd eth; yarn install)

### Start Apps in Dev Mode

From root folder:

    yarn start:client
    yarn start:server

from signer folder:

```bash
node dist/poap-signer.js -e <EventAddress> --sk <SignerPrivateKey>
```
Where:
- `EventAddress` is the contract address of the event you are taking registrations for
- `SignerPrivateKey` is the private key of an address listed as an admin for the event.

You can explore difference command line options by using

```bash
node dist/poap-signer.js 
```
