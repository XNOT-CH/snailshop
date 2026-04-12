const YOUTUBE_VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

function normalizeHostname(hostname: string) {
    return hostname.replace(/^www\./, "").toLowerCase();
}

export function extractYouTubeVideoId(value: string) {
    const input = value.trim();
    if (!input) return null;

    try {
        const url = new URL(input);
        const hostname = normalizeHostname(url.hostname);

        if (hostname === "youtu.be") {
            const id = url.pathname.split("/").filter(Boolean)[0];
            return id && YOUTUBE_VIDEO_ID_REGEX.test(id) ? id : null;
        }

        if (hostname === "youtube.com" || hostname === "m.youtube.com") {
            const directId = url.searchParams.get("v");
            if (directId && YOUTUBE_VIDEO_ID_REGEX.test(directId)) {
                return directId;
            }

            const segments = url.pathname.split("/").filter(Boolean);
            const candidate =
                segments[0] === "embed" || segments[0] === "shorts" || segments[0] === "live"
                    ? segments[1]
                    : null;

            return candidate && YOUTUBE_VIDEO_ID_REGEX.test(candidate) ? candidate : null;
        }
    } catch {
        return null;
    }

    return null;
}

export function getYouTubeWatchUrl(videoId: string) {
    return `https://www.youtube.com/watch?v=${videoId}`;
}

export function getYouTubeEmbedUrl(videoId: string) {
    return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
}

export function normalizeYouTubeVideo(value: string) {
    const videoId = extractYouTubeVideoId(value);
    if (!videoId) return null;

    return {
        videoId,
        youtubeUrl: getYouTubeWatchUrl(videoId),
        embedUrl: getYouTubeEmbedUrl(videoId),
    };
}
