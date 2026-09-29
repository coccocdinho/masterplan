import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireSession, fail, addLog } from "../../../lib/apiHelpers";
import { TOOLS, execTool, needsConfirm, previewUpdateTask, executeConfirmedUpdate } from "../../../lib/botTools";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "claude-opus-5-5";
const MAX_ROUNDS = 6;

const SYSTEM = `Bạn là trợ lý quản lý dự án trong ứng dụng nội bộ "Master Plan" của Ban Phát triển kinh doanh Bkav.
Bạn giúp người dùng: tạo dự án, tạo đầu việc, sửa đầu việc đã có, tra cứu/thống kê, và nhắc việc cần làm.
Trả lời ngắn gọn, tiếng Việt, đi thẳng vào việc. Khi liệt kê nhiều mục, dùng gạch đầu dòng.
Khi người dùng nói về một đầu việc để sửa mà không cho id, LUÔN gọi search_tasks trước để tìm đúng id; nếu tìm ra nhiều kết quả khớp, hỏi lại người dùng chọn cái nào thay vì đoán.
Mỗi lượt chỉ gọi tối đa một tool update_task — nếu cần sửa nhiều việc, làm từng việc một qua các lượt riêng.
Tạo dự án/đầu việc mới thì cứ làm luôn không cần hỏi lại (trừ khi thiếu thông tin bắt buộc). Sửa đầu việc đã có thì hệ thống sẽ tự hỏi người dùng xác nhận trước khi lưu — bạn cứ gọi tool update_task bình thường.
Không bịa số liệu hay tên dự án — luôn tra cứu qua tool trước khi trả lời về dữ liệu thật.`;

function client() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Chưa cấu hình ANTHROPIC_API_KEY.");
  return new Anthropic({ apiKey: key });
}

function findToolUse(messages, id) {
  const last = messages[messages.length - 1];
  if (last?.role !== "assistant" || !Array.isArray(last.content)) return null;
  return last.content.find((b) => b.type === "tool_use" && b.id === id) || null;
}

function allToolUseIds(messages) {
  const last = messages[messages.length - 1];
  if (last?.role !== "assistant" || !Array.isArray(last.content)) return [];
  return last.content.filter((b) => b.type === "tool_use").map((b) => b.id);
}

async function runSafe(tu, session) {
  try { return { type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(await execTool(tu.name, tu.input, session)) }; }
  catch (e) { return { type: "tool_result", tool_use_id: tu.id, content: e.message, is_error: true }; }
}

export async function POST(req) {
  const { session, res } = await requireSession();
  if (!session) return res;

  const body = await req.json().catch(() => ({}));
  let messages = Array.isArray(body.messages) ? body.messages : [];
  const { userText, confirm } = body;

  try {
    if (confirm) {
      const pending = findToolUse(messages, confirm.toolUseId);
      if (!pending) return fail("Yêu cầu xác nhận đã cũ, thử lại.");
      let resultContent;
      if (confirm.accepted) {
        const r = await executeConfirmedUpdate(pending.input);
        if (r.changed) await addLog(session, "bt", r.task.dauViec, `Trong dự án: ${r.task.project}`);
        resultContent = JSON.stringify(r);
      } else {
        resultContent = JSON.stringify({ ok: false, cancelled: true, message: "Người dùng đã huỷ, không lưu thay đổi." });
      }
      const otherResults = Array.isArray(confirm.otherResults) ? confirm.otherResults : [];
      const combined = [...otherResults, { type: "tool_result", tool_use_id: pending.id, content: resultContent }];
      // Every tool_use id from that turn must get exactly one tool_result, or the next API call errors.
      const need = new Set(allToolUseIds(messages));
      const have = new Set(combined.map((r) => r.tool_use_id));
      if (need.size !== have.size || [...need].some((id) => !have.has(id))) return fail("Thiếu kết quả cho một số thao tác, thử lại từ đầu.");
      messages = [...messages, { role: "user", content: combined }];
    } else if (userText?.trim()) {
      messages = [...messages, { role: "user", content: userText.trim() }];
    } else {
      return fail("Thiếu nội dung.");
    }

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const resp = await client().messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: SYSTEM,
        output_config: { effort: "low" },
        tools: TOOLS.map((t) => ({ ...t, strict: true })),
        messages,
      });

      messages = [...messages, { role: "assistant", content: resp.content }];

      if (resp.stop_reason !== "tool_use") {
        return NextResponse.json({ messages });
      }

      const toolUses = resp.content.filter((b) => b.type === "tool_use");
      const confirmCalls = toolUses.filter((tu) => needsConfirm(tu.name));

      if (confirmCalls.length) {
        const primary = confirmCalls[0];
        // Safe tools in the same turn run now; their results are held and sent together with the
        // confirm result once the human answers, since the API needs every tool_use in a turn
        // resolved in a single follow-up message.
        const otherResults = [];
        for (const tu of toolUses.filter((t) => t !== primary && !needsConfirm(t.name))) otherResults.push(await runSafe(tu, session));
        for (const tu of confirmCalls.slice(1)) {
          otherResults.push({ type: "tool_result", tool_use_id: tu.id, content: "Hệ thống chỉ xử lý một thay đổi cần xác nhận trong một lượt — hãy đề nghị sửa từng việc một.", is_error: true });
        }

        let preview;
        try { preview = await previewUpdateTask(primary.input); }
        catch (e) {
          messages = [...messages, { role: "user", content: [...otherResults, { type: "tool_result", tool_use_id: primary.id, content: e.message, is_error: true }] }];
          continue;
        }
        return NextResponse.json({ messages, pendingConfirm: { toolUseId: primary.id, otherResults, ...preview } });
      }

      const results = [];
      for (const tu of toolUses) results.push(await runSafe(tu, session));
      messages = [...messages, { role: "user", content: results }];
    }

    return NextResponse.json({ messages, error: "Đã vượt số bước xử lý cho phép, thử hỏi cụ thể hơn." });
  } catch (e) {
    return fail(e.message || "Lỗi trợ lý.", 500);
  }
}
