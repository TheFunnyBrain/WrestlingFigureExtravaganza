let showExpandedGameListForEntries = true;
let entryTabsBeingShown = [];

const adamGames =
    [
        "Smackdown 1",
        "Royal Rumble (2000)",
        "Smackdown 2",
        "Just Bring It",
        "Road to Wrestlemania",
        "Wrestlemania X8",
        "Shut Your Mouth",
        "Crush Hour",
        "Here Comes the Pain"
    ]


function OnEntriesFilterChange() {
    renderEntries();
}

function SearchForUID(uid) {
    entryFilterInputs.displayName.value = `uid:${uid}`;
    OnEntriesFilterChange();
}

function setEntryTabs(tabIds){
    entryTabsBeingShown = tabIds.slice();
    showEntryTabs();
}

function toggleEntryTabs(tabIds) {

    tabIds.forEach(tabId =>
    {
        if (arrayContains(tabId, entryTabsBeingShown)) {
            entryTabsBeingShown = entryTabsBeingShown.filter(function (a) { return a !== tabId })
        }
        else {
            entryTabsBeingShown.push(tabId);
        }
    });

    showEntryTabs();

}


function resetEntry(form) {
    const originalStr = form.getAttribute("data-original").replace(/&apos;/g, "'");
    const original = JSON.parse(originalStr);

    form.querySelector('[name="displayName"]').value = original["Display Name"];
    form.querySelector('[name="notes"]').value = original["Notes"] || "";
    form.querySelector('[name="status"]').checked = !!original["Status"];
    form.querySelector('[name="legend"]').checked = !!original["Legend"];
    form.querySelector('[name="inThePost"]').checked = !!original["In The Post"];
    form.querySelector('[name="figureDetails"]').checked = !!original["Figure Details"];
    form.querySelector('[name="personalRanking"]').checked = !!original["Personal Ranking"];
    form.parentElement.classList.remove("unsaved");
}

function trackFormChanges(form) {
    const original = JSON.parse(form.getAttribute("data-original").replace(/&apos;/g, "'"));

    const checkForChanges = () => {
        const current = {
            "Display Name": form.displayName.value,
            "Notes": form.notes.value,
            "Status": form.status.checked,
            "Legend": form.legend.checked,
            "In The Post": form.inThePost.checked,
            "Figure Details": form.figureDetails.value,
            "Personal Ranking": form.personalRanking.value
        };

        const changed = Object.keys(current).some(key => {
            return current[key] != original[key];
        });

        form.parentElement.classList.toggle("unsaved", changed);
    };

    form.querySelectorAll("input").forEach(input => {
        input.addEventListener("input", checkForChanges);
        input.addEventListener("change", checkForChanges);
    });
}

function updateEntry(event, game, uid, index) {
    event.preventDefault();

    const form = event.target;
    const displayName = form.displayName.value.trim();
    const notes = form.notes.value.trim();
    const status = form.status.checked;
    const legend = form.legend.checked;
    const inThePost = form.inThePost.checked;
    const figureDetails = form.figureDetails.value.trim();
    const personalRanking = form.personalRanking.value;
    form.parentElement.classList.remove("unsaved");

    if (!displayName) {
        alert("Display name is required.");
        return;
    }

    if (!games[game]) {
        alert("Game not found.");
        return;
    }

    const entries = games[game]["Roster"];

    if (index >= 0 && index < entries.length) {
        entries[index]["Display Name"] = displayName;
        entries[index]["Notes"] = notes;
        entries[index]["Status"] = status;
        entries[index]["Legend"] = legend;
        entries[index]["In The Post"] = inThePost;
        entries[index]["Figure Details"] = figureDetails;
        entries[index]["Personal Ranking"] = personalRanking;
    }

    UpdateJsonInputFieldAndResubmit();
}

function deleteEntry(game, uid, displayName) {
    if (!confirm(`Delete ${displayName} from ${game}?`)) return;
    if (!games[game]["Roster"]) return;

    games[game]["Roster"] = games[game]["Roster"].filter(entry => {
        const matchUID = uid ? entry.UID === uid : true;
        return !(matchUID && entry["Display Name"] === displayName);
    });

    UpdateJsonInputFieldAndResubmit();
}

function showEntryTabs() {
    for (const gameID in games) {
        document.getElementById("expandGameListEntries").innerText = showExpandedGameListForEntries ? "Show all" : "Show selected";

        if (entryTabsBeingShown.length == 0 || arrayContains(gameID, entryTabsBeingShown)) {

            
            document.getElementById(`EntryTabButton${gameID}`).classList.add('tab-btn-active');
            document.getElementById(`EntryTabButton${gameID}`).classList.remove('tab-btn');
            document.getElementById(`Entry${gameID}Content`).style.display = "block";
            if (entryTabsBeingShown.length == 0) {
                document.getElementById(`EntryTabButton${gameID}`).style.display = showExpandedGameListForEntries ? "" : "none";
            }
            else {
                document.getElementById(`StatsTabButton${gameID}`).style.display = "";
            }
        }
        else {
            document.getElementById(`Entry${gameID}Content`).style.display = "none";
            document.getElementById(`EntryTabButton${gameID}`).classList.remove('tab-btn-active');
            document.getElementById(`EntryTabButton${gameID}`).classList.add('tab-btn');
            document.getElementById(`EntryTabButton${gameID}`).style.display = showExpandedGameListForEntries ? "" : "none";
        }
    }
}

