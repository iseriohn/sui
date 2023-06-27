// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { KeyRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export function Header() {
	return (
		<div className="border-b px-8 py-4 flex items-center justify-between">
			<div className="flex items-center gap-2">
				<KeyRound strokeWidth={2} size={18} className="text-white/80" />
				<h1 className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
					Phase2 Ceremony Registration
				</h1>
			</div>
		</div>
	);
}
