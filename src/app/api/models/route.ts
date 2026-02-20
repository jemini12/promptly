import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/authz";
import { errorResponse } from "@/lib/http";
import { AVAILABLE_OPENAI_MODELS } from "@/lib/llm-defaults";

let cached:
  | {
      expiresAt: number;
      models: Array<{ id: string; name: string; contextWindow: number | null; maxTokens: number | null; tags: string[] }>;
    }
  | null = null;

export async function GET() {
  try {
    await requireUserId();

    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return NextResponse.json({ models: cached.models });
    }

    const models = AVAILABLE_OPENAI_MODELS.map((m) => ({
      id: m.id,
      name: m.name,
      contextWindow: null,
      maxTokens: null,
      tags: [],
    }));

    cached = {
      expiresAt: now + 10 * 60 * 1000,
      models,
    };

    return NextResponse.json({ models });
  } catch (error) {
    return errorResponse(error);
  }
}
