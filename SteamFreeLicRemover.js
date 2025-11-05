// ==UserScript==
// @name        Steam Free License Remover
// @namespace
// @description  Removes "Free" games and softwares from your Steam Library by removing the game's license from your account.  
// @match        https://store.steampowered.com/account/licenses/
let removedCount = 0;

// Function to check if a game has been played.
function hasGameBeenPlayed(linkElement) {
    // Look for the table row containing this link.
    const row = linkElement.closest('tr');
    if (!row) return true; // If we can't find the row, assume it's played to be safe.
    // Check for playtime information - Steam typically shows playtime in the same row.
    const rowText = row.textContent.toLowerCase();
    // If there's any playtime recorded (like "0.1 hours" or any number with "hour"), don't remove.
    if (rowText.match(/\d+\.?\d*\s*hours?/)) {
        return true;
    }
    // Check for "Never played" text or similar indicators.
    if (rowText.includes('never') || rowText.includes('not played')) {
        return false;
    }
    // Additional check: look for specific CSS classes or elements that indicate played status.
    const playtimeCells = row.querySelectorAll('td');
    for (const cell of playtimeCells) {
        const cellText = cell.textContent.trim().toLowerCase();
        // If cell contains hours information and it's not "0 hours".
        if (cellText.match(/\d+\.?\d*\s*hours?/) && !cellText.match(/^0\.?0?\s*hours?/)) {
            return true;
        }
    }
    // Default to not removing if we can't determine play status.
    return false;
}

// Function to check if the item is a Soundtrack.
function isSoundtrack(linkElement) {
    // Look for the table row containing this link.
    const row = linkElement.closest('tr');
    if (!row) return false;
    const rowText = row.textContent.toLowerCase();
    // Check for common soundtrack indicators.
    if (rowText.includes('soundtrack') || 
        rowText.includes('ost') ||
        rowText.includes('sound track') ||
        rowText.match(/s\.?t/)) {
        return true;
    }
    // Check the game name cells for soundtrack indicators.
    const nameCells = row.querySelectorAll('td');
    for (const cell of nameCells) {
        const cellText = cell.textContent.toLowerCase().trim();
        if (cellText.includes('soundtrack') || 
            cellText.includes('ost') ||
            cellText.includes('sound track') ||
            cellText.match(/s\.?t/)) {
            return true;
        }
    }
    return false;
}

// Function to check if the item is a Demo.
function isDemo(linkElement) {
    // Look for the table row containing this link.
    const row = linkElement.closest('tr');
    if (!row) return false;
    const rowText = row.textContent.toLowerCase();
    // Check for common demo indicators.
    if (rowText.includes('demo') || 
        rowText.includes('playtest') ||
        rowText.includes('test version') ||
        rowText.includes('trial version') ||
        rowText.includes('beta') ||
        rowText.includes('alpha')) {
        return true;
    }
    // Check the game name cells for demo indicators.
    const nameCells = row.querySelectorAll('td');
    for (const cell of nameCells) {
        const cellText = cell.textContent.toLowerCase().trim();
        if (cellText.includes('demo') || 
            cellText.includes('playtest') ||
            cellText.includes('test version') ||
            cellText.includes('trial version') ||
            cellText.includes('beta') ||
            cellText.includes('alpha') ||
            cellText.match(/\bdemo\b/) || // Exact word match for "demo".
            cellText.match(/\bbeta\b/) || // Exact word match for "beta".
            cellText.match(/\bplaytest\b/)) { // Exact word match for "playtest".
            return true;
        }
    }
    return false;
}

async function removeGame(id) {
    console.log(`Removing game with ID ${id}...`);
    try {
        const response = await fetch('https://store.steampowered.com/account/removelicense', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: `sessionid=${encodeURIComponent(g_sessionID)}&packageid=${encodeURIComponent(id)}`
        });
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                removedCount++;
                console.log(`Game with ID ${id} removed successfully. Total games removed: ${removedCount}`);
            } else {
                console.log(`Failed to remove game with ID ${id}.`);
            }
        } else {
            console.log(`Failed to remove game with ID ${id}. Status: ${response.status} - ${response.statusText}`);
        }
    } catch (error) {
        console.error(`Error while removing game with ID ${id}:`, error);
    }
}

function extractIdFromLink(link) {
    const match = link.match(/RemoveFreeLicense\(\s*(\d+)\s*,/);
    return match ? match[1] : null;
}

function countRemovableGames() {
    const removeLinks = document.querySelectorAll('a[href^="javascript:RemoveFreeLicense"]');
    const totalGames = removeLinks.length;
    console.log(`Total removable games: ${totalGames}`);
    return totalGames;
}

async function removeGames() {
    const totalGames = countRemovableGames();
    let skippedCount = 0;
    let soundtrackCount = 0;
    let demoCount = 0;
    const intervalID = setInterval(() => {
        console.log(`Games removed: ${removedCount} of ${totalGames}, Skipped: ${skippedCount}, Soundtracks: ${soundtrackCount}, Demos: ${demoCount}`);
        if (removedCount + skippedCount + soundtrackCount + demoCount >= totalGames) {
            clearInterval(intervalID);
        }
    }, 1000);
    const removeLinks = document.querySelectorAll('a[href^="javascript:RemoveFreeLicense"]');
    for (const link of removeLinks) {
        const id = extractIdFromLink(link.href);
        if (id) {
            // Check if the item is a Demo.
            if (isDemo(link)) {
                console.log(`Skipping Demo with ID ${id}`);
                demoCount++;
                continue;
            }
            // Check if the item is a Soundtrack.
            if (isSoundtrack(link)) {
                console.log(`Skipping Soundtrack with ID ${id}`);
                soundtrackCount++;
                continue;
            }
            // Check if the game has been played.
            if (hasGameBeenPlayed(link)) {
                console.log(`Skipping game with ID ${id} - it appears to have been played`);
                skippedCount++;
                continue;
            }  
            await removeGame(id);
            await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
            console.log(`Failed to extract ID from link: ${link.href}`);
        }
    }

    console.log(`Process completed. Games removed: ${removedCount}, Played games skipped: ${skippedCount}, Soundtracks preserved: ${soundtrackCount}, Demos preserved: ${demoCount}, Total: ${totalGames}`);
}

removeGames();
