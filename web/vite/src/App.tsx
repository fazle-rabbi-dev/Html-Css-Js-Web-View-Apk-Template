import { useEffect } from "react";
import { Outlet } from "react-router";
import { Toaster, toast } from "@yusufceng1z/ding-react";
import { bind } from "cuelume";
import { SsgoiRouteBoundary } from "@ssgoi/react/react-router";
import { SsgoiProvider } from "./SsgoiProvider";
import BottomTabBar from "./components/BottomTabBar";

export default function App() {
	useEffect(() => {
		const unbind = bind();
		toast.configure({ sound: true, volume: 0.5 });
		return () => unbind();
	}, []);

	return (
		<SsgoiProvider>
			<Toaster
				position="top-center"
				theme="system"
			/>

			<div className="relative z-0 min-h-screen overflow-x-clip">
				<SsgoiRouteBoundary>
					<div className="bg-background min-h-screen">
						<Outlet />
					</div>
				</SsgoiRouteBoundary>
			</div>
			<BottomTabBar />
		</SsgoiProvider>
	);
}
