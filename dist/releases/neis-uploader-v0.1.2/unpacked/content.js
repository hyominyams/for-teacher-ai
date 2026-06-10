(() => {
  if (window.__forTeacherNeisUploaderLoaded) return;
  window.__forTeacherNeisUploaderLoaded = true;

  document.addEventListener("mousedown", (event) => {
    const target = event.target?.closest?.(".cl-textarea, textarea, [contenteditable='true'], input[type='text']");
    if (target) {
      window.__forTeacherLastEditable = target;
    }
  }, true);

  document.addEventListener("focusin", (event) => {
    const target = event.target?.closest?.(".cl-textarea, textarea, [contenteditable='true'], input[type='text']");
    if (target) {
      window.__forTeacherLastEditable = target;
    }
  }, true);

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "FORTEACHER_NEIS_UPLOAD") return;

    try {
      const { action, payload } = message;
      const records = payload?.records || [];
      const selector = payload?.selector || "textarea, [contenteditable='true'], input[type='text']";
      const delayMs = payload?.delayMs || 0;

      if (action === "fillFocused") {
        const target = findFocusedEditable(selector);
        if (!target) {
          sendResponse({ ok: false, message: "현재 선택된 입력칸을 찾지 못했습니다." });
          return;
        }
        setEditableValue(target, records[0]?.text || "");
        sendResponse({ ok: true, message: "현재 입력칸에 첫 항목을 입력했습니다." });
        return;
      }

      if (action === "fillFromFocused") {
        fillFromFocused(selector, records, delayMs).then((count) => {
          sendResponse({ ok: true, message: `현재 칸부터 ${count}개 항목을 입력했습니다.` });
        });
        return true;
      }

      if (action === "fillVisible") {
        const targets = findVisibleEditables(selector);
        const count = Math.min(targets.length, records.length);
        for (let i = 0; i < count; i += 1) {
          setEditableValue(targets[i], records[i].text);
        }
        sendResponse({ ok: true, message: `${count}개 입력칸에 값을 넣었습니다.` });
        return;
      }

      sendResponse({ ok: false, message: "알 수 없는 실행 방식입니다." });
    } catch (error) {
      sendResponse({ ok: false, message: `오류: ${error.message}` });
    }
  });

  function findFocusedEditable(selector) {
    if (window.__forTeacherLastEditable?.matches?.(selector)) {
      return window.__forTeacherLastEditable;
    }

    const active = document.activeElement;
    if (active && isEditable(active) && active.matches(selector)) return active;
    const activeParent = active?.closest?.(selector);
    if (activeParent && isEditable(activeParent)) return activeParent;

    const selected = document.getSelection()?.anchorNode;
    const element = selected?.nodeType === Node.ELEMENT_NODE ? selected : selected?.parentElement;
    return element?.closest?.(selector) || null;
  }

  async function fillFromFocused(selector, records, delayMs) {
    const targets = findVisibleEditables(selector);
    const focused = findFocusedEditable(selector);
    const startIndex = focused ? targets.indexOf(focused) : -1;
    if (startIndex < 0) return 0;

    const availableTargets = targets.slice(startIndex);
    const count = Math.min(availableTargets.length, records.length);
    for (let i = 0; i < count; i += 1) {
      setEditableValue(availableTargets[i], records[i].text);
      if (delayMs > 0) await sleep(delayMs);
    }
    return count;
  }

  function findVisibleEditables(selector) {
    return [...document.querySelectorAll(selector)]
      .filter(isEditable)
      .filter(isVisible)
      .sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return ar.top - br.top || ar.left - br.left;
      });
  }

  function isEditable(element) {
    if (!(element instanceof HTMLElement)) return false;
    if (element.matches(".cl-textarea")) return !element.classList.contains("cl-disabled");
    if (element.matches("textarea, input")) return !element.disabled && !element.readOnly;
    return element.isContentEditable;
  }

  function isVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  }

  function setEditableValue(element, value) {
    element.click();
    element.focus();

    if (element.matches(".cl-textarea")) {
      const textElement = element.querySelector(".cl-text") || element;
      textElement.textContent = value;
      textElement.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true, inputType: "insertText" }));
      dispatchEditableEvents(element);
      return;
    }

    if (element.isContentEditable) {
      element.textContent = value;
      dispatchEditableEvents(element);
      return;
    }

    const prototype = element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    valueSetter?.call(element, value);
    dispatchEditableEvents(element);
  }

  function dispatchEditableEvents(element) {
    element.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      composed: true,
      inputType: "insertText"
    }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("blur", { bubbles: true }));
    element.focus();
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
})();
