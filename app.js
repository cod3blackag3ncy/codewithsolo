(() => {
  "use strict";
  const form = document.getElementById("lead-form");
  const status = document.getElementById("form-status");
  const submit = form?.querySelector('button[type="submit"]');
  const submitLabel = submit?.innerHTML ?? "";
  const service = form?.elements.namedItem("service");
  document.getElementById("year").textContent = String(new Date().getFullYear());

  function show(message, state) {
    status.textContent = message;
    status.dataset.state = state;
  }

  document.querySelectorAll("[data-offer]").forEach(link => {
    link.addEventListener("click", () => {
      if (service) service.value = link.dataset.offer;
    });
  });

  form?.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      show("Please complete the required fields and confirm we may reply.", "error");
      return;
    }
    const data = Object.fromEntries(new FormData(form).entries());
    if (!String(data.vision || "").trim() || !String(data.name || "").trim()) {
      show("Please enter your name and explain what you need.", "error");
      return;
    }
    const payload = {
      name: String(data.name || "").trim(),
      email: String(data.email || "").trim(),
      business: String(data.business || "").trim(),
      website: String(data.website || "").trim(),
      service: data.service,
      vision: String(data.vision || "").trim(),
      management: data.management,
      budget: data.budget,
      timeline: data.timeline,
      consent: data.consent === "on",
      company_fax: data.company_fax || ""
    };
    submit.disabled = true;
    submit.textContent = "Sending inquiry…";
    show("Connecting securely…", "pending");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success !== true) throw new Error("Delivery not confirmed");
      show("Your inquiry was received. Reference " + (result.reference || "") + ". We will review it and reply by email with the next step.", "success");
      form.reset();
    } catch (error) {
      show("We couldn't confirm delivery. Your information is still in the form. Please use the direct email link below instead.", "error");
      const contact = document.createElement("a");
      contact.href = "mailto:cod3blackagency@gmail.com?subject=" + encodeURIComponent("CodeWithSolo project inquiry — manual follow-up") + "&body=" + encodeURIComponent(
        "Name: " + payload.name + "\nEmail: " + payload.email + "\nBusiness: " + payload.business +
        "\nWebsite: " + payload.website + "\nService: " + payload.service +
        "\nManagement: " + payload.management + "\nBudget: " + payload.budget +
        "\nTimeline: " + payload.timeline + "\n\nProblem:\n" + payload.vision);
      contact.textContent = "Open a ready-to-send email";
      contact.style.display = "block";
      contact.style.marginTop = "8px";
      contact.style.color = "var(--accent)";
      status.appendChild(contact);
    } finally {
      clearTimeout(timeout);
      submit.disabled = false;
      submit.innerHTML = submitLabel;
    }
  });
})();

(() => {
  "use strict";
  const scenarios = {
    retail: {
      problem:"Orders arrive in different places. Availability and pickup timing are confusing.",
      solution:"One customer ordering path, consistent product availability, an operator dashboard and clear pickup or delivery updates. AI can help identify exceptions, draft responses and assist the team—while the underlying order rules remain deterministic.",
      metric:"Completed orders · failed checkouts · response time"
    },
    service: {
      problem:"New leads wait too long for a response, and follow-ups depend on someone remembering.",
      solution:"A focused intake form, customer pipeline and follow-up reminders. AI can summarize requests, draft personalized responses and flag unanswered leads. People approve commitments and high-impact actions.",
      metric:"Qualified inquiries · booking rate · time to first reply"
    },
    nonprofit: {
      problem:"Registration, member information and event updates are spread across disconnected tools.",
      solution:"A clear registration experience, appropriate staff permissions, event and member management, and updates. AI can help sort requests and prepare summaries, with privacy and human review built in.",
      metric:"Successful registrations · unresolved requests · staff time"
    }
  };
  const scenarioTabs = document.querySelectorAll("[data-scenario]");
  const problem = document.getElementById("scenario-problem");
  const solution = document.getElementById("scenario-solution");
  const metric = document.getElementById("scenario-metric");
  scenarioTabs.forEach(tab => tab.addEventListener("click", () => {
    const selected = scenarios[tab.dataset.scenario];
    if (!selected) return;
    scenarioTabs.forEach(x => {
      const active = x === tab;
      x.classList.toggle("active", active);
      x.setAttribute("aria-pressed", String(active));
    });
    problem.textContent = selected.problem;
    solution.textContent = selected.solution;
    metric.textContent = selected.metric;
  }));

  const projects = [...document.querySelectorAll(".project-card")];
  const count = document.getElementById("portfolio-count");
  document.querySelectorAll("[data-filter]").forEach(tab => tab.addEventListener("click", () => {
    const filter = tab.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach(x => {
      const active = x === tab;
      x.classList.toggle("is-active", active);
      x.setAttribute("aria-pressed", String(active));
    });
    let visible = 0;
    projects.forEach(project => {
      const show = filter === "all" || project.dataset.category === filter;
      project.hidden = !show;
      if (show) visible++;
    });
    count.textContent = visible + (visible === 1 ? " selected project" : " selected projects");
  }));

  document.querySelectorAll(".project-link[data-offer]").forEach(link => {
    link.addEventListener("click", () => {
      const service = document.getElementById("lead-form")?.elements.namedItem("service");
      if (service) service.value = link.dataset.offer;
    });
  });
})();
