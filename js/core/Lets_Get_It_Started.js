//	============================ //
//		LET'S GET IT STARTED	 //
//	============================ //

//	=== IMPORTS ===	//

import { The_Notebook, Two_Roads_Diverged, Home_Scan_Cap, Not_So_Fast_Cap } from "./The_Notebook.js";
import { $, Mirror_Mirror, Spotlight, Take_The_Stand, Sign_On_The_Door, Fade_To_Black, Roll_The_Dice, Turn_The_Page } from "../ui/Paint_It_Black.js";
import { Wheres_Waldo, Silent_Running, Lost_And_Found, Send_An_SOS, Beam_Me_Up, Groundhog_Day } from "./Message_In_A_Bottle.js";
import { Whats_In_The_Box, Remember_Me, Gotta_Catch_Em_All, Choose_Wisely, Turn_Back_Time, Eternal_Sunshine, Bye_Bye_Bye, We_Are_Family, Ladies_First, Better_Safe_Than_Sorry, You_Shall_Not_Pass } from "./Should_I_Stay_Or_Should_I_Go.js";
import { Nevermind, Hit_Me_Baby_One_More_Time, Stop_In_The_Name_Of_Love, Rise_Like_A_Phoenix, Gone_Girl, Boomerang, Pump_It_Up } from "./Another_One_Bites_The_Dust.js";
import { Drag_Me_Down, Bring_It_On_Home } from "../ui/Shake_It_Off.js";
import { Are_You_Sure } from "../ui/Are_You_Sure.js";
import { Rule_Types, Order_In_The_Court, Make_A_Law, Repeal_The_Law, Protect_And_Serve, Let_It_Go, I_Am_The_Law, is_protected } from "./Rule_The_World.js";
import { Cut_To_Fit, Reel_It_In, Remember_The_Reels, Shorts_By_Signal } from "./Short_Shorts.js";
import { Load_The_Roster, Pick_Your_Fighter, Save_Fighter, Retire_Fighter } from "./Choose_Your_Fighter.js";
import { Pack_Your_Bags, Open_The_Bags, Settle_In } from "./Take_Me_Home.js";
import { Still_Waiting } from "../ui/Birds_Of_A_Feather.js";
import { Remember_The_Time, Dig_Up_The_Past, Last_Christmas } from "./Dont_You_Forget_About_Me.js";

//	=== SCANNING ===	//

// "Hear ye, hear ye!"
function Hear_Ye_Hear_Ye(Message) {
	if (Message.Type === "Algo_Progress") { Gotta_Catch_Em_All(Message.Items); }
}

// "Second wind": YouTube stopped loading in the hidden tab, so bring it forward just long enough to finish, then hand focus back
async function Second_Wind(Home, Cap) {
	let Reply;
	The_Notebook.Notice = "bringing YouTube forward to load everything: keep that tab visible until it finishes";
	Mirror_Mirror();
	await Beam_Me_Up(The_Notebook.Tab_Id);
	try { Reply = await Send_An_SOS({ Type: "Algo_Scan", Cap }); }
	catch (Oops) { Reply = { Ok: false, Error: String(Oops) }; }
	if (Home !== undefined) { await Beam_Me_Up(Home.id); }
	return Reply;
}

// "Gone with the wind": videos still waiting in the deck that YouTube no longer lists leave it (never the Home feed, which is only a sample)
function Gone_With_The_Wind(Seen) {
	const Gone = The_Notebook.Deck.filter((Id) => Seen.has(Id) === false);
	if (Gone.length === 0) { return 0; }
	const Leaving = new Set(Gone);
	The_Notebook.Deck = The_Notebook.Deck.filter((Id) => Leaving.has(Id) === false);
	The_Notebook.Undo_Stack = The_Notebook.Undo_Stack.filter((Step) => Leaving.has(Step.Id) === false);
	for (const Id of Gone) { The_Notebook.Items.delete(Id); }
	return Gone.length;
}

