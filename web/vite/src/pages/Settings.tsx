import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export default function Settings() {
	const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

	const toggle = (checked: boolean) => {
		setDark(checked);
		document.documentElement.classList.toggle("dark", checked);
	};

	return (
		<main>
			<section className="flex flex-col gap-4 p-4">
				<h1 className="heading-1">Settings</h1>
				<Card>
					<CardHeader>
						<CardTitle>Appearance</CardTitle>
					</CardHeader>
					<CardContent className="flex items-center justify-between">
						<span>Dark mode</span>
						<Switch
							checked={dark}
							onCheckedChange={toggle}
						/>
					</CardContent>
				</Card>
			</section>
		</main>
	);
}
