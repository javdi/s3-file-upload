// media.test.ts
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { Readable } from "stream";
import { fetch } from "undici";
import { Upload } from "@aws-sdk/lib-storage";
import { Media } from "../services/media.js";

vi.mock("@aws-sdk/lib-storage", () => {
  return {
    Upload: vi.fn().mockImplementation(() => {
      return {
        done: vi.fn().mockResolvedValue("Upload complete"),
      };
    }),
  };
});

vi.mock("undici", () => {
  return {
    fetch: vi.fn(),
  };
});


function createMockResponse({
  ok = true,
  statusText = "OK",
  headers = {} as Record<string, string>,
  body = new Readable({
    read() {
      this.push("test data");
      this.push(null);
    },
  }),
} = {}): any {
  return {
    ok,
    statusText,
    headers: {
      get: (name: string) => {
        return headers[name.toLowerCase()] || null;
      },
    },
    body,
  };
}

const dummyConfig = {
  s3Region: "us-east-1",
  s3Endpoint: "http://localhost:4566",
  accessKeyId: "testAccessKey",
  secretAccessKey: "testSecretKey",
  bucket: "test-bucket",
};

describe("Media", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers(); 
  });

  it("should upload successfully", async () => {
    const fakeResponse = createMockResponse({
      headers: {
        "content-length": "1000",
        "content-type": "image/jpeg",
      },
      body: new Readable({
        read() {
          this.push("some image data");
          this.push(null);
        },
      }),
    });
  
    (fetch as any).mockResolvedValue(fakeResponse);
    const media = new Media(dummyConfig);
  
    const timestamp = Date.now();
  
    await media.uploadUrl({
      sourceUrl: "http://example.com/file.jpg",
      destinationDir: "uploads",
    });
  
    expect(Upload).toHaveBeenCalledTimes(1);
    const uploadInstanceArgs = (Upload as any).mock.calls[0][0].params;
    expect(uploadInstanceArgs.Bucket).toBe(dummyConfig.bucket);
    expect(uploadInstanceArgs.ContentType).toBe("image/jpeg");
  
    expect(uploadInstanceArgs.Key).toMatch(
      new RegExp(`^uploads[/\\\\]${timestamp.toString().slice(0, -3)}\\d*\\.jpeg$`)
    );
  });

  it("should throw error for missing parameters", async () => {
    const media = new Media(dummyConfig);

    await expect(
      media.uploadUrl({ sourceUrl: "", destinationDir: "uploads" })
    ).rejects.toThrow(
      "Missing required parameters: sourceUrl and destinationDir are required"
    );

    await expect(
      media.uploadUrl({ sourceUrl: "http://example.com/file.jpg", destinationDir: "" })
    ).rejects.toThrow(
      "Missing required parameters: sourceUrl and destinationDir are required"
    );
  });

  it("should throw error if fetch fails (response.ok false)", async () => {
    const fakeResponse = createMockResponse({
      ok: false,
      statusText: "Not Found",
    });
    (fetch as any).mockResolvedValue(fakeResponse);

    const media = new Media(dummyConfig);

    await expect(
      media.uploadUrl({ sourceUrl: "http://example.com/file.jpg", destinationDir: "uploads" })
    ).rejects.toThrow("Failed to fetch file: Not Found");
  });


  it("should throw error if file exceeds maximum size limit", async () => {
    const fakeResponse = createMockResponse({
      headers: {
        "content-length": (200 * 1000 * 1000 * 1000 + 1).toString(),
        "content-type": "image/jpeg",
      },
    });
    (fetch as any).mockResolvedValue(fakeResponse);

    const media = new Media(dummyConfig);

    await expect(
      media.uploadUrl({ sourceUrl: "http://example.com/file.jpg", destinationDir: "uploads" })
    ).rejects.toThrow("File exceeds maximum size limit");
  });

  it("should throw error if content-type header is missing", async () => {
    const fakeResponse = createMockResponse({
      headers: {
        "content-length": "1000",
      },
    });
    (fetch as any).mockResolvedValue(fakeResponse);

    const media = new Media(dummyConfig);

    await expect(
      media.uploadUrl({ sourceUrl: "http://example.com/file.jpg", destinationDir: "uploads" })
    ).rejects.toThrow("Unable to determine content type");
  });

  it("should throw error if unsupported file type (mime not recognized)", async () => {
    const fakeResponse = createMockResponse({
      headers: {
        "content-length": "1000",
        "content-type": "application/unknown",
      },
    });
    (fetch as any).mockResolvedValue(fakeResponse);

    const media = new Media(dummyConfig);

    await expect(
      media.uploadUrl({
        sourceUrl: "http://example.com/file.unknown",
        destinationDir: "uploads",
      })
    ).rejects.toThrow("Unsupported file type");
  });

  it("should throw error if response body is null", async () => {
    const fakeResponse = createMockResponse({
      headers: {
        "content-length": "1000",
        "content-type": "image/jpeg",
      },
      body: null as any,
    });
    (fetch as any).mockResolvedValue(fakeResponse);

    const media = new Media(dummyConfig);

    await expect(
      media.uploadUrl({ sourceUrl: "http://example.com/file.jpg", destinationDir: "uploads" })
    ).rejects.toThrow("Response body is null");
  });

});