let Scan_Run = 0;

// "Seek, and ye shall find"
async function Seek_And_Ye_Shall_Find() {
	// a second click restarts the scan; only the newest run is allowed to apply its result
	const Mine = Scan_Run + 1;
	Scan_Run = Mine;
	const Known = new Set(The_Notebook.Items.keys());
	const Was_Rescan = Known.size > 0;
	The_Notebook.Scanning = true;
	The_Notebook.Chip_Page = 0;
	The_Notebook.Notice = "";
	Mirror_Mirror();
	const Home = await chrome.tabs.getCurrent();
	// scan a tab that is really on the list, never one you have since pointed at a video
	try { await Lost_And_Found(); } catch (Oops) { /* the scan reports it */ }
	// after removals the old page still shows them: pause the pump, reload, then read the real list
	const Fresh = (The_Notebook.Removed.size > 0 && The_Notebook.Source !== "home");
	if (Fresh === true) {
		const Was_Paused = The_Notebook.Paused;
		The_Notebook.Paused = true;
		while (The_Notebook.Running === true) { await new Promise((Go) => setTimeout(Go, 200)); }
		await Groundhog_Day();
		The_Notebook.Paused = Was_Paused;
	}
	const Cap = The_Notebook.Source === "home" ? Home_Scan_Cap : undefined;
	let Reply;
	// first try quietly, with the YouTube tab left where it is
	try { Reply = await Send_An_SOS({ Type: "Algo_Scan", Cap, Hidden_Ok: true }); }
	catch (Oops) { Reply = { Ok: false, Error: String(Oops) }; }
	if (Reply !== undefined && Reply.Needs_Focus === true) { Reply = await Second_Wind(Home, Cap); }
	// a newer scan was started meanwhile: this answer is stale
	if (Mine !== Scan_Run) { return; }
	The_Notebook.Scanning = false;

	if (Reply === undefined || Reply.Ok === false) {
		alert("Scan failed: " + (Reply === undefined ? "no answer from the page" : Reply.Error));
	} else if (Reply.Ok === true) {
		Gotta_Catch_Em_All(Reply.Items);
		// what you watch (or like) per channel feeds the Subscriptions audit later
		if (The_Notebook.Source === "history" || The_Notebook.Source === "liked") { await Remember_The_Time(Reply.Items); }
		// every Short found here is remembered, so other lists can recognise the same videos
		if (The_Notebook.Source !== "subs") {
			await Remember_The_Reels(Reply.Items);
			// a short note says how many Shorts were found and by which signal, so a miss can be traced
			const Tally = Shorts_By_Signal(Reply.Items);
			const Total = Object.values(Tally).reduce((Sum, Count) => Sum + Count, 0);
			The_Notebook.Notice = Total === 0 ? "no Shorts detected" : `${Total} Shorts (${Object.entries(Tally).map(([Signal, Count]) => Signal + " " + Count).join(", ")})`;
		}
		// least watched channels come first in the audit
		else if (The_Notebook.Source === "subs") { Last_Christmas(); }
		// the scan stopped while YouTube still offered more videos: say so, so a short count is never mistaken for the whole list
		if (Reply.Incomplete === true) { The_Notebook.Notice = (The_Notebook.Notice === "" ? "" : The_Notebook.Notice + " · ") + "may be incomplete: YouTube still had more to load, press Rescan to continue"; }
		// restored queue entries that YouTube no longer lists are already gone
		const Seen = new Set(Reply.Items.map((Item) => Item.Id));
		Gone_Girl(Seen);
		if (Fresh === true) { Boomerang(Seen); }
		if (Was_Rescan === true) { Rescan_Report(Reply.Items.length, Seen, Known); }
		else if (The_Notebook.Items.size === 0) { alert((The_Notebook.Source === "subs" ? "No channels found." : "No videos found.") + "\n" + JSON.stringify(Reply.Debug, null, 2)); }
	}
	Mirror_Mirror();
	// resume any removals saved from the last session
	Pump_It_Up();
}

