import { describe, expect, it } from "vitest";
import { CHAT_MAX_MESSAGE_LENGTH } from "@/lib/chatConstraints";
import { parseChatMessagePayload, sanitizeChatText } from "@/lib/chatSecurity";

describe("chatSecurity", () => {
    it("sanitizes control characters, html comments, and html tags", () => {
        expect(
            sanitizeChatText("  hello\u0000<!--secret--><script>alert(1)</script><b>world</b>\r\n ")
        ).toBe("helloalert(1)world");
    });

    it("preserves plain text comparisons that are not html tags", () => {
        expect(sanitizeChatText("1 < 2\n\n\n\n3 > 1")).toBe("1 < 2\n\n\n3 > 1");
    });

    it("returns a cleaned message payload", () => {
        expect(parseChatMessagePayload({ message: "  <b>safe</b>\r\nmessage " })).toBe("safe\nmessage");
    });

    it("rejects empty messages after sanitization", () => {
        expect(() => parseChatMessagePayload({ message: "   <!--x--><b></b>   " })).toThrow(
            "กรุณาพิมพ์ข้อความก่อนส่ง"
        );
    });

    it("rejects messages longer than the configured limit", () => {
        expect(() =>
            parseChatMessagePayload({ message: "a".repeat(CHAT_MAX_MESSAGE_LENGTH + 1) })
        ).toThrow(`ข้อความต้องยาวไม่เกิน ${CHAT_MAX_MESSAGE_LENGTH} ตัวอักษร`);
    });
});
