"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export default function ThemeToggle() {
	const [theme, setTheme] = useState<Theme>("light");

	useEffect(() => {
		const stored = typeof window !== "undefined" ? (localStorage.getItem("theme") as Theme | null) : null;
		const initial: Theme = stored ?? "light";
		setTheme(initial);
		document.documentElement.setAttribute("data-theme", initial);
	}, []);

	function toggle() {
		const next: Theme = theme === "light" ? "dark" : "light";
		setTheme(next);
		localStorage.setItem("theme", next);
		document.documentElement.setAttribute("data-theme", next);
	}

	return (
		<button
			onClick={toggle}
			className="ios-switch"
			data-on={theme === "dark" ? "true" : "false"}
			role="switch"
			aria-checked={theme === "dark"}
			aria-label="Toggle dark mode"
		>
			<span className="ios-switch-handle" />
		</button>
	);
}