// "The report card": say what a rescan changed, so a quiet success does not look like nothing happened
function Rescan_Report(Found, Seen, Known) {
	let Line;
	if (Found === 0) {
		// an empty answer is never trusted: nothing is dropped
		Line = "rescan found nothing (YouTube may still be loading), nothing changed";
	} else {
		const Added = [...The_Notebook.Items.keys()].filter((Id) => Known.has(Id) === false).length;
		const Dropped = The_Notebook.Source === "home" ? 0 : Gone_With_The_Wind(Seen);
		Line = "rescanned: " + (Added + Dropped === 0 ? "nothing new" : `${Added} new, ${Dropped} no longer listed`);
	}
	The_Notebook.Notice = The_Notebook.Notice === "" ? Line : The_Notebook.Notice + " · " + Line;
}

//	=== STARTING ===	//

// "Ready Player One"
async function Ready_Player_One(Key) {
	const Label = Two_Roads_Diverged[Key].Label;
	$("#titleMsg").textContent = `Looking for your ${Label.toLowerCase()} tab…`;
	let Tab = await Wheres_Waldo(Key);
	// no tab yet: open one in the background and carry on, no second click needed
	if (Tab === null) {
		$("#titleMsg").textContent = `Opening ${Label.toLowerCase()} in a background tab…`;
		try { Tab = await Silent_Running(Key); }
		catch (Oops) { Tab = null; }
	}

	if (Tab === null) {
		$("#titleMsg").textContent = `Could not open ${Label} automatically. Open it in YouTube (signed in), then choose it again.`;
		const Opener = $("#openYt");
		Opener.hidden = false;
		Opener.textContent = `Open ${Label} in YouTube`;
		Opener.onclick = () => chrome.tabs.create({ url: Two_Roads_Diverged[Key].Url });
		return;
	} else if (Tab !== null) {
		The_Notebook.Source = Key;
		The_Notebook.Tab_Id = Tab.id;
		await Remember_Me(Key);
		// the audit needs the counts saved by earlier History and Liked scans
		if (Key === "subs") { await Dig_Up_The_Past(); }
		await Rise_Like_A_Phoenix(Key);
		$("#title").hidden = true;
		$("#main").hidden = false;
		$("#srcLabel").textContent = Label;
		Mirror_Mirror();
		Seek_And_Ye_Shall_Find();
	}
}

//	=== LISTENING ===	//

// "Knock knock. Who's there?"
function Whos_There(Event) {
	const Button = Event.target.closest("button");
	// ignore clicks that did not land on a row button
	if (Button === null || Button.dataset.act === undefined) { return; }
	const Entry = The_Notebook.Queue.find((Each) => Each.Id === Button.closest(".row").dataset.id);
	if (Entry === undefined) { return; }
	if (Button.dataset.act === "retry") { Hit_Me_Baby_One_More_Time(Entry); }
	else if (Button.dataset.act === "undo") { Nevermind(Entry); Mirror_Mirror(); }
}

// "Press any key to continue"
function Press_Any_Key(Event) {
	if (Event.key === "Escape") { return; }
	// typing in a form field or reading the rules dialog is not a swipe
	if (Event.target.closest("input, select, textarea") !== null || $("#law").open === true || $("#sure").open === true) { return; }
	if (Event.key === "ArrowLeft") { Choose_Wisely("discard"); }
	else if (Event.key === "ArrowRight") { Choose_Wisely("keep"); }
	else if (Event.key === "ArrowDown") { Event.preventDefault(); Choose_Wisely("block"); }
	else if (Event.key.toLowerCase() === "z") { Turn_Back_Time(); }
}

