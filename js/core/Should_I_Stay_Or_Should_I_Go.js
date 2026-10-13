//	==================================== //
//		SHOULD I STAY OR SHOULD I GO	 //
//	==================================== //

//	=== IMPORTS ===	//

import { The_Notebook } from "./The_Notebook.js";
import { Read_Between_The_Lines, is_protected } from "./Rule_The_World.js";
import { Remember_The_Name } from "./Dont_You_Forget_About_Me.js";
import { $, Mirror_Mirror } from "../ui/Paint_It_Black.js";
import { fits, Cut_To_Fit } from "./Short_Shorts.js";
import { Off_With_Their_Heads, All_Together_Now, Nevermind } from "./Another_One_Bites_The_Dust.js";
import { Ghost_Rider, Fly_Me_To_The_Moon, Jump_Around, Come_Back_To_Me, Back_To_Square_One, Wind_It_Up, Make_Some_Noise } from "../ui/Shake_It_Off.js";

//	=== MEMORY ===	//

// "Remember me"
export async function Remember_Me(Key) {
	const Saved = await chrome.storage.local.get("kept:" + Key);
	The_Notebook.Kept = new Set(Saved["kept:" + Key] || []);
}

// "Dear Diary..."
async function Dear_Diary() {
	await chrome.storage.local.set({ ["kept:" + The_Notebook.Source]: [...The_Notebook.Kept] });
}

// "Gotta catch 'em all!"
export function Gotta_Catch_Em_All(List) {
	let Upgraded = false;
	for (const Item of List) {
		// a Short seen in any earlier scan stays a Short
		if (Item.Is_Short !== true && The_Notebook.Known_Shorts.has(Item.Id) === true && Item.Is_Channel !== true) { Item.Is_Short = true; Item.Short_Signal = "seen-elsewhere"; }
		const Have = The_Notebook.Items.get(Item.Id);
		// already caught; but a later look may have found the "Short" label that had not painted yet
		if (Have !== undefined) {
			if (Item.Is_Short === true && Have.Is_Short !== true) { Have.Is_Short = true; Have.Short_Signal = Item.Short_Signal; Upgraded = true; }
			if (Have.Duration_Sec === undefined || Have.Duration_Sec === -1) { Have.Duration_Sec = Item.Duration_Sec; }
			continue;
		}
		if (The_Notebook.Source === "subs") {
			// protected channels never enter the audit at all
			if (is_protected(Item) === true) { continue; }
			Remember_The_Name(Item);
		}
		Item.Date_Ms = Read_Between_The_Lines(Item.Date_Label);
		if (The_Notebook.Kept.has(Item.Id) === true) { Item.State = "kept"; }
		else if (The_Notebook.Kept.has(Item.Id) === false) {
			Item.State = "unseen";
			// a video outside the chosen format waits, unjudged, until the filter is lifted
			if (fits(Item, The_Notebook.Format) === true) { The_Notebook.Deck.push(Item.Id); }
		}
		The_Notebook.Items.set(Item.Id, Item);
	}
	// a video found to be a Short may now belong to (or leave) the filtered deck
	if (Upgraded === true && The_Notebook.Format !== "all") { Cut_To_Fit(The_Notebook.Format); }
	Mirror_Mirror();
}

//	=== VERDICTS ===	//

// "Forever young, I want to be forever young"
function Forever_Young(Id) {
	The_Notebook.Items.get(Id).State = "kept";
	The_Notebook.Kept.add(Id);
	Dear_Diary();
}

// "You must choose, but choose wisely."
// verdicts pressed while the card is still leaning wait here (a person mashing the arrow keys loses nothing)
const Held_Verdicts = [];
const Held_Max = 5;
let Last_Verdict_At = 0;

