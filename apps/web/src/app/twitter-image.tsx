/**
 * Twitter/X reads twitter:image separately from og:image; re-export the same
 * branded card so both networks render an identical large preview.
 */
export { default, alt, size, contentType } from "./opengraph-image";

export const runtime = "edge";
