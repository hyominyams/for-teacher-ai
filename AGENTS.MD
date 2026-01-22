# For Teacher AI - Agent Notes

## Product Summary
For Teacher AI is an AI-assisted web app that helps teachers draft student record comments.
Phase 1 centers on the "행동특성 및 종합의견" (behavior traits & overall opinion) workflow.

## Scope (Phase 1)
- Cut writing time for a class size around 30 students.
- Full behavior comment generation: edit, copy, save, and Excel export.
- Data schema prepared for future Chrome extension integration.

## Out of Scope (Phase 1)
- Real generation for other categories (UI only).
- Chrome extension and NEIS auto-input.
- Payments and history/versioning.

## Routes and UX
- `/`: marketing landing page (done).
- `/login`, `/signup`: auth UI (logic integration pending).
- `/app`: dashboard hub with 4 cards:
  - 행동특성 및 종합의견 (active)
  - 교과 세특 (Waiting)
  - 창의적 체험활동 (Waiting)
  - 업무 문서 (Waiting)
  - Footer area: "Paste directly into NEIS" guidance and extension download link.
- `/app/behavior`: split layout with independent scroll (left inputs/options, right results).

## Behavior Workflow (FR)
1. Student slots:
   - Select 1-40 students; create slots dynamically.
   - Slot includes checkbox, number, keyword tags (min 2), and a random keyword button
     that inserts 2 unique keywords from a predefined pool.
   - Number swap UI swaps keyword/result data between two slots.
2. Generation options:
   - Char limit radios: 100 / 200 / 300.
   - Buttons: generate all or selected students.
   - Per-slot API calls; show progress "Generating... i/N".
   - Failures show error state and a regenerate button.
3. Results:
   - Card with number, textarea, live character count.
   - Actions: copy to clipboard (toast), manual edits persist, regenerate keeps keywords.
4. Save/Export:
   - Save by upserting category `behavior` to DB.
   - Excel export with columns `번호 | 행동특성 및 종합의견`,
     include empty results and keep 1..N order.

## Data and API
- `saved_results` table:
  - `user_id` (RLS enforced)
  - `category` (e.g., `behavior`)
  - `data` JSONB, shape:
    ```json
    {
      "students": [
        { "number": 1, "keywords": ["diligent", "leadership"], "result": "..." },
        { "number": 2, "keywords": [], "result": null }
      ],
      "options": { "charLimit": 200 },
      "metadata": { "totalStudents": 30, "savedAt": "..." }
    }
    ```
- APIs:
  - `POST /api/generate` for text generation.
  - `POST /api/results` for user/category upsert.
  - `GET /api/results` to fetch saved data.

## Principles
- Store no student names; identify only by number.
- Work pages favor readability and speed over visual flash.
- Keep schema fixed for future category expansion.