export async function Choose_Wisely(Action) {
	const Id = The_Notebook.Deck[0];
	if (Id === undefined) { return; }
	// another swipe is being filed this very moment
	if (The_Notebook.Busy === true) {
		if (The_Notebook.Winding === true && Held_Verdicts.length < Held_Max) { Held_Verdicts.push(Action); }
		return;
	}
	// only the Home feed can block a channel
	if (Action === "block" && The_Notebook.Source !== "home") { return; }
	The_Notebook.Busy = true;
	const Card = $("#card");
	// the button (or key) that was used gives a little press
	Make_Some_Noise($(Action === "keep" ? "#bKeep" : Action === "discard" ? "#bDiscard" : "#bBlock"));
	// a key or button press has not moved the card yet: lean it toward the verdict first (a drag arrives already leaning)
	// (fast repeats skip the lean: slow presses get the animation, mashing stays instant)
	const Rapid = (performance.now() - Last_Verdict_At < 450);
	Last_Verdict_At = performance.now();
	if (Card.style.transform === "" && Rapid === false) {
		The_Notebook.Winding = true;
		await Wind_It_Up(Card, Action);
		The_Notebook.Winding = false;
		// the deck changed during the lean (a rescan, say): put the card back and stop
		if (The_Notebook.Deck[0] !== Id) { Back_To_Square_One(Card, true); The_Notebook.Busy = false; return; }
	}
	// a copy of the card rides away while the real card moves on to the next video
	const Ghost = Ghost_Rider(Card);
	The_Notebook.Deck.shift();
	The_Notebook.Undo_Stack.push({ Id, Action });
	if (Action === "keep") { Forever_Young(Id); }
	else if (Action === "discard") {
		// the first unsubscribe of a session saves the subscription list first
		if (The_Notebook.Source === "subs") { Better_Safe_Than_Sorry(false); }
		Off_With_Their_Heads(Id);
	}
	else if (Action === "block") { Off_With_Their_Heads(Id, "dont_recommend"); }
	Back_To_Square_One(Card, false);
	The_Notebook.Busy = false;
	Mirror_Mirror();

	// the new queue row waits, invisible, until the ghost lands on it
	const Entry = The_Notebook.Queue.find((Each) => Each.Id === Id);
	const Row = Entry === undefined ? undefined : Entry.El;
	if (Row !== undefined) { Row.classList.add("incoming"); }
	Jump_Around(Card, Ghost.Lift);
	Fly_Me_To_The_Moon(Ghost, Action, Row).then(() => { if (Row !== undefined) { Row.classList.remove("incoming"); } });
	// a verdict pressed during the lean goes next
	if (Held_Verdicts.length > 0) { Choose_Wisely(Held_Verdicts.shift()); }
}

// "If I could turn back time"
export function Turn_Back_Time() {
	if (The_Notebook.Busy === true) { return; }
	const Last = The_Notebook.Undo_Stack.pop();
	if (Last === undefined) { return; }
	const Item = The_Notebook.Items.get(Last.Id);
	// that video is already gone from YouTube: dig one step deeper
	if (Item === undefined) { Turn_Back_Time(); return; }

	if (Last.Action === "keep") {
		The_Notebook.Kept.delete(Last.Id);
		Dear_Diary();
		Item.State = "unseen";
		The_Notebook.Deck.unshift(Last.Id);
	} else if (Last.Action === "discard" || Last.Action === "block") {
		const Entry = The_Notebook.Queue.find((Each) => Each.Id === Last.Id);
		// too late once the removal is under way
		if (Entry === undefined || Entry.Status === "deleting") { The_Notebook.Undo_Stack.push(Last); return; }
		Nevermind(Entry);
	}
	Mirror_Mirror();
	// the card slides back in from the side it left
	Come_Back_To_Me($("#card"), Last.Action === "keep" ? 1 : -1);
}

// "Spotless mind": wipe every kept mark and review them again
export function Eternal_Sunshine() {
	/*
		wipe the slate clean now
		every old choice fades to white
		start again, new eyes
	*/
	for (const Item of The_Notebook.Items.values()) {
		if (Item.State === "kept") { Item.State = "unseen"; The_Notebook.Deck.push(Item.Id); }
	}
	The_Notebook.Kept.clear();
	Dear_Diary();
	Mirror_Mirror();
}

//	=== BULK ===	//

// plain check: only videos still waiting in the deck may be acted on in bulk
function still_in_deck(Id) {
	return The_Notebook.Items.has(Id) === true && The_Notebook.Items.get(Id).State === "unseen";
}

// "Bye bye bye"
export function Bye_Bye_Bye(Ids) {
	const Live = Ids.filter(still_in_deck);
	const Going = new Set(Live);
	The_Notebook.Deck = The_Notebook.Deck.filter((Id) => Going.has(Id) === false);
	All_Together_Now(Live);
	Mirror_Mirror();
}

// "We are family"
export function We_Are_Family(Ids) {
	const Live = Ids.filter(still_in_deck);
	const Staying = new Set(Live);
	The_Notebook.Deck = The_Notebook.Deck.filter((Id) => Staying.has(Id) === false);
	for (const Id of Live) { The_Notebook.Items.get(Id).State = "kept"; The_Notebook.Kept.add(Id); }
	// one write for the whole group
	Dear_Diary();
	Mirror_Mirror();
}

