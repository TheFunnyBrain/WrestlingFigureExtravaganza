let statsTabsBeingShown = [];

let showExpandedGameListForStats = true;

function ToggleExpandedGamesListForStats() {
    showExpandedGameListForStats = !showExpandedGameListForStats;
    UpdateStatsTabCSS();
}

//#region autobackup!
window.addEventListener("beforeunload", () => {
    localStorage.setItem("draftJson", document.getElementById("JsonInputField").value);
});
window.addEventListener("DOMContentLoaded", () => {
    const saved = localStorage.getItem("draftJson");
    if (saved) document.getElementById("JsonInputField").value = saved;
});
//#endregion

//#region UI Instantiation and logic
function WrestlerShouldBeShown(wrestler, filters) {
    //Sanitise, nullcheck etc
    const status = String(wrestler["Status"]) == "undefined" ? "false" : String(wrestler["Status"]);
    const legend = String(wrestler["Legend"]) == "undefined" ? "false" : String(wrestler["Legend"]);
    const inThePost = String(wrestler["In The Post"]) == "undefined" ? "false" : String(wrestler["In The Post"]);
    const displayNameToLower = wrestler["Display Name"]?.toLowerCase() || "";
    return (filters["Status"] === "all" || filters["Status"] === status) &&
        (filters["Legend"] === "all" || filters["Legend"] === legend) &&
        (filters["In The Post"] === "all" || filters["In The Post"] === inThePost) &&
        (filters["Display Name"] === "" || displayNameToLower.includes(filters["Display Name"]) || (filters["Display Name"].startsWith("uid:") && filters["Display Name"].substring(4) == wrestler["UID"]))
}

function ShowUIDStatusAverageInColourText(uid) {
    let percentage = GetUIDStatusAverage(uid);
    return `<p style="color:${getPercentageColor(percentage)}; display:inline">${percentage}%</p>`;
}

function renderUIDDropdown() {
    const uidList = document.getElementById("uidList");
    uidList.innerHTML = "";

    knownUIDs.forEach(entry => {
        const option = document.createElement("option");
        option.value = entry.uid;
        option.text = `${entry.uid} - ${entry.name}`;
        uidList.appendChild(option);
    });

    // Add "New UID" option
    const newOption = document.createElement("option");
    newOption.value = "NEW";
    newOption.text = "New UID...";
    uidList.appendChild(newOption);
}

function MakeExpandGameListToggle(tabs, id, callback) {
    const expandToggle = document.createElement("button");
    expandToggle.name = id;
    expandToggle.id = id;
    expandToggle.onclick = function () {
        callback();
    };

    // Add to DOM
    tabs.appendChild(expandToggle);

}

function getPercentageColor(percentage) {

    return getGradientColor(['#FF0000', '#7FFF00'], percentage);
}

function getGradientColor(colors, percentage) {

    if (percentage === undefined) {
        console.error("Pass in a percentage to get a colour");
        return;
    }
    // Clamp percentage between 0 and 100
    percentage = Math.max(0, Math.min(100, percentage));

    // If there's only one color, return it
    if (colors.length === 1) return colors[0];

    // Find the two colors to interpolate between
    const index = (colors.length - 1) * percentage / 100;
    const i = Math.floor(index);
    const t = index - i;

    const color1 = colors[i];
    const color2 = colors[Math.min(i + 1, colors.length - 1)];

    // Interpolate between the two colors
    const rgb = [0, 1, 2].map(j => {
        const c1 = parseInt(color1.slice(1 + j * 2, 3 + j * 2), 16);
        const c2 = parseInt(color2.slice(1 + j * 2, 3 + j * 2), 16);
        return Math.round(c1 * (1 - t) + c2 * t);
    });

    // Convert RGB to hex
    return '#' + rgb.map(c => c.toString(16).padStart(2, '0')).join('');
}

function AppendName(div, textToShow) {
    let text = document.createElement("li");
    text.innerHTML = textToShow;
    text.classList.add("noWrap");
    div.appendChild(text);
    div.appendChild(document.createElement("br"));
}


//onclick=SearchForUID
function AppendClickableName(div, textToShow, uid) {
    let text = document.createElement("li");
    text.classList.add("noWrap");
    text.innerHTML = textToShow;
    text.onclick = function () { SearchForUID(parseInt(uid)); };
    div.appendChild(text);
    div.appendChild(document.createElement("br"));
}

function CreateTabButton(game, onclick, idPrefix, tabs) {
    //All games tab
    tabButton = document.createElement("button");
    tabButton.innerHTML = game;
    tabButton.classList.add("tab-btn");
    tabButton.id = `${idPrefix}${game}`;
    tabButton.addEventListener('click', onclick);
    tabs.appendChild(tabButton);
}

//#endregion