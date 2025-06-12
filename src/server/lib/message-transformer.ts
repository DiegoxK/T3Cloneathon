import {
  type CoreMessage,
  type Message,
  type ImagePart,
  type TextPart,
  type FilePart,
} from "ai";

type ContentPart = TextPart | ImagePart | FilePart;

const SUPPORTED_TEXT_MIMETYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/xml",
  "text/html",
  "text/css",
  "text/javascript",
  "application/javascript",
  "application/x-python-code",
  "text/x-python",
];

export function transformToCoreMessages(uiMessages: Message[]): CoreMessage[] {
  return uiMessages
    .filter(
      (
        message,
      ): message is Message & { role: "user" | "assistant" | "system" } =>
        message.role === "user" ||
        message.role === "assistant" ||
        message.role === "system",
    )
    .map((message) => {
      if (
        message.role !== "user" ||
        !message.experimental_attachments ||
        message.experimental_attachments.length === 0
      ) {
        return { role: message.role, content: message.content };
      }

      const content: ContentPart[] = [{ type: "text", text: message.content }];

      for (const att of message.experimental_attachments) {
        if (!att.contentType || !att.name) continue;
        const base64Content = att.url.split(",")[1];
        if (!base64Content) continue;

        // Handle Images by creating a standard ImagePart
        if (att.contentType.startsWith("image/")) {
          content.push({
            type: "image",
            image: Buffer.from(base64Content, "base64"),
          });
        }
        // Handle PDFs by creating a standard FilePart
        else if (att.contentType === "application/pdf") {
          content.push({
            type: "file",
            data: Buffer.from(base64Content, "base64"),
            mimeType: att.contentType,
            filename: att.name,
          });
        }
        // Handle Text-based files by injecting their content as TextParts
        else if (SUPPORTED_TEXT_MIMETYPES.includes(att.contentType)) {
          const decodedContent = Buffer.from(base64Content, "base64").toString(
            "utf-8",
          );
          content.push({
            type: "text",
            text: `--- Content of attached file: ${att.name} ---\n${decodedContent}`,
          });
        }
        // Handle any other unsupported files
        else {
          content.push({
            type: "text",
            text: `[Unsupported file attachment: ${att.name} (${att.contentType})]`,
          });
        }
      }
      return { role: "user", content };
    });
}
