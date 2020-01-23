import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

import { ROUTES } from './lib/constants';
import { SignerClaimPage } from './SignerClaimPage';
import { CodeClaimPage } from './CodeClaimPage';
import { ScanPage } from './ScanPage';

const App: React.FC = () => (
  <Router>
    <Switch>
      <Route path={ROUTES.signerClaimPage} component={SignerClaimPage} />
      <Route path={ROUTES.codeClaimPageHash} component={CodeClaimPage} />
      <Route path={ROUTES.codeClaimPage} component={CodeClaimPage} />
      <Route path={ROUTES.home} component={ScanPage} />
    </Switch>
  </Router>
);

export default App;
