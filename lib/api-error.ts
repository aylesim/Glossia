import { toAppError } from "@/lib/llm/types";

export function errorResponse(error: unknown): Response {
  const appError = toAppError(error);
  return Response.json(
    {
      error: {
        code: appError.code,
        message: appError.message,
        hint: appError.hint,
      },
    },
    { status: appError.status },
  );
}