// "Ladies first": move a group to the front of the deck
export function Ladies_First(Ids) {
	const Front = new Set(Ids);
	The_Notebook.Deck = [...The_Notebook.Deck.filter((Id) => Front.has(Id) === true), ...The_Notebook.Deck.filter((Id) => Front.has(Id) === false)];
	Mirror_Mirror();
}

//	=== BACKUP ===	//

// "What's in the box?": what a backup file is, and what it is good for (the popup and the file itself use the same words)
export function Whats_In_The_Box(Source) {
	if (Source === "subs") {
		return {
			What: "A JSON file listing your YouTube subscriptions as they are right now: each channel's name, link and how much you watch it. It is saved to your Downloads folder and never leaves your computer.",
			Uses: [
				"Re-subscribe to a channel you miss: open its link and press Subscribe.",
				"Keep a record of who you followed, readable in any text editor.",
				"Sort or filter it in a spreadsheet or a small script (it is plain JSON).",
				"Compare it with a later backup to see what changed.",
			],
			Cannot: "Algo Polish cannot import this file back. It is a reference, not an undo button.",
		};
	}
	return {
		What: "A JSON file listing every video in this list as it is right now: title, channel, link, date label and whether you kept it. It is saved to your Downloads folder and never leaves your computer.",
		Uses: [
			"Find a video again: every entry has a link, so you can open it and like or save it once more.",
			"Keep a record of what you cleaned, readable in any text editor.",
			"Sort or filter it in a spreadsheet or a small script (it is plain JSON).",
			"Compare it with a later backup to see what changed.",
		],
		Cannot: "Algo Polish cannot import this file back. It is a reference, not an undo button.",
	};
}

// "Better safe than sorry" (Force skips the once-per-session guard)
export function Better_Safe_Than_Sorry(Force) {
	if (Force === false && The_Notebook.Backup_Done === true) { return; }
	The_Notebook.Backup_Done = true;
	const Box = Whats_In_The_Box(The_Notebook.Source);
	const Pack = {
		// the file explains itself, so it still makes sense months from now
		About: {
			What_Is_This: Box.What.replace(" It is saved to your Downloads folder and never leaves your computer.", ""),
			What_You_Can_Do: Box.Uses,
			What_You_Cannot_Do: Box.Cannot,
			Made_By: "Algo Polish, before removing items from YouTube",
		},
		Exported_At: new Date().toISOString(),
		Source: The_Notebook.Source,
		Rules: The_Notebook.Rules,
		Protected: The_Notebook.Protected,
	};
	const Everything = [...The_Notebook.Items.values()];
	if (The_Notebook.Source === "subs") {
		// a subscription backup lists channels, with the link needed to subscribe again
		Pack.Channels = Everything.map((Item) => ({
			Name: Item.Title, State: Item.State, Detail: Item.Detail,
			Url: "https://www.youtube.com" + (Item.Url === undefined ? Item.Id : Item.Url),
		}));
	} else if (The_Notebook.Source !== "subs") {
		Pack.Videos = Everything.map((Item) => ({
			Id: Item.Id, Title: Item.Title, Channel: Item.Channel, State: Item.State,
			Date_Label: Item.Date_Label, Progress: Item.Progress, Is_Short: Item.Is_Short,
			Url: "https://www.youtube.com/watch?v=" + Item.Id,
		}));
	}
	const Link = document.createElement("a");
	Link.href = URL.createObjectURL(new Blob([JSON.stringify(Pack, null, 2)], { type: "application/json" }));
	Link.download = `algo-polish-backup-${The_Notebook.Source}-${new Date().toISOString().slice(0, 10)}.json`;
	Link.click();
	setTimeout(() => URL.revokeObjectURL(Link.href), 5000);
}

// "You shall not pass!": one "Don't recommend channel" request covers the channel's other videos in the deck
export function You_Shall_Not_Pass(Ids) {
	const Live = Ids.filter(still_in_deck);
	if (Live.length === 0) { return; }
	const Going = new Set(Live);
	The_Notebook.Deck = The_Notebook.Deck.filter((Id) => Going.has(Id) === false);
	// the others need no request of their own
	for (const Id of Live.slice(1)) { The_Notebook.Items.get(Id).State = "handled"; }
	Off_With_Their_Heads(Live[0], "dont_recommend");
	Mirror_Mirror();
}
