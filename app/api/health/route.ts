import { APP_VERSION, BUILT_AT, GIT_COMMIT } from "@/lib/version";

export async function GET() {
    return Response.json({
        status: "healthy",
        version: APP_VERSION,
        commit: GIT_COMMIT,
        builtAt: BUILT_AT,
    });
}