// "Wheel of fortune": the chip row scrolls sideways with the mouse wheel
function Wheel_Of_Fortune(Event) {
	const Row = $("#chips");
	// only take over when the row overflows and the wheel moves up or down
	if (Row.scrollWidth <= Row.clientWidth || Math.abs(Event.deltaY) <= Math.abs(Event.deltaX)) { return; }
	Event.preventDefault();
	Row.scrollLeft = Row.scrollLeft + Event.deltaY;
}

// "Hands off!": pressing a card tool must not start a drag
function Hands_Off(Event) {
	Event.stopPropagation();
}

//	=== THE THEME ===	//

// "What's the mood?": each toggle names the mode it would switch to
function Whats_The_Mood() {
	const Label = document.documentElement.dataset.theme === "dark" ? "Light mode" : "Dark mode";
	document.querySelectorAll(".theme-btn .tl").forEach((Where) => { Where.textContent = Label; });
	document.querySelectorAll(".theme-btn:not(:has(.tl))").forEach((Button) => { Button.textContent = Label; });
}

// "Turn off the light"
function Turn_Off_The_Light() {
	let Next = "dark";
	if (document.documentElement.dataset.theme === "dark") { Next = "light"; }
	document.documentElement.dataset.theme = Next;
	try { localStorage.setItem("algo-theme", Next); }
	catch (Blocked) { /* the theme still changes for this session */ }
	Whats_The_Mood();
}

//	=== THE COURT ===	//

// "All rise!"
function All_Rise() {
	Take_The_Stand();
	$("#law").showModal();
}

// "Change of heart": the value box follows the chosen rule type
function Change_Of_Heart() {
	const Kind = Rule_Types[$("#ruleType").value];
	$("#ruleValue").hidden = (Kind.Needs_Value === false);
	$("#ruleValue").placeholder = Kind.Hint;
}

// "Make a law"
function Add_A_Law(Event) {
	Event.preventDefault();
	const Problem = Make_A_Law($("#ruleType").value, $("#ruleValue").value);
	if (Problem !== null) { alert(Problem); }
	else if (Problem === null) {
		$("#ruleValue").value = "";
		Take_The_Stand();
		Sign_On_The_Door();
	}
}

// "Protect and serve"
function Protect_Form(Event) {
	Event.preventDefault();
	Protect_And_Serve($("#protValue").value);
	$("#protValue").value = "";
	Take_The_Stand();
	Sign_On_The_Door();
	Mirror_Mirror();
}

// "Jury duty": clicks on a rule's Remove or a protected chip
function Jury_Duty(Event) {
	const Button = Event.target.closest("button");
	if (Button === null) { return; }
	if (Button.dataset.rule !== undefined) { Repeal_The_Law(Button.dataset.rule); }
	else if (Button.dataset.prot !== undefined) { Let_It_Go(Button.dataset.prot); }
	else { return; }
	Take_The_Stand();
	Sign_On_The_Door();
	Mirror_Mirror();
}

// "Case closed"
async function Apply_The_Law() {
	// rules read video titles; channels are not videos, so they are never matched
	if (The_Notebook.Source === "subs") { alert("Rules do not apply to Subscriptions."); return; }
	const Plan = I_Am_The_Law();
	if (Plan.Ids.size === 0) { return; }
	const Ids = [...Plan.Ids];
	const Go = await Wake_Me_Up_Before_You_Go_Go(Ids.length, 0);
	if (Go === false) { return; }
	Bye_Bye_Bye(Ids);
	$("#law").close();
}

// "Toggle the switch": protect or release the channel on the current card
function Toggle_Protect() {
	const Item = The_Notebook.Items.get(The_Notebook.Deck[0]);
	if (Item === undefined || Item.Channel === "") { return; }
	if (is_protected(Item) === true) { Let_It_Go(Item.Channel.trim().toLowerCase()); }
	else if (is_protected(Item) === false) { Protect_And_Serve(Item.Channel); }
	Sign_On_The_Door();
	Mirror_Mirror();
}

