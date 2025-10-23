const statsFilterInputs =
{
    status: document.getElementById("statsStatusFilter"),
    legend: document.getElementById("statsLegendFilter"),
    inThePost: document.getElementById("statsPostalFilter")
}

function renderStats() {
    const statsFilter =
    {
        "Status": statsFilterInputs.status.value,
        "Display Name": "", //we don't use this in stats mode
        "Legend": statsFilterInputs.legend.value,
        "In The Post": statsFilterInputs.inThePost.value
    };

    //game tab creation
    const tabs = document.getElementById("statsTabs");
    tabs.innerHTML = "";
    MakeExpandGameListToggle(tabs, "expandGameListStats", () => ToggleExpandedGamesListForStats());

    CreateTabButton("All Games", () => setStatsTabs([]), "StatsTabButton", tabs);

    CreateTabButton("Adam's Filter", () => setStatsTabs(adamGames), "StatsTabButton", tabs);

    const wrestlerScores = {}; // uid -> { missing, total, name, missingName } //sometimes a specific gimmick name is missing - e.g. gregory helms, not the hurricane
    const gameAverages = {}

    for (const game in games) {
        //Tab HTML
        CreateTabButton(game, () => toggleStatsTabs([game]), "StatsTabButton", tabs);

        if (game != "Misc/Non-Game") {
            //Do we care about this game
            if (statsTabsBeingShown.length == 0 || arrayContains(game, statsTabsBeingShown)) {

                if (games[game]["Roster"]) {
                    const sortedRoster = [...games[game]["Roster"]].sort((a, b) => {
                        return a["Display Name"]?.localeCompare(b["Display Name"]);
                    });

                    const average = { "got": 0, "total": 0 }

                    sortedRoster.forEach((entry, index) => {
                        if (WrestlerShouldBeShown(entry, statsFilter)) {

                            const uid = entry["UID"];
                            if (!uid) return; // Skip if no UID - don't worry, return exits the anonymous function for this one wrestler, not the entire loop

                            //I need it ranking - also total is used for appearance counting
                            wrestlerScores[uid] = wrestlerScores[uid] ?? { missing: 0, total: 0, name: entry["Display Name"] };
                            wrestlerScores[uid].total += 1; // it appeared
                            average["total"] += 1;
                            if (!entry.Status) {
                                wrestlerScores[uid].missing += 1; //I have it, add to the total
                                wrestlerScores[uid].missingName = wrestlerScores[uid].missingName ?? entry["Display Name"]
                            }
                            else {
                                average["got"] += 1;
                            }
                        }
                    })

                    gameAverages[game] = average["total"] != 0 ? Math.round((average["got"] / average["total"]) * 100) : 100;
                }
                else {
                    gameAverages[game] = 100;
                }
            }
        }
    };


    const statsContainer = document.getElementById("statsContainer");
    statsContainer.innerHTML = "";

    const gameStatsDiv = createStatsListcontainer(statsContainer, "Game Stats", "gameRankings")
    let listDiv = gameStatsDiv.appendChild(document.createElement("ol"))
    let sortedGames = Object.entries(gameAverages).sort((a, b) => b[1] - a[1]);

    sortedGames.forEach((gameEntry) => {
        const colorHex = getPercentageColor(gameEntry[1]);
        AppendName(listDiv, `<span style="color: ${colorHex}">${gameEntry[0]}</span> - ${gameEntry[1]}%`);
    });

    if (statsTabsBeingShown.length === 1) {
        if (arrayContains(statsTabsBeingShown, "Misc/Non-Game")) {

            gameStatsDiv.innerHTML = "Pick a game to see stats (misc isn't a game)"
            UpdateStatsTabCSS(); // apply highlight effect if being displayed
            return;
        }
    }
    else {
        //most in-game appearances
        const appearanceRankingCount = 10;
        const mostAppearancesDiv = createStatsListcontainer(statsContainer, `Top ${appearanceRankingCount} By Appearance Count`, "mostWrestlerAppearances")
        listDiv = mostAppearancesDiv.appendChild(document.createElement("ol"))
        // Convert to array of [uid, count] pairs
        let sortedUIDs = Object.entries(wrestlerScores)
            .sort((a, b) => b[1].total - a[1].total) //Sort descending by count
            .slice(0, appearanceRankingCount);



        sortedUIDs.forEach(([uid, count], index) => {
            const colorHex = getPercentageColor(((wrestlerScores[uid].total - wrestlerScores[uid].missing) / wrestlerScores[uid].total) * 100);
            AppendClickableName(listDiv, `<span style="color: ${colorHex}">${count.name}</span> (${count.total} appearances)`, uid);
        });
    }


    //biggest score = "I need it" ranking
    const biggestScoreDiv = createStatsListcontainer(statsContainer, "Top __ to Watch For!", "topScores")
    listDiv = biggestScoreDiv.appendChild(document.createElement("ol"))
    // Convert to array of [uid, missing] and sort
    sortedUIDs = Object.entries(wrestlerScores)
        .map(([uid, { missing, total, name, missingName }]) => { return [uid, missing, total, name, missingName]; }) //subtract owned as I'm interested in the ones that I don't have for this
        .sort((a, b) => b[1] - a[1]) // Sort by missing count

    let counter = 0;
    sortedUIDs.forEach(([uid, missing, total, name, missingName], index) => {

        if (missing > 0) {
            const colorHex = getPercentageColor(((wrestlerScores[uid].total - wrestlerScores[uid].missing) / wrestlerScores[uid].total) * 100);

            if (missingName !== undefined && missingName != name) {
                AppendClickableName(listDiv, `<span style="color: ${colorHex}">${missingName} (aka ${name})</span> — Missing ${missing}/${total}`, uid);
            }
            else {
                AppendClickableName(listDiv, `<span style="color: ${colorHex}">${name}</span> — Missing ${missing}/${total}`, uid);
            }
            counter++;
        }
    });

    if (counter > 0) {
        biggestScoreDiv.parentElement.querySelector("h3").innerText = `Here's ${counter} to watch for!`;
    }
    else {
        biggestScoreDiv.parentElement.querySelector("h3").innerText = `No missing wrestlers to show!`;
    }
    UpdateStatsTabCSS(); //apply highlight effect if being displayed
    //PrintGamesInChronologicalOrder();
}

