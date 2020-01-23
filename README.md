# POAP: Proof of Attendance Protocol

## Directory Sructure

Kickback POAP is divided in the following applications/projects:

- **eth**: ZeppelinOS project with POAP Contracts
- **server**: POAP's api server. All server logic goes here
- **client**: React web application that represents the UI of the application. Uses _server_ as backend.
- **signer**: Signer server, to be deployed on the event site in a private network address.

## Architecture

Kickback POAP app is composed of:

- **Backend Server**. Node.js server backend. Provides an API to scan an address, claim a token, and backoffice administration tasks.
  Interacts with the database, and also with the smart contract.
- **Client**. React application, hosted in firebase. It provides a UI for claim, scan and the backoffice. All operations goes
  through the backend server API.
- **Signer**. Small node.js server that plays an important part on the attestation protocol. The client accesses it during the claim
  procedure. The event organizer runs it as a npm module with `npx poap-signer`. One signer is to be deployed for every event, on the event site.

## How does a claim work?

Poap attestation protocol works by deploying a signer in the venue of the event. The signer is to be deployed on an private ip, that's
only accesible by those who are on the local wifi network. Thus, if you can reach the signer, that "attest" that you are on the venue
for that event.

Claim steps:

1.  The user enters the claim url on the client app: `https://checkin.kickback.events/claim/{my-event}`
2.  The client app, obtains the _signer ip_ from the _backend api_; and tests it can connect to it.
3.  The client app, obtains the user's _address_ from the user's wallet (Metamask for example)
4.  The client app, post a claim request to the signer, with the user's address.
5.  The signer service receives the claim request, validates it's for the correct event, and cryptographically signs the request.
6.  The client app ask the user to signed the "signed claim request" it has receieved from the signer.
7.  The client app sends the double signed claim request (signed by the user and the signer) to the backend server
8.  The backend server, checks the correctness of both signatures and if everything is ok then it stores the proof to give to the event admins afterwards

## Setup

## Initial Setup

### Install dependencies

    yarn install
    (cd server; yarn install)
    (cd client; yarn install)
    (cd eth; yarn install)

## Run the application

### configure .env

    copy env.txt file in /server/src/envs to /server
    replace the variables inside with yours

### Start Apps in Dev Mode

From root folder:

    yarn start:client
    yarn start:server

## Deployment

### Deploy to ropsten (first time only)

    cd eth/
    npx zos session --network ropsten --from 0x79A560De1CD436d1D69896DDd8DcCb226f9Fa2fD --expires 3600
    npx zos push
    npx zos create Poap --init initialize --args '"POAP","The Proof of Attendance Protocol","https://api.poap.xyz/metadata/",[]'

This was already done. The POAP Address is: `0x50C5CA3e7f5566dA3Aa64eC687D283fdBEC2A2F2`

### Deploy to mainnet (first time only)

    cd eth/
    export POAP_MAIN_PK="<KEYHERE>"
    npx zos session --network mainnet --from 0xe583f95bF95d0883F94EfE844442C8bfc9dd7A7F --expires 3600
    npx zos push
    npx zos create Poap --init initialize --args '"POAP","The Proof of Attendance Protocol","https://api.poap.xyz/metadata/",[]'

This was already done. The POAP Address is: `0x22C1f6050E56d2876009903609a2cC3fEf83B415`

### Upgrade Contract logic

If you change contract logic and want to update it:

    # Make sure there is no running session for zos (check for existent eth/.zos.session )
    cd eth/
    npx zos session --network ropsten --from 0x79A560De1CD436d1D69896DDd8DcCb226f9Fa2fD --expires 3600
    npx zos push
    npx zos update Poap

### Deploy Client (firebase)

    cd client
    yarn deploy   # Will build & run firebase deploy

### Deploy Server (google app engine)

Prerequisites:

1.  Make sure you have the `app.yaml` in `server/`. This file is not in the github repository
2.  Make sure you have google-cloud-skd installed and in your \$PATH.
3.  Maker sure you have already run `gcloud init`

Steps:

    cd server/
    gcloud app deploy --verbosity=info