function ToggleExpandedGamesListForEntries() {
    showExpandedGameListForEntries = !showExpandedGameListForEntries;
    showEntryTabs();
}

const entryFilterInputs =
{
    status: document.getElementById("entryStatusFilter"),
    displayName: document.getElementById("entryNameFilter"),
    legend: document.getElementById("entryLegendFilter"),
    inThePost: document.getElementById("entryPostalFilter")
}

function renderEntries() {

    const output = document.getElementById("rosterView");
    output.innerHTML = "";

    const entryFilter =
    {
        "Status": entryFilterInputs.status.value,
        "Display Name": entryFilterInputs.displayName.value.trim().toLowerCase(),
        "Legend": entryFilterInputs.legend.value,
        "In The Post": entryFilterInputs.inThePost.value
    };

    //All games tab
    const tabs = document.getElementById("entryTabs");
    tabs.innerHTML = "";

    MakeExpandGameListToggle(tabs, "expandGameListEntries", () => ToggleExpandedGamesListForEntries());

    CreateTabButton("All Games", () => setEntryTabs([]), "EntryTabButton", tabs);

    CreateTabButton("Adam's Filter", () => setEntryTabs(adamGames), "EntryTabButton", tabs)

    for (const game in games) {
        const roster = games[game]["Roster"];
        const section = document.createElement("div");

        CreateTabButton(game, () => toggleEntryTabs([game]), "EntryTabButton", tabs);


        //Header
        section.id = `Entry${game}Content`;
        section.innerHTML = `<h2>${game}</h2>`;

        let anyMatch = false;

        if (roster) {

            const sortedRoster = [...roster].sort((a, b) => {
                return a["Display Name"]?.localeCompare(b["Display Name"]);
            });


            sortedRoster.forEach((entry, index) => {
                const realIndex = roster.indexOf(entry);
                if (
                    WrestlerShouldBeShown(entry, entryFilter)
                ) {
                    anyMatch = true;
                    const div = document.createElement("div");
                    div.classList.add("entry");

                    const uid = entry["UID"] ?? "";
                    const safeUID = uid.replace(/"/g, '&quot;');
                    const safeName = entry["Display Name"]?.replace(/"/g, '&quot;');
                    const safeData = JSON.stringify(entry).replace(/"/g, '&quot;');
                    const safeGame = game.replace(/"/g, '&quot;');

                    div.innerHTML = `
    <form onsubmit="updateEntry(event, '${safeGame}', '${safeUID}', ${realIndex})" data-original='${JSON.stringify(entry).replace(/'/g, "&apos;")}'>            
            <div class="inline-form"><label>
              Name:
              <input type="text" name="displayName" value="${entry["Display Name"] || ""}"">
            </label></div>
            <div class="inline-form"><label>
              Notes:
              <input type="text" name="notes" value="${entry["Notes"] || ""}"">
            </label></div>
            <div class="inline-form"><label>
              Status:
              <input type="checkbox" name="status" ${entry["Status"] ? "checked" : ""}>
            </label></div>
            <div class="inline-form"><label>
                Legend:
                <input type="checkbox" name="legend" ${entry["Legend"] ? "checked" : ""}>
            </label></div>
            <div class="inline-form"><label>
                In the post?
                <input type="checkbox" name="inThePost" ${entry["In The Post"] ? "checked" : ""}>
            </label></div>
            <div class="inline-form"><label>
                Figure details:
                <input type="text" name="figureDetails" value="${entry["Figure Details"] || ""}"">
            </label></div>
            <div class="inline-form"><label>
                Personal ranking:
                <input type="number" name = "personalRanking" value = ${entry["Personal Ranking"] || ""}>
            </label></div>
            ${uid !== "" ? `<strong>UID:</strong> ${safeUID} (${ShowUIDStatusAverageInColourText(safeUID)})<br>` : "No ID"}<br>
            <button type="submit">Update</button>
            <button type="button" onclick="deleteEntry('${safeGame}', '${safeUID}', '${safeName}')">Delete</button>
        <button type="button" onclick="resetEntry(this.form, '${safeGame}', ${realIndex})">Reset</button>
        <button type="button"><a href="https://wrestlingfiguredatabase.com/search?q=${safeName}&options%5Bprefix%5D=last" target="_blank">Wrestling Figure Database</a></button>
        <button type="button"><a href="https://www.ebay.co.uk/sch/i.html?_nkw=${safeName}+wrestling+figure" target="_blank">eBay</a></button>
        
                    </form>
        `;
                    const form = div.querySelector("form");
                    trackFormChanges(form);
                    section.appendChild(div);
                }
            });
        }
        output.appendChild(section);
    }
    showEntryTabs();
}