// "Wake me up before you go-go": the two questions before a bulk removal. Resolves true when removal should go ahead.
async function Wake_Me_Up_Before_You_Go_Go(Count, Skipped) {
	const Subs = (The_Notebook.Source === "subs");
	const Lines = Subs
		? [`${Count} channels will be unsubscribed on YouTube, one by one.`]
		: [`${Count} videos will be removed from this list on YouTube, one by one. You get a short moment to undo each batch.`];
	if (Skipped > 0) { Lines.push(`${Skipped} from protected channels are skipped.`); }
	const Answer = await Are_You_Sure({
		Title: Subs ? `Unsubscribe from ${Count} channels?` : `Remove ${Count} videos?`,
		Lines,
		Warn: Subs ? "This changes your real subscriptions and cannot be undone from here." : null,
		Ack: Subs ? "I understand this cannot be undone here" : undefined,
		Yes: Subs ? "Yes, unsubscribe" : "Yes, remove them",
		Ask_Backup: true,
		Backup: Whats_In_The_Box(The_Notebook.Source),
	});
	if (Answer.Confirmed === false) { return false; }
	else if (Answer.Backup === true) { Better_Safe_Than_Sorry(true); }
	return true;
}

//	=== THE FLOCKS ===	//

// "Join the flock"
function Join_The_Flock(Event) {
	const Chip = Event.target.closest("button");
	if (Chip === null) { return; }
	The_Notebook.Open_Flock = Chip.dataset.key;
	Spotlight();
}

// "Pick a side"
async function Flock_Verdict(Action) {
	const Flock = The_Notebook.Clusters.find((Each) => Each.Kind + ":" + Each.Label === The_Notebook.Open_Flock);
	if (Flock === undefined) { return; }
	const Ids = Still_Waiting(Flock);
	if (Action === "first") { Ladies_First(Ids); }
	else if (Action === "keep") {
		const Word = The_Notebook.Source === "subs" ? "channels" : "videos";
		const Answer = await Are_You_Sure({ Title: `Keep all ${Ids.length} ${Word}?`, Lines: ["They stay on YouTube untouched and leave your swipe deck."], Yes: "Keep them all" });
		if (Answer.Confirmed === true) { We_Are_Family(Ids); }
	} else if (Action === "discard") {
		// protected channels are never removed in bulk
		const Safe = Ids.filter((Id) => is_protected(The_Notebook.Items.get(Id)) === false);
		const Skipped = Ids.length - Safe.length;
		if (Safe.length === 0) { alert("Every video in this group is from a protected channel."); return; }
		if (The_Notebook.Source === "subs") {
			// no "unsubscribe from everything": a bulk goodbye has a ceiling, and a hard confirmation
			if (Safe.length > Not_So_Fast_Cap) { alert(`Bulk unsubscribe is limited to ${Not_So_Fast_Cap} channels at a time. Use "Review first" and swipe through them.`); return; }
			const Go = await Wake_Me_Up_Before_You_Go_Go(Safe.length, 0);
			if (Go === true) { Bye_Bye_Bye(Safe); }
			return;
		}
		const Go = await Wake_Me_Up_Before_You_Go_Go(Safe.length, Skipped);
		if (Go === true) { Bye_Bye_Bye(Safe); }
	} else if (Action === "block") {
		const First = The_Notebook.Items.get(Ids[0]);
		if (First === undefined) { return; }
		if (is_protected(First) === true) { alert("That channel is protected."); return; }
		const Answer = await Are_You_Sure({ Title: `Stop recommending "${Flock.Label}"?`, Lines: [`One request tells YouTube not to recommend this channel. It covers all ${Ids.length} videos.`], Yes: "Block channel" });
		if (Answer.Confirmed === true) { You_Shall_Not_Pass(Ids); }
	} else if (Action === "protect") {
		Protect_And_Serve(Flock.Label);
		Sign_On_The_Door();
		Mirror_Mirror();
	} else if (Action === "close") {
		The_Notebook.Open_Flock = null;
		Spotlight();
	}
}

