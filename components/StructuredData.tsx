import { headers } from "next/headers";

interface StructuredDataProps {
    readonly data: Record<string, unknown> | Array<Record<string, unknown>>;
}

export function serializeStructuredData(data: StructuredDataProps["data"]) {
    return JSON.stringify(data)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026")
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029");
}

// Async so it can read the per-request nonce itself. Threading the nonce down
// from the root layout would mean a prop on all five call sites instead.
export async function StructuredData({ data }: Readonly<StructuredDataProps>) {
    const nonce = (await headers()).get("x-nonce") ?? undefined;

    return (
        <script
            type="application/ld+json"
            nonce={nonce}
            dangerouslySetInnerHTML={{ __html: serializeStructuredData(data) }}
        />
    );
}
