import {
  courseMediaKindFromPath,
  isCourseMediaPublicPath,
} from "./course-media";

export type CourseEmbed =
  | {
      type: "image";
      url: string;
      label: string;
    }
  | {
      type: "video";
      url: string;
      embedUrl?: string;
      label: string;
      source: "file" | "youtube";
    }
  | {
      type: "notebook";
      url: string;
      label: string;
    }
  | {
      type: "link";
      url: string;
      label: string;
    };

const imageExtensions = new Set([
  ".avif",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".webp",
]);
const videoExtensions = new Set([".mp4", ".webm"]);

function hostLabel(url: URL) {
  return url.hostname.replace(/^www\./, "");
}

function youtubeEmbedUrl(url: URL) {
  const host = hostLabel(url);

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com") {
    const id = url.searchParams.get("v");
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }

  return null;
}

function hasImageExtension(url: URL) {
  const pathname = url.pathname.toLowerCase();
  return Array.from(imageExtensions).some((extension) =>
    pathname.endsWith(extension),
  );
}

function hasVideoExtension(url: URL) {
  const pathname = url.pathname.toLowerCase();
  return Array.from(videoExtensions).some((extension) =>
    pathname.endsWith(extension),
  );
}

export function classifyCourseEmbed(rawUrl: string): CourseEmbed | null {
  if (rawUrl.startsWith("/")) {
    if (!isCourseMediaPublicPath(rawUrl)) {
      return null;
    }

    const kind = courseMediaKindFromPath(rawUrl);

    if (kind === "image") {
      return {
        type: "image",
        url: rawUrl,
        label: "RubberDuck upload",
      };
    }

    if (kind === "video") {
      return {
        type: "video",
        url: rawUrl,
        label: "RubberDuck upload",
        source: "file",
      };
    }
  }

  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }

  const normalizedUrl = url.toString();
  const host = hostLabel(url);
  const youtubeUrl = youtubeEmbedUrl(url);

  if (youtubeUrl) {
    return {
      type: "video",
      url: normalizedUrl,
      embedUrl: youtubeUrl,
      label: "YouTube",
      source: "youtube",
    };
  }

  if (host === "colab.research.google.com" || url.pathname.endsWith(".ipynb")) {
    return {
      type: "notebook",
      url: normalizedUrl,
      label: host === "colab.research.google.com" ? "Google Colab" : host,
    };
  }

  if (hasImageExtension(url)) {
    return {
      type: "image",
      url: normalizedUrl,
      label: host,
    };
  }

  if (hasVideoExtension(url)) {
    return {
      type: "video",
      url: normalizedUrl,
      label: host,
      source: "file",
    };
  }

  return {
    type: "link",
    url: normalizedUrl,
    label: host,
  };
}
