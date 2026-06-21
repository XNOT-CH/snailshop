import { API_ROUTES } from "@/lib/constants/apiRoutes";
import { fetchWithCsrf } from "@/lib/csrf-client";

export type UploadClientResponse =
    | { success: true; url: string; message?: string }
    | { success: false; url?: string; message?: string };

const DEFAULT_UPLOAD_FIELD_NAME = "file";

type UploadRequestTarget = RequestInfo | URL;
type UploadFetcher = (input: UploadRequestTarget, init?: RequestInit) => Promise<Response>;

interface UploadFileOptions {
    endpoint?: string;
    fieldName?: string;
    fetcher?: UploadFetcher;
}

export function buildUploadFormData(file: Blob, fieldName = DEFAULT_UPLOAD_FIELD_NAME) {
    const formData = new FormData();
    formData.append(fieldName, file);
    return formData;
}

export async function parseUploadResponse(response: Response): Promise<UploadClientResponse> {
    return (await response.json()) as UploadClientResponse;
}

export async function uploadFileToApi(
    file: Blob,
    {
        endpoint = API_ROUTES.UPLOAD,
        fieldName = DEFAULT_UPLOAD_FIELD_NAME,
        fetcher = fetchWithCsrf,
    }: UploadFileOptions = {},
): Promise<UploadClientResponse> {
    const response = await fetcher(endpoint, {
        method: "POST",
        body: buildUploadFormData(file, fieldName),
    });

    return parseUploadResponse(response);
}