//	=== SETUPS AND SETTINGS ===	//

// plain helper: repaint everything that shows rules, protected channels or setups
function Refresh_The_Court() {
	Take_The_Stand();
	Sign_On_The_Door();
	Mirror_Mirror();
}

// "Size up": a click on the All / Long / Shorts buttons
function Size_Up(Event) {
	const Button = Event.target.closest("button");
	if (Button === null || Button.dataset.fmt === undefined || The_Notebook.Busy === true) { return; }
	Cut_To_Fit(Button.dataset.fmt);
	Mirror_Mirror();
}

// "Fighter select": load or delete a saved setup from the Rules dialog
async function Fighter_Select(Event) {
	const Button = Event.target.closest("button");
	if (Button === null) { return; }
	if (Button.dataset.fighter !== undefined) { await Pick_Your_Fighter(Button.dataset.fighter); }
	else if (Button.dataset.retire !== undefined) { await Retire_Fighter(Button.dataset.retire); }
	else { return; }
	Refresh_The_Court();
}

// "Save the day": store the current rules and format as a named setup
async function Save_The_Day(Event) {
	Event.preventDefault();
	const Problem = await Save_Fighter($("#presetName").value);
	if (Problem !== null) { alert(Problem); return; }
	$("#presetName").value = "";
	Refresh_The_Court();
}

// "Welcome home": read a chosen settings file, show what is inside, then merge it in (or replace, if asked)
async function Welcome_Home() {
	const File = $("#importFile").files[0];
	$("#importFile").value = "";
	if (File === undefined) { return; }
	const Bags = await Open_The_Bags(File);
	if (Bags.Problem !== undefined) { alert(Bags.Problem); return; }
	const Lines = [`The file holds ${Bags.Rules.length} rules, ${Bags.Protected.length} protected channels and ${Bags.Presets.length} saved setups.`];
	if (Bags.Skipped > 0) { Lines.push(`${Bags.Skipped} entries were not valid and will be ignored.`); }
	Lines.push("By default they are added to what you have; nothing you have now is removed.");
	const Answer = await Are_You_Sure({ Title: "Import these settings?", Lines, Yes: "Import", Option: "Replace my current rules, protected channels and setups instead" });
	if (Answer.Confirmed === false) { return; }
	await Settle_In(Bags, Answer.Option === true);
	Refresh_The_Court();
}

//	=== SEARCHES ===	//

// "Wipe out": remove the searches YouTube remembers for the search box (history screen only)
async function Wipe_Out() {
	if (The_Notebook.Source !== "history" || The_Notebook.Scanning === true) { return; }
	const Answer = await Are_You_Sure({
		Title: "Clear your recent searches?",
		Lines: [
			"This removes the recent searches that appear when you click YouTube's search box, one by one, from your YouTube search history.",
			"The YouTube tab comes forward for a few seconds, because the search box only shows suggestions on a visible page.",
		],
		Warn: "Removed searches cannot be restored by this tool.",
		Yes: "Clear searches",
	});
	if (Answer.Confirmed === false) { return; }
	The_Notebook.Notice = "clearing searches…";
	Mirror_Mirror();
	const Home = await chrome.tabs.getCurrent();
	try { await Lost_And_Found(); } catch (Oops) { /* the call below reports it */ }
	await Beam_Me_Up(The_Notebook.Tab_Id);
	let Reply;
	try { Reply = await Send_An_SOS({ Type: "Algo_Clear_Searches" }); }
	catch (Oops) { Reply = { Ok: false, Error: String(Oops) }; }
	if (Home !== undefined) { await Beam_Me_Up(Home.id); }
	if (Reply === undefined || Reply.Ok === false) { The_Notebook.Notice = ""; alert("Could not clear searches: " + (Reply === undefined ? "no answer from the page" : Reply.Error)); }
	else if (Reply.Removed === 0) { The_Notebook.Notice = "no recent searches found (or search history is turned off)"; }
	else { The_Notebook.Notice = `${Reply.Removed} searches cleared` + (Reply.Partial === true ? " (stopped early: YouTube stopped responding)" : ""); }
	Mirror_Mirror();
}

