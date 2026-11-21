import { Button } from "@/components/ui/button";
import { toast } from "@yusufceng1z/ding-react";

export default function Home() {
	return (
		<div>
			<h1>Home</h1>
			<Button onClick={() => toast.success("Saved!")}>Toast success</Button>
			<button onClick={() => toast.error("Failed")}>Toast error</button>
			<button data-cuelume-tap>Sound only</button>
		</div>
	);
}
