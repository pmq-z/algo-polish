//	==================================	//
//		ANOTHER ONE BITES THE DUST	 	//
//	==================================	//

//	=== IMPORTS ===	//

import {
	The_Notebook, Hold_Your_Horses_Ms, Catch_Your_Breath_Min_Ms,
	Catch_Your_Breath_Max_Ms, Long_Breather_Every, Long_Breather_Ms,
	Slow_Dance_Min_Ms, Slow_Dance_Max_Ms, Slow_Dance_Long_Every, Slow_Dance_Long_Ms,
} from "./The_Notebook.js";
import { $, Mirror_Mirror } from "../ui/Paint_It_Black.js";
import { Send_An_SOS, tab_is_alive, Lost_And_Found } from "./Message_In_A_Bottle.js";

//	=== THE CLOCK ===	//

const Tik_Tok_Worker = new Worker(new URL("./Tik_Tok.js", import.meta.url));
const Waiting_Room = new Map();
let Next_Ticket = 0;

// "Wake up, wake up, wake up!"
function Wake_Up_Call(Event) {
	Waiting_Room.get(Event.data)();
	Waiting_Room.delete(Event.data);
}
Tik_Tok_Worker.onmessage = Wake_Up_Call;

// "Once upon a dream"
export function Sleeping_Beauty(Ms) {
	return new Promise((Wake_Up) => {
		Next_Ticket = Next_Ticket + 1;
		Waiting_Room.set(Next_Ticket, Wake_Up);
		Tik_Tok_Worker.postMessage({ Id: Next_Ticket, Ms });
	});
}

//	=== THE DIARY ===	//

let Diary_Is_Open = false;

// "Don't lose my number"
export function Dont_Lose_My_Number() {
	// several changes in one tick share a single write
	// the Home feed changes on every visit, so a saved queue would be meaningless there
	if (The_Notebook.Source === "home") { return; }
	if (Diary_Is_Open === true) { return; }
	Diary_Is_Open = true;
	queueMicrotask(async () => {
		Diary_Is_Open = false;
		const Entries = The_Notebook.Queue.map((Entry) => {
			const Item = The_Notebook.Items.get(Entry.Id);
			return { Id: Entry.Id, Title: Item.Title, Channel: Item.Channel, Thumb: Item.Thumb, Url: Item.Url, Action: Entry.Action };
		});
		await chrome.storage.local.set({ ["queue:" + The_Notebook.Source]: { Entries, Done: The_Notebook.Done } });
	});
}

// "Rise like a phoenix"
export async function Rise_Like_A_Phoenix(Key) {
	if (Key === "home") { return; }
	const Saved = await chrome.storage.local.get("queue:" + Key);
	const Box = Saved["queue:" + Key];
	// nothing saved from an earlier session
	if (Box === undefined) { return; }
	The_Notebook.Done = Box.Done;
	for (const Part of Box.Entries) {
		The_Notebook.Items.set(Part.Id, { Id: Part.Id, Title: Part.Title, Channel: Part.Channel, Thumb: Part.Thumb, Url: Part.Url, Is_Channel: Key === "subs", State: "queued" });
		The_Notebook.Queue.push({ Id: Part.Id, Status: "waiting", Restored: true, Action: Part.Action === undefined ? "remove" : Part.Action });
	}
}

// "Gone, girl, gone": restored entries that YouTube no longer lists are already removed
export function Gone_Girl(Seen) {
	for (const Entry of [...The_Notebook.Queue]) {
		if (Entry.Restored !== true) { continue; }
		if (Seen.has(Entry.Id) === false) {
			Drop_It_Like_Its_Hot(Entry);
			The_Notebook.Items.delete(Entry.Id);
			The_Notebook.Done = The_Notebook.Done + 1;
		} else if (Seen.has(Entry.Id) === true) {
			Entry.Restored = false;
		}
	}
	Mirror_Mirror();
}

//	=== THE LINE ===	//

// "The usual?": what a plain discard does on each source
export function The_Usual() {
	if (The_Notebook.Source === "home") { return "not_interested"; }
	else if (The_Notebook.Source === "subs") { return "unsubscribe"; }
	return "remove";
}

// "All together now": a whole group shares ONE undo window, then the pump takes them one by one
export async function All_Together_Now(Ids, Action) {
	const Batch = [];
	for (const Id of Ids) {
		The_Notebook.Items.get(Id).State = "queued";
		const Entry = { Id, Status: "pending", Action: Action === undefined ? The_Usual() : Action };
		The_Notebook.Queue.push(Entry);
		Batch.push(Entry);
	}
	Dont_Lose_My_Number();
	Mirror_Mirror();
	await Sleeping_Beauty(Hold_Your_Horses_Ms);
	// entries undone during the window are Gone; the rest move on together
	for (const Entry of Batch) {
		if (Entry.Gone === true) { continue; }
		else if (Entry.Gone !== true) { Entry.Status = "waiting"; }
	}
	Mirror_Mirror();
	Pump_It_Up();
}

// "Off with their heads!"
export function Off_With_Their_Heads(Id, Action) {
	return All_Together_Now([Id], Action);
}

// "Drop it like it's hot"
export function Drop_It_Like_Its_Hot(Entry) {
	Entry.Gone = true;
	if (Entry.El !== undefined) { Entry.El.remove(); }
	The_Notebook.Queue.splice(The_Notebook.Queue.indexOf(Entry), 1);
	Dont_Lose_My_Number();
}

