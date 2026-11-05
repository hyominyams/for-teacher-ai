import { assertEditableWorkLog, workLogFailure } from "@/lib/server/work-log-access";
import { parsePolishRequest } from "@/lib/class-polish";
import { classPolishBudgets, reviewClassPolish } from "@/lib/server/class-polish";
import { creditFailure, creditUser, readAIJson, runCreditJob, CreditError } from "@/lib/server/credits";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
    try {
        const user = await creditUser(req);
        const raw = await readAIJson(req);
        try { await assertEditableWorkLog(req, raw.workLogId); } catch (error) { return workLogFailure(error); }
        let input;
        try { input = parsePolishRequest(raw); }
        catch (error) { throw new CreditError("INVALID_INPUT", error instanceof Error ? error.message : "입력을 확인해주세요."); }
        return await runCreditJob(req, user, "polish", raw, classPolishBudgets(input.category, input.records), async complete => ({
            ...await reviewClassPolish(input.category, input.records, "", undefined, complete),
            batchId: crypto.randomUUID(),
        }));
    } catch (error) { return creditFailure(error); }
}
