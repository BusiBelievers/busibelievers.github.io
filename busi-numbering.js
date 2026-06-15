(function () {
  function pad(value, length) {
    return String(value).padStart(length, "0");
  }

  function todayStamp() {
    const now = new Date();
    return [
      now.getFullYear(),
      pad(now.getMonth() + 1, 2),
      pad(now.getDate(), 2)
    ].join("");
  }

  function todayIso() {
    return new Date().toISOString().split("T")[0];
  }

  function nextNumber(prefix, storageName) {
    const date = todayStamp();
    const key = `busi:${storageName || prefix}:${date}`;
    const next = Number(localStorage.getItem(key) || "0") + 1;
    localStorage.setItem(key, String(next));
    return `BUSI-${prefix}-${date}-${pad(next, 4)}`;
  }

  function collectUsedCaseNumbers() {
    const used = new Set();
    try {
      const cases = JSON.parse(localStorage.getItem("busiCases") || "[]");
      if (Array.isArray(cases)) {
        cases.forEach((record) => {
          const value = String(record.caseID || record.case_number || "").match(/^BUSI-(\d{1,3})$/);
          if (value) used.add(Number(value[1]));
        });
      }
    } catch (_) {
    }
    return used;
  }

  function nextCaseNumber() {
    const used = collectUsedCaseNumbers();
    let current = Number(localStorage.getItem("busiCaseSequence") || "0");

    for (let value = 1; value <= 999; value += 1) {
      const candidate = current + value;
      const normalized = ((candidate - 1) % 999) + 1;
      if (!used.has(normalized)) {
        localStorage.setItem("busiCaseSequence", String(normalized));
        return `BUSI-${pad(normalized, 3)}`;
      }
    }

    return "";
  }

  function assignIfEmpty(id, value) {
    const field = document.getElementById(id);
    if (field && !field.value) {
      field.value = value;
    }
  }

  function initParticipantReference() {
    const number = nextCaseNumber();
    assignIfEmpty("participantReference", number);
    assignIfEmpty("participantReferenceDisplay", number);
    assignIfEmpty("dateSigned", todayIso());
  }

  function initInvoice(prefix) {
    const number = nextNumber(prefix, `invoice:${prefix}`);
    assignIfEmpty("invoiceNumber", number);
    assignIfEmpty("invoiceDate", todayIso());
    assignIfEmpty("agreementDate", todayIso());
  }

  window.BUSINumbering = {
    initParticipantReference,
    initInvoice,
    nextNumber,
    nextCaseNumber,
    todayIso
  };
})();
