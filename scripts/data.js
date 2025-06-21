let knownUIDs = [];
let games;

//#region JSON I/O
function UpdateJsonInputFieldAndResubmit() {
    document.getElementById("JsonInputField").value = JSON.stringify(games, null, 2);
    Submit();
}

function SubmitAdamsData() {

    fetch('wrestling_roster.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Loaded default data:", data);
            games = data;
            UpdateJsonInputFieldAndResubmit();
        });
}

function Submit() {
    const raw = document.getElementById("JsonInputField").value;

    try {
        games = JSON.parse(raw);
    } catch (e) {
        alert("Invalid JSON!");
        return;
    }

    // Sort and rebuild the object
    games = Object.fromEntries(
        Object.entries(games).sort((a, b) => {
            const dateA = new Date(a[1]["ReleaseDate"] || "2100-01-01");
            const dateB = new Date(b[1]["ReleaseDate"] || "2100-01-01");
            return dateA - dateB;
        })
    );
    populateGamesDropdown();
    RebuildKnownUIDs();
    renderUIDDropdown();
    renderEntries();
    renderStats();

    // Unhide UI elements
    Array.from(document.getElementsByClassName("hideUntilData")).forEach(element => {
        element.classList.remove("hideUntilData");
    });
}




function downloadJSON() {
    const jsonText = document.getElementById("JsonInputField").value;
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "wrestling_roster.json";
    link.click();

    URL.revokeObjectURL(url); // Clean up
}
//#endregion

//#region UID Management
function RebuildKnownUIDs() {
    knownUIDs = [];

    // Build UID list (skip duplicates)
    for (const game in games) {

        const roster = games[game]["Roster"];
        if (roster && roster.length > 0) {

            for (const entry of roster) {
                if (entry.UID !== undefined && !knownUIDs.some(u => u.uid === entry.UID)) {
                    knownUIDs.push({
                        uid: entry.UID,
                        name: entry["Display Name"]
                    });
                }
            }
        }
        else {
            console.warn(`No wrestlers found in roster for game ${game}`);
        }
    }
}

function getNextUID() {
    const allUIDs = knownUIDs.map(e => parseInt(e.uid)).filter(n => !isNaN(n));
    const maxUID = allUIDs.length ? Math.max(...allUIDs) : 0;
    return (maxUID + 1).toString();
}

function FixUIDs() {
    const raw = document.getElementById("JsonInputField").value;

    try {
        games = Object.values(JSON.parse(raw));
    } catch (e) {
        alert("Invalid JSON!");
        return;
    }

    RebuildKnownUIDs(games);
    let issuesFound = 0;

    for (const game in games) {
        const roster = games[game]["Roster"];
    }

    if (issuesFound > 0) {
        if (confirm(`Fix ${issuesFound} broken UID entries?`)) {

            for (const game in games) {
                const roster = games[game]["Roster"];
                roster.forEach(element => {
                    if (element["UID"] == undefined || element["UID"] == "" || isNaN(element["UID"])) {
                        let goodNumber = getNextUID();
                        console.log(`Fixing bad UID for "${element["Display Name"]}": UID was ${element["UID"]}, swapping to ${goodNumber}`);
                        element["UID"] = goodNumber;
                        knownUIDs.push({
                            uid: element["UID"],
                            name: element["Display Name"]
                        });
                    }
                });
            }
            UpdateJsonInputFieldAndResubmit();

        }
        else {
            alert("Cancelled UID fix. No changes made.")
        }
    }
    else {
        alert("No broken UIDs detected. This is good.")
    }
}

function OnUIDEdited() {
    var val = document.getElementById("uidInput").value;
    var opts = document.getElementById('uidList').children;
    for (var i = 0; i < opts.length; i++) {
        if (opts[i].value === val) {
            if (opts[i].value == "NEW") {
                return;
            }

            let displayName = document.getElementById("displayName");

            const match = knownUIDs.find(entry => entry.uid === opts[i].value);
            if (match && (displayName.value == undefined || displayName.value == "")) {
                displayName.value = match.name;
            }
            break;
        }
    }
}

function GetUIDStatusAverage(uid) {
    let total = 0;
    let count = 0;

    for (const gameID in games) {
        if (gameID == "Misc/Non-Game" && !entryTabsBeingShown.includes("Misc/Non-Game")) {
            continue;
        }
        let roster = games[gameID]["Roster"];
        //console.log(data[gameID]);
        if (!Array.isArray(roster)) {
            roster = [roster];
        }

        for (const wrestler of roster) {
            if (String(wrestler.UID) === String(uid)) {
                if (wrestler.Status === true) {
                    total += 1;
                }
                count += 1;
            }
        }
    }

    if (count === 0) return 0;
    return Math.round((total / count) * 100);
}
//#endregion

//#region Add New Entries
function populateGamesDropdown() {
    const gamesDropdown = document.getElementById("game");
    gamesDropdown.innerHTML = "";
    let i = 0;
    Object.keys(games).forEach(element => {
        let opt = document.createElement("option");
        opt.value = element; // the index
        opt.innerHTML = element;
        gamesDropdown.appendChild(opt)
        i++;
    })
}

function AddGame(event) {
    event.preventDefault();

    gameTitle = document.getElementById("newGameFormField").value.trim();
    if (!gameTitle) {
        alert("Please enter a display name for the new UID.");
        return;
    }
    else if (games[gameTitle] && !confirm(`There's already a game called ${gameTitle}. Do you want to replace it with a new, empty one?`)) {
        return;
    }
    else if (confirm(`Add a new game called ${gameTitle}?`)) {
        const dates = document.getElementById("newGameReleaseDateField").value;
        games[gameTitle] = {};
        games[gameTitle]["ReleaseDate"] = dates;
        games[gameTitle]["Roster"] = [];
    }
    UpdateJsonInputFieldAndResubmit();
}

function addEntry(event) {
    event.preventDefault();

    // Get form values
    const dropdownForGame = document.getElementById("game");
    const game = document.getElementById("game").value.trim();
    let uid = document.getElementById("uidInput").value;

    let displayName;
    displayName = document.getElementById("displayName").value.trim();
    if (!displayName) {
        alert("Please enter a display name for the new UID.");
        return;
    }

    if ((uid == undefined || uid === "" || isNaN(uid))) {
        if (confirm(`Add new UID for ${displayName}?`)) {
            uid = getNextUID();
        }
        else {
            return;
        }
    }

    const notes = document.getElementById("notes").value.trim();
    const status = document.getElementById("statusCheckbox").checked;
    const legend = document.getElementById("legendCheckbox").checked;
    const inThePost = document.getElementById("inThePostCheckbox").checked;
    const details = document.getElementById("figureDetails").value.trim();
    const ranking = document.getElementById("personalRanking").value;

    // Build new entry
    const newEntry = {
        "UID": uid,
        "Display Name": displayName,
        "Notes": notes,
        "Status": status,
        "Legend": legend,
        "In The Post": inThePost,
        "Figure Details": details,
        "Personal Ranking": ranking
    };

    if (!games[game]) {
        if (confirm(`Add a new game called ${game}?`)) {
            games[game] = []; { }
        }
        else { return; }
    }
    games[game]["Roster"].push(newEntry);

    // Update display
    UpdateJsonInputFieldAndResubmit();

    document.getElementById("addForm").reset();
    document.getElementById("game").value = game;
}
//#endregion

function arrayContains(needle, arrhaystack) {
    return (arrhaystack.indexOf(needle) > -1);
}