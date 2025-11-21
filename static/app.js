const promptButton = document.getElementById("promptButton");
const promptEl = document.getElementById("prompt");
const timerEl = document.getElementById("timer");
const statusEl = document.getElementById("statusText");
const timerSeconds = Number(document.body.dataset.timer ?? 5);
const promptCountEl = document.getElementById("promptCount");
const activeTeamNameEl = document.getElementById("activeTeamName");

const teamForm = document.getElementById("teamForm");
const teamInput = document.getElementById("teamName");
const teamListEl = document.getElementById("teamList");
const successButton = document.getElementById("successButton");
const failButton = document.getElementById("failButton");

const addPromptForm = document.getElementById("addPromptForm");
const newPromptInput = document.getElementById("newPrompt");
const promptSaveStatus = document.getElementById("promptSaveStatus");

let countdownInterval = null;
let teamIdCounter = 0;

const state = {
    teams: [],
    currentTeamIndex: 0,
    roundActive: false,
    promptCount: Number(document.body.dataset.promptCount ?? 0),
};

function setStatus(message, tone = "info") {
    statusEl.textContent = message;
    statusEl.dataset.tone = tone;
}

function setPrompt(text) {
    promptEl.textContent = text;
}

function updateTimerDisplay(value) {
    if (typeof value === "number") {
        timerEl.textContent = value.toString().padStart(2, "0");
        return;
    }
    timerEl.textContent = value;
}

function clearTimer() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
}

function startTimer(seconds) {
    clearTimer();
    let remaining = seconds;
    updateTimerDisplay(remaining);

    countdownInterval = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
            updateTimerDisplay(0);
            setStatus("Zeit ist um! Vergleicht eure Antworten.", "done");
            clearTimer();
            return;
        }
        updateTimerDisplay(remaining);
    }, 1000);
}

function updatePromptCount(value) {
    state.promptCount = value;
    if (promptCountEl) {
        promptCountEl.textContent = value;
    }
}

function toggleResultButtons(disabled) {
    successButton.disabled = disabled;
    failButton.disabled = disabled;
}

function updateActiveTeamDisplay() {
    if (!state.teams.length) {
        activeTeamNameEl.textContent = "Noch keine Teams";
        return;
    }
    const team = state.teams[state.currentTeamIndex];
    activeTeamNameEl.textContent = team.name;
}

function renderTeams() {
    teamListEl.innerHTML = "";
    if (!state.teams.length) {
        const empty = document.createElement("li");
        empty.className = "team-empty";
        empty.textContent = "Noch keine Teams angelegt.";
        teamListEl.appendChild(empty);
        updateActiveTeamDisplay();
        return;
    }

    state.teams.forEach((team, index) => {
        const li = document.createElement("li");
        if (index === state.currentTeamIndex) {
            li.classList.add("active");
        }

        const meta = document.createElement("div");
        meta.className = "team-meta";

        const nameEl = document.createElement("span");
        nameEl.className = "team-name";
        nameEl.textContent = team.name;

        const scoreEl = document.createElement("span");
        scoreEl.className = "team-score";
        scoreEl.textContent = `${team.score} Pkt`;

        meta.appendChild(nameEl);
        meta.appendChild(scoreEl);

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "team-remove";
        removeBtn.dataset.index = String(index);
        removeBtn.textContent = "✕";

        li.appendChild(meta);
        li.appendChild(removeBtn);

        teamListEl.appendChild(li);
    });

    updateActiveTeamDisplay();
}

function addTeam(name) {
    const trimmed = name.trim();
    if (!trimmed) {
        setStatus("Teamname darf nicht leer sein.", "error");
        return;
    }

    const exists = state.teams.some((team) => team.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
        setStatus("Teamname existiert bereits.", "error");
        return;
    }

    state.teams.push({ id: `team-${teamIdCounter++}`, name: trimmed, score: 0 });
    if (state.teams.length === 1) {
        state.currentTeamIndex = 0;
    }
    renderTeams();
    setStatus(`Team ${trimmed} ist bereit!`, "done");
}

