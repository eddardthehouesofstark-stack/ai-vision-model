/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CCTVProvider } from './context/CCTVContext';
import { AppLayout } from './components/layout/AppLayout';

export default function App() {
  return (
    <CCTVProvider>
      <AppLayout />
    </CCTVProvider>
  );
}

