(function(){
  function setStatus(form, message){
    const status = form.querySelector("[data-response-status]");
    if(status){
      status.textContent = message;
    }
  }

  function collectResponses(form){
    const data = {};
    const fields = form.querySelectorAll("input, select, textarea");
    fields.forEach((field) => {
      if(!field.name || field.type === "hidden") return;
      if(field.type === "checkbox"){
        data[field.name] = field.checked;
      } else {
        data[field.name] = field.value;
      }
    });
    return data;
  }

  function restoreResponses(form, data){
    Object.entries(data).forEach(([name, value]) => {
      const field = form.elements[name];
      if(!field) return;
      if(field.type === "checkbox"){
        field.checked = Boolean(value);
      } else {
        field.value = value;
      }
    });
  }

  function responseText(form){
    const title = form.dataset.programTitle || "BUSI Curriculum Responses";
    const lines = [title, "Generated: " + new Date().toLocaleString(), ""];
    form.querySelectorAll(".response-panel").forEach((panel) => {
      const heading = panel.querySelector("h3, h4, legend");
      if(heading){
        lines.push(heading.textContent.trim());
      }
      panel.querySelectorAll("label").forEach((label) => {
        const field = label.querySelector("input, select, textarea");
        const text = label.querySelector("span") ? label.querySelector("span").textContent.trim() : label.textContent.trim();
        if(!field || !field.name || field.type === "hidden") return;
        const value = field.type === "checkbox" ? (field.checked ? "Yes" : "No") : field.value.trim();
        lines.push(text + ":");
        lines.push(value || "[blank]");
        lines.push("");
      });
      lines.push("");
    });
    return lines.join("\n");
  }

  function downloadResponses(form){
    const blob = new Blob([responseText(form)], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = form.dataset.downloadName || "busi-curriculum-responses.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  }

  function initForm(form){
    const storageKey = form.dataset.storageKey;
    if(storageKey){
      try{
        const saved = localStorage.getItem(storageKey);
        if(saved){
          restoreResponses(form, JSON.parse(saved));
          setStatus(form, "Draft restored from this browser.");
        }
      } catch(error){
        setStatus(form, "Draft could not be restored in this browser.");
      }
    }

    form.addEventListener("click", (event) => {
      const action = event.target && event.target.dataset ? event.target.dataset.action : "";
      if(!action) return;

      if(action === "save"){
        if(storageKey){
          localStorage.setItem(storageKey, JSON.stringify(collectResponses(form)));
          setStatus(form, "Draft saved in this browser. Submit or download a copy before certificate review.");
        }
      }

      if(action === "download"){
        downloadResponses(form);
        setStatus(form, "Response copy downloaded.");
      }

      if(action === "print"){
        setStatus(form, "Use your browser print dialog to print or save as PDF.");
        window.print();
      }
    });
  }

  document.querySelectorAll(".curriculum-response-form").forEach(initForm);
})();