//	=== MAIN ===	//

// "Let's get it started in here!"
async function Lets_Get_It_Started() {
	document.querySelectorAll("[data-src]").forEach((Button) => {
		Button.onclick = () => Ready_Player_One(Button.dataset.src);
	});
	chrome.runtime.onMessage.addListener(Hear_Ye_Hear_Ye);
	$("#bDiscard").onclick = () => Choose_Wisely("discard");
	$("#bKeep").onclick = () => Choose_Wisely("keep");
	$("#bBlock").onclick = () => Choose_Wisely("block");
	$("#fBlock").onclick = () => Flock_Verdict("block");
	$("#bUndo").onclick = Turn_Back_Time;
	$("#forget").onclick = Eternal_Sunshine;
	$("#rescan").onclick = Seek_And_Ye_Shall_Find;
	$("#switch").onclick = () => location.reload();
	$("#pause").onclick = Stop_In_The_Name_Of_Love;
	$("#qList").onclick = Whos_There;
	addEventListener("keydown", Press_Any_Key);
	Drag_Me_Down($("#card"), Choose_Wisely);
	// a queue row dropped on the card comes back as the next video to review
	Bring_It_On_Home($("#qList"), (Entry) => { Nevermind(Entry); Mirror_Mirror(); });

	document.querySelectorAll(".theme-btn").forEach((Button) => { Button.onclick = Turn_Off_The_Light; });
	Whats_The_Mood();
	$("#chips").addEventListener("scroll", Fade_To_Black);
	$("#chips").addEventListener("wheel", Wheel_Of_Fortune, { passive: false });
	$("#reroll").onclick = Roll_The_Dice;
	$("#sNext").onclick = Turn_The_Page;
	$("#sNext").onpointerdown = Hands_Off;
	$("#bProtect").onpointerdown = Hands_Off;
	$("#bBlock").onpointerdown = Hands_Off;
	$("#lawLine").onclick = All_Rise;
	$("#rules").onclick = All_Rise;
	$("#lawClose").onclick = () => $("#law").close();
	$("#ruleType").onchange = Change_Of_Heart;
	$("#ruleForm").onsubmit = Add_A_Law;
	$("#protForm").onsubmit = Protect_Form;
	$("#ruleList").onclick = Jury_Duty;
	$("#protList").onclick = Jury_Duty;
	$("#applyRules").onclick = Apply_The_Law;
	$("#bProtect").onclick = Toggle_Protect;
	$("#backup").onclick = () => Better_Safe_Than_Sorry(true);
	$("#clearSearch").onclick = Wipe_Out;
	$("#fmt").onclick = Size_Up;
	$("#presetList").onclick = Fighter_Select;
	$("#presetForm").onsubmit = Save_The_Day;
	$("#exportSet").onclick = Pack_Your_Bags;
	$("#importSet").onclick = () => $("#importFile").click();
	$("#importFile").onchange = Welcome_Home;
	$("#chips").onclick = Join_The_Flock;
	$("#fFirst").onclick = () => Flock_Verdict("first");
	$("#fKeep").onclick = () => Flock_Verdict("keep");
	$("#fDiscard").onclick = () => Flock_Verdict("discard");
	$("#fProtect").onclick = () => Flock_Verdict("protect");
	$("#fClose").onclick = () => Flock_Verdict("close");
	Change_Of_Heart();

	// load the saved rules before the landing summary is painted
	await Order_In_The_Court();
	await Load_The_Roster();
	await Reel_It_In();
	Sign_On_The_Door();
}

Lets_Get_It_Started();