function createStatsListcontainer(parentDiv, text, newID) {
    const container = document.createElement("div");
    const childDiv = document.createElement("div");
    childDiv.id = newID
    let header = document.createElement("h3");
    header.innerText = text;
    container.appendChild(header);
    container.appendChild(childDiv);
    parentDiv.appendChild(container);
    return childDiv;
}

function UpdateStatsTabCSS() {


    document.getElementById("expandGameListStats").innerText = showExpandedGameListForStats ? "Show all" : "Show selected";

    for (const gameID in games) {
        if (statsTabsBeingShown.length == 0 || arrayContains(gameID, statsTabsBeingShown)) {

            // Show tab and mark its button as active
            document.getElementById(`StatsTabButton${gameID}`).classList.remove('tab-btn');
            document.getElementById(`StatsTabButton${gameID}`).classList.add('tab-btn-active');

            if (statsTabsBeingShown.length == 0) {
                document.getElementById(`StatsTabButton${gameID}`).style.display = showExpandedGameListForStats ? "" : "none";
            }
            else {
                document.getElementById(`StatsTabButton${gameID}`).style.display = "";
            }
        }
        else {
            document.getElementById(`StatsTabButton${gameID}`).style.display = showExpandedGameListForStats ? "" : "none";
            document.getElementById(`StatsTabButton${gameID}`).classList.remove('tab-btn-active');
            document.getElementById(`StatsTabButton${gameID}`).classList.add('tab-btn');
        }
    }
}

function OnStatsFilterChange() {
    renderStats();
}

function setStatsTabs(tabIds){
    statsTabsBeingShown = tabIds.slice();
    OnStatsFilterChange();
}

function toggleStatsTabs(tabIds) {
    tabIds.forEach(tabId => {
    if (arrayContains(tabId, statsTabsBeingShown)) {
        statsTabsBeingShown = statsTabsBeingShown.filter(function (a) { return a !== tabId })
    }
    else {
        statsTabsBeingShown.push(tabId);
    }});

    OnStatsFilterChange();
}