// "Nevermind" (back to the deck, front of the line)
export function Nevermind(Entry) {
	Drop_It_Like_Its_Hot(Entry);
	// the swipe that queued it is undone now, so Z must not try to undo it again
	The_Notebook.Undo_Stack = The_Notebook.Undo_Stack.filter((Step) => (Step.Id === Entry.Id && Step.Action !== "keep") === false);
	The_Notebook.Items.get(Entry.Id).State = "unseen";
	The_Notebook.Deck.unshift(Entry.Id);
}

// "Hit me baby one more time"
export function Hit_Me_Baby_One_More_Time(Entry) {
	Entry.Status = "waiting";
	Entry.Error = "";
	Mirror_Mirror();
	Pump_It_Up();
}

// "Stop! In the name of love"
export function Stop_In_The_Name_Of_Love() {
	The_Notebook.Paused = (The_Notebook.Paused === false);
	$("#pause").textContent = The_Notebook.Paused === true ? "Resume" : "Pause";
	if (The_Notebook.Paused === false) { Pump_It_Up(); }
	Mirror_Mirror();
}

// "Houston, we have a problem"
function Houston_We_Have_A_Problem() {
	for (const Entry of The_Notebook.Queue) {
		if (Entry.Status === "waiting") {
			Entry.Status = "failed";
			Entry.Error = "The YouTube tab was closed. Use Change source to start again.";
		}
	}
	Mirror_Mirror();
}

// "Take it slow": how long to wait after this entry (unsubscribing is gentler than removing a video)
function Take_It_Slow(Entry) {
	// modulo trick: every Nth action takes a longer breather
	if (Entry.Action === "unsubscribe") {
		if (The_Notebook.Done % Slow_Dance_Long_Every === 0) { return Slow_Dance_Long_Ms; }
		return Slow_Dance_Min_Ms + Math.random() * (Slow_Dance_Max_Ms - Slow_Dance_Min_Ms);
	}
	if (The_Notebook.Done % Long_Breather_Every === 0) { return Long_Breather_Ms; }
	return Catch_Your_Breath_Min_Ms + Math.random() * (Catch_Your_Breath_Max_Ms - Catch_Your_Breath_Min_Ms);
}

// "Pump it up!"
export async function Pump_It_Up() {
	// one pump at a time, and none while paused
	if (The_Notebook.Running === true || The_Notebook.Paused === true) { return; }
	// removals only ever happen on a tab that is on the list: if yours moved on to a video, a quiet one is used instead
	try { await Lost_And_Found(); } catch (Oops) { /* the alive check below reports it */ }
	if ((await tab_is_alive(The_Notebook.Tab_Id)) === false) { Houston_We_Have_A_Problem(); return; }

	The_Notebook.Running = true;
	while (The_Notebook.Paused === false) {
		const Entry = The_Notebook.Queue.find((Each) => Each.Status === "waiting");
		if (Entry === undefined) { break; }
		Entry.Status = "deleting";
		Mirror_Mirror();

		let Reply;
		try { Reply = await Send_An_SOS({ Type: "Algo_Remove", Id: Entry.Id, Action: Entry.Action }); }
		catch (Oops) { Reply = { Ok: false, Error: String(Oops) }; }

		// the tab moved off the list mid-run: find (or open) a proper one and try this entry again, once
		if (Reply !== undefined && Reply.Moved === true && Entry.Moved_Once !== true) {
			Entry.Moved_Once = true;
			Entry.Status = "waiting";
			try { await Lost_And_Found(); } catch (Oops) { /* the retry reports it */ }
			continue;
		}
		if (Reply !== undefined && Reply.Ok === true) {
			Drop_It_Like_Its_Hot(Entry);
			The_Notebook.Removed.add(Entry.Id);
			The_Notebook.Items.delete(Entry.Id);
			The_Notebook.Done = The_Notebook.Done + 1;
		} else if (Reply === undefined || Reply.Ok === false) {
			Entry.Status = "failed";
			Entry.Error = Reply === undefined ? "No answer from the YouTube tab." : Reply.Error;
		}
		Mirror_Mirror();

		await Sleeping_Beauty(Take_It_Slow(Entry));
	}
	The_Notebook.Running = false;
}

// "Boomerang": videos reported as removed that a fresh scan still lists get one more try
export function Boomerang(Seen) {
	const Back = [];
	const Stuck = [];
	for (const Id of [...The_Notebook.Removed]) {
		if (Seen.has(Id) === false) { continue; }
		The_Notebook.Removed.delete(Id);
		The_Notebook.Done = Math.max(0, The_Notebook.Done - 1);
		if (The_Notebook.Retried.has(Id) === false && The_Notebook.Items.has(Id) === true) { Back.push(Id); }
		else { Stuck.push(Id); }
	}
	if (Back.length + Stuck.length === 0) { return; }
	The_Notebook.Notice = `${Back.length + Stuck.length} didn't stick` + (Back.length > 0 ? ` · retrying ${Back.length}` : "") + (Stuck.length > 0 ? ` · ${Stuck.length} still listed after a retry` : "");
	// pull them out of the deck and give them the same shared window as any bulk discard
	const Going = new Set(Back);
	The_Notebook.Deck = The_Notebook.Deck.filter((Id) => Going.has(Id) === false);
	for (const Id of Back) { The_Notebook.Retried.add(Id); }
	if (Back.length > 0) { All_Together_Now(Back); }
	Mirror_Mirror();
}
