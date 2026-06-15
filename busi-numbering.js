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

  function assignIfEmpty(id, value) {
    const field = document.getElementById(id);
    if (field && !field.value) {
      field.value = value;
    }
  }

  function initParticipantReference() {
    const number = nextNumber("P", "participant");
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
    todayIso
  };
})();
