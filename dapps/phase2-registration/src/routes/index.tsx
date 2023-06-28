// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createBrowserRouter, Navigate } from 'react-router-dom';
import OfflineSigner from './offline-signer';
import { Root } from './root';

export const router = createBrowserRouter([
	{
		path: '/',
		element: <Root />,
		children: [
			{
				path: '/',
				element: <Navigate to="phase2-registration" replace />,
			},
			{
				path: 'phase2-registration',
				element: <OfflineSigner />,
			},
		],
	},
]);
