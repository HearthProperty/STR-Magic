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
			className="apple-button px-3 py-2 text-sm font-medium"
			aria-label="Toggle theme"
		>
			{theme === "light" ? "Dark Mode" : "Light Mode"}
		</button>
	);
}


