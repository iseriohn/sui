// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createBrowserRouter, Navigate } from 'react-router-dom';
import Register from './register';
import Contribute from './contribute';
import { Root } from './root';

export const router = createBrowserRouter([
	{
		path: '/',
		element: <Root />,
		children: [
			{
				path: '/',
				element: <Navigate to="register" replace />,
			},
			{
				path: 'register',
				element: <Register />,
			},
			{
				path: 'contribute',
				element: <Contribute />,
			},
		],
	},
]);