function removeTeam(index) {
    if (state.roundActive) {
        setStatus("Beende zuerst die aktuelle Runde, bevor Du Teams entfernst.", "error");
        return;
    }

    if (Number.isNaN(index) || index < 0 || index >= state.teams.length) {
        return;
    }

    state.teams.splice(index, 1);
    if (state.currentTeamIndex >= state.teams.length) {
        state.currentTeamIndex = 0;
    }
    renderTeams();
}

function advanceTeam() {
    if (!state.teams.length) {
        state.currentTeamIndex = 0;
        updateActiveTeamDisplay();
        return;
    }
    state.currentTeamIndex = (state.currentTeamIndex + 1) % state.teams.length;
    updateActiveTeamDisplay();
}

function resetRound() {
    state.roundActive = false;
    toggleResultButtons(true);
    clearTimer();
    updateTimerDisplay("--");
}

async function fetchPrompt() {
    if (!state.teams.length) {
        setStatus("Lege zuerst mindestens ein Team an.", "error");
        return;
    }
    if (state.roundActive) {
        setStatus("Diese Runde läuft noch. Trage erst das Ergebnis ein.", "error");
        return;
    }

    const team = state.teams[state.currentTeamIndex];
    promptButton.disabled = true;
    toggleResultButtons(true);
    setStatus(`Frage für ${team.name} wird geladen...`);

    try {
        const response = await fetch("/api/prompt");
        if (!response.ok) {
            throw new Error("Server liefert keine Frage.");
        }
        const data = await response.json();
        setPrompt(data.prompt);
        updatePromptCount(Number(data.totalPrompts ?? state.promptCount));
        startTimer(Number(data.timerSeconds ?? timerSeconds));
        setStatus(`Team ${team.name} ist dran.`, "info");
        state.roundActive = true;
        toggleResultButtons(false);
    } catch (error) {
        console.error(error);
        setStatus("Ups, die Frage konnte nicht geladen werden. Versuch's nochmal.", "error");
        updateTimerDisplay("--");
        promptButton.disabled = false;
    }
}

function handleRoundResult(success) {
    if (!state.roundActive) {
        return;
    }
    const team = state.teams[state.currentTeamIndex];
    if (success) {
        team.score += 1;
        setStatus(`Team ${team.name} holt einen Punkt!`, "done");
    } else {
        setStatus(`Diesmal keine Übereinstimmung für ${team.name}.`, "info");
    }
    renderTeams();
    resetRound();
    advanceTeam();
    promptButton.disabled = false;
}

function setPromptSaveStatus(message, tone = "info") {
    if (!promptSaveStatus) {
        return;
    }
    promptSaveStatus.textContent = message;
    promptSaveStatus.dataset.tone = tone;
}

async function handlePromptSave(event) {
    event.preventDefault();
    const value = newPromptInput.value.trim();
    if (value.length < 4) {
        setPromptSaveStatus("Prompt ist zu kurz.", "error");
        return;
    }

    setPromptSaveStatus("Speichere Prompt...");

    try {
        const response = await fetch("/api/prompt", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ prompt: value }),
        });

        if (!response.ok) {
            const message = response.status === 409 ? "Prompt existiert bereits." : "Prompt konnte nicht gespeichert werden.";
            throw new Error(message);
        }

        const data = await response.json();
        newPromptInput.value = "";
        updatePromptCount(Number(data.totalPrompts ?? state.promptCount));
        setPromptSaveStatus("Gespeichert! Danke für Deinen Beitrag.", "success");
        setStatus("Neuer Prompt ergänzt den Fragenpool.", "done");
    } catch (error) {
        console.error(error);
        setPromptSaveStatus(error.message ?? "Prompt konnte nicht gespeichert werden.", "error");
    }
}

promptButton?.addEventListener("click", fetchPrompt);

successButton?.addEventListener("click", () => handleRoundResult(true));
failButton?.addEventListener("click", () => handleRoundResult(false));

teamForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    addTeam(teamInput.value);
    teamInput.value = "";
    teamInput.focus();
});

teamListEl?.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.dataset.index) {
        removeTeam(Number(target.dataset.index));
    }
});

addPromptForm?.addEventListener("submit", handlePromptSave);

toggleResultButtons(true);
renderTeams();
updatePromptCount(state.promptCount);
updateTimerDisplay("--");
setStatus("Bereit? Lege zuerst Teams fest.");
