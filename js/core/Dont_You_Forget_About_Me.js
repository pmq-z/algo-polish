//	================================= 	//
//		DON'T YOU FORGET ABOUT ME	 	//
//	================================= 	//

//	=== IMPORTS ===	//

import { The_Notebook, Month_Ms, Day_Ms, Months_Of_Silence, Smallest_Habit, Samples_Per_Channel } from "./The_Notebook.js";
import { Read_Between_The_Lines } from "./Rule_The_World.js";

//	=== REMEMBERING ===	//

// "Remember the time": after a Liked or History scan, keep a count of videos per channel
export async function Remember_The_Time(Items) {
	const By_Key = {};
	const By_Name = {};
	for (const Item of Items) {
		const Name = (Item.Channel || "").trim().toLowerCase();
		const Date_Ms = Read_Between_The_Lines(Item.Date_Label || "");
		// each video is kept as a sample once, under the first book that knows its channel
		let Sampled = false;
		for (const [Book, Key] of [[By_Key, Item.Channel_Key], [By_Name, Name]]) {
			// a video with no readable channel cannot be credited to anyone
			if (Key === undefined || Key === "") { continue; }
			if (Book[Key] === undefined) { Book[Key] = { Count: 0, Last: null, Samples: [] }; }
			Book[Key].Count = Book[Key].Count + 1;
			if (Date_Ms !== null && (Book[Key].Last === null || Date_Ms > Book[Key].Last)) { Book[Key].Last = Date_Ms; }
			if (Sampled === false && Book[Key].Samples.length < Samples_Per_Channel) {
				Book[Key].Samples.push({ Id: Item.Id, Title: (Item.Title || "").slice(0, 90), Short: Item.Is_Short === true });
				Sampled = true;
			}
		}
	}
	const Pack = { At: Date.now(), Scanned: Items.length, Has_Samples: true, By_Key, By_Name };
	The_Notebook.Stats[The_Notebook.Source] = Pack;
	await chrome.storage.local.set({ ["stats:" + The_Notebook.Source]: Pack });
}

// "Dig up the past": load the saved counts before the Subscriptions audit starts
export async function Dig_Up_The_Past() {
	const Saved = await chrome.storage.local.get(["stats:history", "stats:liked"]);
	The_Notebook.Stats.history = Saved["stats:history"];
	The_Notebook.Stats.liked = Saved["stats:liked"];
}

//	=== MATCHING ===	//

// "Remember the name": fill in how much of this channel the person actually watches
export function Remember_The_Name(Item) {
	const History = The_Notebook.Stats.history;
	const Liked = The_Notebook.Stats.liked;
	const Lookup = (Pack) => {
		if (Pack === undefined) { return undefined; }
		return Pack.By_Key[Item.Id] || Pack.By_Name[Item.Title.trim().toLowerCase()];
	};
	const Mine = Lookup(History);
	const Liked_Mine = Lookup(Liked);
	Item.Watch_Count = History === undefined ? null : (Mine === undefined ? 0 : Mine.Count);
	Item.Last_Ms = Mine === undefined ? null : Mine.Last;
	Item.Liked_Count = Liked === undefined ? null : (Liked_Mine === undefined ? 0 : Liked_Mine.Count);

	Item.Samples = Pick_Of_The_Litter(Lookup, History, Liked);
	Item.Sample_Page = 0;

	if (History === undefined) { Item.Detail = "No history data yet. Scan Watch history first."; }
	else if (Item.Watch_Count === 0) { Item.Detail = `Not in your last ${History.Scanned} scanned history videos`; }
	else if (Item.Watch_Count > 0) {
		Item.Detail = `${Item.Watch_Count} in your history` + (Item.Last_Ms === null ? "" : " · last " + When_Was_That(Item.Last_Ms));
	}
	if (Item.Liked_Count > 0) { Item.Detail = Item.Detail + ` · ${Item.Liked_Count} liked`; }
}

// "Pick of the litter": the videos you liked and watched from one channel, mixed together (null when the saved scans predate samples)
function Pick_Of_The_Litter(Lookup, History, Liked) {
	const Packs = [[Liked, "liked"], [History, "watched"]].filter(([Pack]) => Pack !== undefined);
	if (Packs.length === 0 || Packs.some(([Pack]) => Pack.Has_Samples !== true)) { return null; }
	const Lists = Packs.map(([Pack, Tag]) => {
		const Mine = Lookup(Pack);
		return Mine === undefined || Mine.Samples === undefined ? [] : Mine.Samples.map((Sample) => ({ ...Sample, Tag }));
	});
	// take one from each list in turn, so a first page shows both kinds when both exist
	const Mixed = [];
	const Seen = new Set();
	const Longest = Math.max(...Lists.map((List) => List.length));
	for (let Index = 0; Index < Longest; Index++) {
		for (const List of Lists) {
			if (List[Index] !== undefined && Seen.has(List[Index].Id) === false) { Seen.add(List[Index].Id); Mixed.push(List[Index]); }
		}
	}
	return Mixed;
}

// "When was that?"
export function When_Was_That(Ms) {
	const Days = Math.floor((Date.now() - Ms) / Day_Ms);
	if (Days < 1) { return "today"; }
	else if (Days < 2) { return "yesterday"; }
	else if (Days < 60) { return `${Days} days ago`; }
	const Months = Math.floor((Date.now() - Ms) / Month_Ms);
	if (Months < 24) { return `${Months} months ago`; }
	return `${Math.floor(Months / 12)} years ago`;
}

//	=== SORTING ===	//

// "Last Christmas": least watched first, and among equals the one you have not seen for longest
export function Last_Christmas() {
	const Rank = (Id) => The_Notebook.Items.get(Id);
	The_Notebook.Deck.sort((A, B) => {
		const First = Rank(A);
		const Second = Rank(B);
		// no history data at all: leave the page order alone
		if (First.Watch_Count === null || Second.Watch_Count === null) { return 0; }
		if (First.Watch_Count !== Second.Watch_Count) { return First.Watch_Count - Second.Watch_Count; }
		// an unknown date sorts after a known one
		const Old = First.Last_Ms === null ? Infinity : First.Last_Ms;
		const Older = Second.Last_Ms === null ? Infinity : Second.Last_Ms;
		if (Old === Older) { return 0; }
		return Old < Older ? -1 : 1;
	});
}

//	=== GROUPING ===	//

// "Out of sight, out of mind": the three focused tags for the Subscriptions audit
export function Out_Of_Sight_Out_Of_Mind(Items) {
	// without history counts there is nothing to group by
	if (The_Notebook.Stats.history === undefined) { return []; }
	const Cutoff = Date.now() - Months_Of_Silence * Month_Ms;
	const Rules = [
		{ Label: "never watched", Test: (Item) => Item.Watch_Count === 0 },
		{ Label: `quiet ${Months_Of_Silence}+ months`, Test: (Item) => Item.Watch_Count > 0 && Item.Last_Ms !== null && Item.Last_Ms < Cutoff },
		{ Label: "1–2 videos only", Test: (Item) => Item.Watch_Count >= 1 && Item.Watch_Count <= 2 },
	];
	const Taken = new Set();
	const Groups = [];
	for (const Rule of Rules) {
		// each channel belongs to the first group that fits, so the tags never overlap
		const Ids = Items.filter((Item) => Taken.has(Item.Id) === false && Rule.Test(Item)).map((Item) => Item.Id);
		for (const Id of Ids) { Taken.add(Id); }
		if (Ids.length >= Smallest_Habit) { Groups.push({ Kind: "habit", Label: Rule.Label, Ids }); }
	}
	return Groups;
}
