interface StructuredDataProps {
    readonly data: Record<string, unknown> | Array<Record<string, unknown>>;
}

export function StructuredData({ data }: Readonly<StructuredDataProps>) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
    );
}
