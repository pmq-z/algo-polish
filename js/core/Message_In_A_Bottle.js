//	=========================== //
//		MESSAGE IN A BOTTLE	 	//
//	=========================== //

//	=== IMPORTS ===	//

import { The_Notebook, Two_Roads_Diverged } from "./The_Notebook.js";

//	=== FINDING ===	//

// "Where's Waldo?"
export async function Wheres_Waldo(Key) {
	const Tabs = await chrome.tabs.query({ url: "https://www.youtube.com/*" });
	const Match = Tabs.find((Tab) => Two_Roads_Diverged[Key].Matches(new URL(Tab.url)));
	// no match means the page has not been opened yet
	if (Match === undefined) { return null; }
	else if (Match !== undefined) { return Match; }
}

// the work tab's id lives in storage: switching source reloads this page, and a plain variable would forget the tab
async function Where_Did_I_Park() {
	try { const Got = await chrome.storage.local.get("work_tab"); return Got.work_tab === undefined ? null : Got.work_tab; }
	catch (Oops) { return null; }
}
async function Park_It(Id) {
	try { await chrome.storage.local.set({ work_tab: Id }); } catch (Oops) { /* the next open just makes a new tab */ }
}

// "Silent running": one background tab does all the work. It is reused (sent to the new list) instead of opening another, and waits until the page has loaded
export async function Silent_Running(Key) {
	let Tab = null;
	let Reused = false;
	// the tab this tool opened earlier, if it is still around and still on YouTube
	const Own_Tab_Id = await Where_Did_I_Park();
	if (Own_Tab_Id !== null) {
		try {
			const Mine = await chrome.tabs.get(Own_Tab_Id);
			if (Mine !== undefined && Mine.url !== undefined && Mine.url.startsWith("https://www.youtube.com/") === true) { Tab = Mine; Reused = true; }
		} catch (Gone) { Tab = null; }
	}
	if (Reused === true && Two_Roads_Diverged[Key].Matches(new URL(Tab.url)) === true && Tab.status === "complete") { return Tab; }
	await new Promise((Resolve) => {
		const Timeout = setTimeout(() => { chrome.tabs.onUpdated.removeListener(Listen); Resolve(); }, 30000);
		function Listen(Id, Change) {
			if (Id === Tab.id && Change.status === "complete") {
				clearTimeout(Timeout);
				chrome.tabs.onUpdated.removeListener(Listen);
				Resolve();
			}
		}
		const Start = async () => {
			if (Reused === true) { chrome.tabs.onUpdated.addListener(Listen); await chrome.tabs.update(Tab.id, { url: Two_Roads_Diverged[Key].Url }); }
			else if (Reused === false) {
				Tab = await chrome.tabs.create({ url: Two_Roads_Diverged[Key].Url, active: false });
				if (Tab === undefined) { clearTimeout(Timeout); Resolve(); return; }
				await Park_It(Tab.id);
				chrome.tabs.onUpdated.addListener(Listen);
				// it may have finished loading before the listener was attached
				chrome.tabs.get(Tab.id).then((Now) => { if (Now.status === "complete") { Listen(Tab.id, { status: "complete" }); } }).catch(() => {});
			}
		};
		Start();
	});
	return Tab === undefined ? null : Tab;
}

let Last_Opened_At = 0;

// "Lost and found": if the tab left the list (or closed), use another tab that is on it, or quietly open a new one
export async function Lost_And_Found() {
	const Key = The_Notebook.Source;
	let Here = null;
	try { Here = await chrome.tabs.get(The_Notebook.Tab_Id); }
	catch (Gone) { Here = null; }
	// an address we cannot read counts as "still there": better to try than to open tabs needlessly
	if (Here !== null && (Here.url === undefined || Two_Roads_Diverged[Key].Matches(new URL(Here.url)) === true)) { return; }
	let Other = await Wheres_Waldo(Key);
	// never open tabs in a loop (a sign-in redirect would do that): one new tab a minute at most
	if (Other === null && Date.now() - Last_Opened_At > 60000) { Last_Opened_At = Date.now(); Other = await Silent_Running(Key); }
	if (Other !== null && Other !== undefined) { The_Notebook.Tab_Id = Other.id; }
}

// "Is there anybody out there?"
export async function tab_is_alive(Tab_Id) {
	try { await chrome.tabs.get(Tab_Id); return true; }
	catch (Gone) { return false; }
}

//	=== SENDING ===	//

// "I'll send an S.O.S. to the world"
export async function Send_An_SOS(Message) {
	const Letter = { ...Message, Source: The_Notebook.Source };
	try {
		const Reply = await chrome.tabs.sendMessage(The_Notebook.Tab_Id, Letter);
		// an answer means the page scripts are already loaded
		if (Reply !== undefined) { return Reply; }
	} catch (Silence) {
		// nobody home yet: inject below
	}
	await chrome.scripting.executeScript({
		target: { tabId: The_Notebook.Tab_Id },
		files: [
			"js/scrapers/Where_The_Streets_Have_No_Name.js", "js/scrapers/Elementary_My_Dear_Watson.js",
			"js/scrapers/Walk_This_Way.js", "js/scrapers/Hello_Is_It_Me.js",
		],
	});
	return chrome.tabs.sendMessage(The_Notebook.Tab_Id, Letter);
}

// "Beam me up, Scotty!"
export async function Beam_Me_Up(Tab_Id) {
	await chrome.tabs.update(Tab_Id, { active: true });
}

// "Groundhog Day": reload the YouTube tab so the next scan reads the real list, not stale rows
export async function Groundhog_Day() {
	await new Promise((Resolve) => {
		const Timeout = setTimeout(() => { chrome.tabs.onUpdated.removeListener(Listen); Resolve(); }, 20000);
		function Listen(Id, Change) {
			if (Id === The_Notebook.Tab_Id && Change.status === "complete") {
				clearTimeout(Timeout);
				chrome.tabs.onUpdated.removeListener(Listen);
				Resolve();
			}
		}
		chrome.tabs.onUpdated.addListener(Listen);
		chrome.tabs.reload(The_Notebook.Tab_Id);
	});
}
