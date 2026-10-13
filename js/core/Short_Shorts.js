//	======================= //
//		SHORT SHORTS	 	//
//	======================= //

//	=== IMPORTS ===	//

import { The_Notebook, Known_Shorts_Max } from "./The_Notebook.js";

//	=== THE FILTER ===	//

export const Formats = { all: "All", long: "Long", shorts: "Shorts" };

// plain check: does this video belong in the chosen format? (channels, from the audit, have no format)
export function fits(Item, Format) {
	if (Format === "all" || Item.Is_Channel === true) { return true; }
	else if (Format === "shorts") { return Item.Is_Short === true; }
	else if (Format === "long") { return Item.Is_Short !== true; }
	return true;
}

// "Cut to fit": show only one format; the others wait, untouched, until the filter is lifted
export function Cut_To_Fit(Format) {
	if (Formats[Format] === undefined) { return; }
	The_Notebook.Format = Format;
	// the deck is rebuilt in scan order from everything not yet judged
	The_Notebook.Deck = [...The_Notebook.Items.values()]
		.filter((Item) => Item.State === "unseen" && fits(Item, Format) === true)
		.map((Item) => Item.Id);
	The_Notebook.Open_Flock = null;
	The_Notebook.Chip_Page = 0;
}

// "Count the cost": how many unjudged videos each format holds (for the buttons)
export function Count_The_Cost() {
	const Tally = { all: 0, long: 0, shorts: 0 };
	for (const Item of The_Notebook.Items.values()) {
		if (Item.State !== "unseen" || Item.Is_Channel === true) { continue; }
		Tally.all = Tally.all + 1;
		if (Item.Is_Short === true) { Tally.shorts = Tally.shorts + 1; }
		else { Tally.long = Tally.long + 1; }
	}
	return Tally;
}

// "Still unjudged": every video (or channel) not yet judged, whatever the format filter hides (progress counts all of them)
export function Still_Unjudged() {
	let Count = 0;
	for (const Item of The_Notebook.Items.values()) { if (Item.State === "unseen") { Count = Count + 1; } }
	return Count;
}

//	=== REMEMBERING REELS ===	//

// "Reel it in": the ids of Shorts seen in earlier scans come back from storage
export async function Reel_It_In() {
	const Saved = await chrome.storage.local.get("shorts:known");
	The_Notebook.Known_Shorts = new Set(Array.isArray(Saved["shorts:known"]) ? Saved["shorts:known"] : []);
}

// "Remember the reels": every video this scan flagged as a Short joins the memory (newest kept when it grows too big)
export async function Remember_The_Reels(Items) {
	let Changed = false;
	for (const Item of Items) {
		if (Item.Is_Short === true && Item.Is_Channel !== true && The_Notebook.Known_Shorts.has(Item.Id) === false) {
			The_Notebook.Known_Shorts.add(Item.Id);
			Changed = true;
		}
	}
	if (Changed === false) { return; }
	// a Set remembers insertion order, so the oldest ids are the first to go
	const Kept = [...The_Notebook.Known_Shorts].slice(-Known_Shorts_Max);
	The_Notebook.Known_Shorts = new Set(Kept);
	await chrome.storage.local.set({ "shorts:known": Kept });
}

// plain check: counts of Shorts by the signal that found them (shown after a scan, so a miss can be traced)
export function Shorts_By_Signal(Items) {
	const Tally = {};
	for (const Item of Items) {
		if (Item.Is_Short === true) { Tally[Item.Short_Signal || "remembered"] = (Tally[Item.Short_Signal || "remembered"] || 0) + 1; }
	}
	return Tally;
}
