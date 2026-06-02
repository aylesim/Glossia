import { NextResponse } from "next/server";
import { fetchFreeOpenRouterTextModels } from "@/lib/openrouter-models";

export const revalidate = 3600;

export async function GET() {
  try {
    const models = await fetchFreeOpenRouterTextModels();
    return NextResponse.json({ models });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message, models: [] },
      { status: 500 },
    );
  }
}
