import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

import { ROUTES } from './lib/constants';
import { SignerClaimPage } from './SignerClaimPage';

const App: React.FC = () => (
  <Router>
    <Switch>
      <Route path={ROUTES.signerClaimPage} component={SignerClaimPage} />
      <Route path={ROUTES.home} component={SignerClaimPage} />
    </Switch>
  </Router>
);

export default App;
