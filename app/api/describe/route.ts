import { NextResponse } from "next/server";

/**
 * Generate a short, 1-2 sentence property excerpt using OpenAI.
 * Env: OPENAI_API_KEY (required), optional OPENAI_BASE_URL
 */
export async function POST(request: Request) {
	try {
		const apiKey = process.env.OPENAI_API_KEY;
		if (!apiKey) {
			return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
		}

		const { address, propertyType, city, county }: { address?: string; propertyType?: string; city?: string | null; county?: string | null } = await request.json();
		const trimmedAddress = (address || "").trim();
		const trimmedType = (propertyType || "").trim();
		if (!trimmedAddress && !trimmedType) {
			return NextResponse.json({ error: "Provide at least address or propertyType" }, { status: 400 });
		}

		const model = process.env.OPENAI_PROPERTY_MODEL?.trim() || "gpt-4o-mini";
		const baseUrl = (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com").replace(/\/$/, "");

		const system = [
			"You write concise property blurbs for real estate apps.",
			"Output 1-2 sentences (max ~45 words).",
			"Be factual from inputs only. Avoid unverifiable claims.",
			"Tone: neutral, helpful, and descriptive.",
		].join(" ");

		const parts: string[] = [];
		if (trimmedType) parts.push(`Type: ${trimmedType}`);
		if (city) parts.push(`City: ${city}`);
		if (county) parts.push(`County: ${county}`);
		if (trimmedAddress) parts.push(`Address: ${trimmedAddress}`);
		const user = `Write a brief property excerpt from the following context. ${parts.join(" | ")}`;

		const res = await fetch(`${baseUrl}/v1/chat/completions`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model,
				messages: [
					{ role: "system", content: system },
					{ role: "user", content: user },
				],
				max_tokens: 120,
				temperature: 0.7,
			}),
		});
		if (!res.ok) {
			let bodyText: string | undefined;
			try { bodyText = await res.text(); } catch {}
			return NextResponse.json({ error: "Upstream error", upstream: { status: res.status, body: bodyText } }, { status: 502 });
		}
		const json = await res.json();
		const excerpt: string = json?.choices?.[0]?.message?.content?.toString()?.trim?.() || "";
		return NextResponse.json({ excerpt });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}


