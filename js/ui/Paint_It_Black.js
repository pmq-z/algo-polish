//	====================== 	//
//		PAINT IT BLACK	 	//
//	====================== 	//

//	=== IMPORTS ===	//

import { Formats, Count_The_Cost, Still_Unjudged } from "../core/Short_Shorts.js";
import { whole_roster } from "../core/Choose_Your_Fighter.js";
import { The_Notebook, Dots_On_The_Line, Not_So_Fast_Cap, Samples_Per_Page } from "../core/The_Notebook.js";
import { Rule_Types, I_Am_The_Law, is_protected } from "../core/Rule_The_World.js";
import { Birds_Of_A_Feather, Still_Waiting } from "./Birds_Of_A_Feather.js";

//	=== TOOLS ===	//

export const $ = (Selector) => document.querySelector(Selector);

const Hello_My_Name_Is = { pending: "Removing soon", waiting: "Waiting", deleting: "Removing…", failed: "Failed" };
const Hello_Again = { pending: "Sending soon", waiting: "Waiting", deleting: "Sending…", failed: "Failed" };
const Verbs = { remove: "", not_interested: " · Not interested", dont_recommend: " · Don't recommend channel", unsubscribe: "Unsubscribe from YouTube" };
// "So long, farewell": status words for an unsubscribe
const So_Long_Farewell = { pending: "Unsubscribing soon", waiting: "Waiting", deleting: "Unsubscribing…", failed: "Failed" };

//	=== PAINTING ===	//

// "Mirror, mirror, on the wall"
export function Mirror_Mirror() {
	Mona_Lisa();
	Count_On_Me();
	Stand_By_Me();
	Flock_Together_Soon();
	Spotlight();
	Read_The_Manual();
	Cut_To_Size();
}

// "Cut to size": the Format buttons show how many videos each format holds
function Cut_To_Size() {
	const Bar = $("#fmt");
	const Hide = (The_Notebook.Source === null || The_Notebook.Source === "subs");
	if (Bar.hidden !== Hide) { Bar.hidden = Hide; }
	if (Hide === true) { return; }
	const Tally = Count_The_Cost();
	for (const Button of Bar.querySelectorAll("button")) {
		const Key = Button.dataset.fmt;
		// only touch the page when something changed (a repaint during a swipe costs frames)
		const Text = `${Formats[Key]} · ${Tally[Key]}`;
		if (Button.textContent !== Text) { Button.textContent = Text; }
		const Pressed = String(The_Notebook.Format === Key);
		if (Button.getAttribute("aria-pressed") !== Pressed) { Button.setAttribute("aria-pressed", Pressed); }
	}
}

// "Read the manual": the hint text follows the source
function Read_The_Manual() {
	// rules match video titles, so the Rules button has no place in the channel audit
	$("#rules").hidden = (The_Notebook.Source === "subs");
	// remembered searches are cleaned from the Watch history screen
	$("#clearSearch").hidden = (The_Notebook.Source !== "history");
	if (The_Notebook.Source === "subs") {
		Keys_To_The_Kingdom([["←", "Unsubscribe"], ["→", "Keep"], ["Z", "Undo"]], "Channels you watch least come first. Unsubscribing is real: it changes your YouTube subscriptions, and this tool cannot undo it. Your subscription list is saved to a file first." + (The_Notebook.Stats.history === undefined ? " Scan Watch history first to see how much you watch each channel." : ""));
	} else if (The_Notebook.Source === "home") {
		Keys_To_The_Kingdom([["←", "Not interested"], ["→", "Keep"], ["↓", "Don't recommend channel"], ["Z", "Undo"]], "These are signals sent to YouTube. You can undo within 2 seconds, and YouTube lets you clear this feedback later in its recommendation settings.");
	} else if (The_Notebook.Source === "history" || The_Notebook.Source === "liked") {
		Keys_To_The_Kingdom([["←", "Discard"], ["→", "Keep"], ["Z", "Undo"]], "Discarded videos leave YouTube after a 2 second window. Kept videos are skipped next time. Changed your mind? Drag a row from the queue back onto the card.");
	}
}

// "Keys to the kingdom": the instructions as a row of key chips, then one plain sentence
function Keys_To_The_Kingdom(Keys, Note) {
	const Row = document.createElement("div");
	Row.className = "keys";
	const Lead = document.createElement("span");
	Lead.className = "lead";
	Lead.textContent = "Drag the card, or press";
	Row.appendChild(Lead);
	for (const [Key, Label] of Keys) {
		const Pair = document.createElement("span");
		Pair.className = "pair";
		const Cap = document.createElement("kbd");
		Cap.textContent = Key;
		Pair.append(Cap, Label);
		Row.appendChild(Pair);
	}
	const Text = document.createElement("p");
	Text.textContent = Note;
	$("#how").replaceChildren(Row, Text);
}

// "Smile!"
// "Picture perfect": the one image address a card will show for this item
const Warm = new Set();
const Best = new Map();
function Picture_Perfect(Item) {
	if (Item.Is_Channel === true) { return Item.Thumb; }
	return Best.has(Item.Id) === true ? Best.get(Item.Id) : `https://i.ytimg.com/vi/${Item.Id}/maxresdefault.jpg`;
}

// "Say cheese": download an upcoming card's image now, and remember which size actually exists
function Say_Cheese(Item) {
	if (Item === undefined || Item.Is_Channel === true || Best.has(Item.Id) === true) { return; }
	const Try = new Image();
	Try.onload = () => { Best.set(Item.Id, Try.src); Warm.add(Try.src); };
	// no high-res version: fall back once, and remember it so the card never waits on a failure
	Try.onerror = () => {
		Best.set(Item.Id, Item.Thumb);
		const Plain = new Image();
		Plain.onload = () => Warm.add(Item.Thumb);
		Plain.src = Item.Thumb;
	};
	Try.src = `https://i.ytimg.com/vi/${Item.Id}/maxresdefault.jpg`;
}

// "Peek-a-boo": the card behind the top one shows the next video
function Peek_A_Boo() {
	const Peek = $("#peek");
	const Next = The_Notebook.Items.get(The_Notebook.Deck[1]);
	Peek.hidden = (Next === undefined || The_Notebook.Deck.length < 2);
	if (Peek.hidden === true || Peek.dataset.id === Next.Id) { return; }
	Peek.dataset.id = Next.Id;
	Peek.classList.toggle("avatar", Next.Is_Channel === true);
	$("#peekImg").src = Picture_Perfect(Next);
	$("#peekImg").parentElement.style.setProperty("--pfp", Next.Is_Channel === true ? `url("${Picture_Perfect(Next)}")` : "none");
}

function Mona_Lisa() {
	const Card = $("#card");
	const Current = The_Notebook.Items.get(The_Notebook.Deck[0]);
	Card.classList.toggle("empty", Current === undefined);

	if (Current === undefined) {
		Card.dataset.id = "";
		$("#peek").dataset.id = "";
		$("#ttl").textContent = The_Notebook.Scanning === true ? "Scanning…" : "All caught up";
		$("#chn").textContent = The_Notebook.Scanning === true ? "Videos appear as they load." : "Nothing left to review here.";
		$("#samples").hidden = true;
	} else if (Current !== undefined) {
		// repaint only when the card changed, not on every update
		if (Card.dataset.id !== Current.Id) {
			Card.dataset.id = Current.Id;
			const Picture = $("#thumb");
			Picture.onerror = () => { Picture.onerror = null; Picture.src = Current.Thumb; };
			// an image that is not downloaded yet fades in instead of showing the last card's picture
			const Url = Picture_Perfect(Current);
			Picture.classList.toggle("loading", Warm.has(Url) === false);
			Picture.onload = () => Picture.classList.remove("loading");
			// a channel card shows its avatar; a video card shows the thumbnail
			Card.classList.toggle("avatar", Current.Is_Channel === true);
			// a channel banner glows with its own picture, blurred behind it
			Picture.parentElement.style.setProperty("--pfp", Current.Is_Channel === true ? `url("${Url}")` : "none");
			Picture.src = Url;
			$("#ttl").textContent = Current.Title;
			$("#chn").textContent = Current.Detail === undefined ? Current.Channel : Current.Detail;
			Show_And_Tell(Current, false);
		}
		// the next few cards are warmed up, so each swipe lands on a finished picture
		for (const Id of The_Notebook.Deck.slice(1, 4)) { Say_Cheese(The_Notebook.Items.get(Id)); }
	}
	$("#bProtect").hidden = (Current === undefined || Current.Channel === "");
	if (Current !== undefined) {
		const Safe = is_protected(Current);
		$("#bProtect").classList.toggle("on", Safe);
		$("#bProtect").setAttribute("aria-pressed", String(Safe));
		$("#bProtect").title = Safe === true ? "Protected: rules and bulk actions skip this channel (click to release)" : "Protect channel";
	}
	$("#bDiscard").disabled = (Current === undefined);
	$("#bDiscard").textContent = The_Notebook.Source === "home" ? "Not interested" : (The_Notebook.Source === "subs" ? "Unsubscribe" : "Discard");
	$("#bBlock").hidden = (Current === undefined || The_Notebook.Source !== "home");
	$("#bKeep").disabled = (Current === undefined);
	// the stamps shown while dragging say what the swipe will do
	$("#stampNo").textContent = $("#bDiscard").textContent;
	Peek_A_Boo();
}

// "One! One kept video! Ah ah ah!"
function Count_Von_Count() {
	let Count = 0;
	for (const Item of The_Notebook.Items.values()) {
		if (Item.State === "kept") { Count = Count + 1; }
	}
	return Count;
}

// "You can count on me like one, two, three"
function Count_On_Me() {
	$("#left").textContent = The_Notebook.Deck.length;
	$("#rescan").classList.toggle("busy", The_Notebook.Scanning === true);
	$("#cKeep").textContent = Count_Von_Count();
	$("#cDisc").textContent = The_Notebook.Done + The_Notebook.Queue.length;
	Light_It_Up();
	Round_And_Round();
	Where_Is_My_Mind();
}

// "Fairy lights": one string of dots, built once
function Fairy_Lights(Track) {
	for (let Dot = 0; Dot < Dots_On_The_Line; Dot++) { Track.appendChild(document.createElement("i")); }
}

// "Light it up": dots glow in step with reviewed / total
function Light_It_Up() {
	const Track = $("#track");
	if (Track.children.length === 0) { Fairy_Lights(Track); }
	// removed videos leave Items, so total = what is listed + what is already gone
	const Total = The_Notebook.Items.size + The_Notebook.Done;
	const Reviewed = Total - Still_Unjudged();
	const Ratio = Total === 0 ? 0 : Reviewed / Total;
	// a started job always shows at least one light; a finished one shows them all
	const Lit = Reviewed === 0 ? 0 : Math.min(Dots_On_The_Line, Math.max(1, Math.round(Ratio * Dots_On_The_Line)));
	for (let Dot = 0; Dot < Dots_On_The_Line; Dot++) {
		Track.children[Dot].className = Dot < Lit - 1 ? "on" : (Dot === Lit - 1 ? "on edge" : "");
	}
	Track.setAttribute("aria-valuenow", String(Math.round(Ratio * 100)));
	Track.title = `${Reviewed} of ${Total} reviewed`;
}

// "Build-A-Bear Workshop: where best friends are made"
function Build_A_Bear(Entry) {
	const Item = The_Notebook.Items.get(Entry.Id);
	const Row = document.createElement("div");
	Row.className = "row";
	Row.dataset.id = Entry.Id;
	const Picture = new Image();
	Picture.src = Item.Thumb; Picture.alt = ""; Picture.loading = "lazy";
	if (Item.Is_Channel === true) { Picture.className = "av"; }
	const Info = document.createElement("div");
	Info.innerHTML = '<div class="t"></div><div class="c"></div>';
	Info.children[0].textContent = Item.Title;
	const Chip = document.createElement("span");
	const Button = document.createElement("button");
	Button.className = "link";
	Row.append(Picture, Info, Chip, Button);
	Entry.El = Row;
	Entry.Refs = { Sub: Info.children[1], Chip, Button };
	return Row;
}

// "Stand by me" (the queue waits in line, one row per video)
function Stand_By_Me() {
	const List = $("#qList");
	for (const Entry of The_Notebook.Queue) {
		if (Entry.El === undefined) { List.appendChild(Build_A_Bear(Entry)); }
		// skip rows whose status has not changed since the last paint
		if (Entry.Shown === Entry.Status) { continue; }
		Entry.Shown = Entry.Status;
		const { Sub, Chip, Button } = Entry.Refs;
		const Who = The_Notebook.Items.get(Entry.Id);
		// a channel row already shows the name as its title, so its subtitle is just the action
		Sub.textContent = Entry.Status === "failed" ? Entry.Error : (Who.Is_Channel === true ? Verbs[Entry.Action] : Who.Channel + Verbs[Entry.Action]);
		Chip.className = "chip " + Entry.Status;
		Chip.textContent = (Entry.Action === "unsubscribe" ? So_Long_Farewell : (Entry.Action === "remove" ? Hello_My_Name_Is : Hello_Again))[Entry.Status];
		Button.hidden = (Entry.Status === "deleting");
		Button.textContent = Entry.Status === "failed" ? "Retry" : "Undo";
		Button.dataset.act = Entry.Status === "failed" ? "retry" : "undo";
	}
	const Left = The_Notebook.Queue.filter((Entry) => Entry.Status !== "failed").length;
	$("#qSummary").textContent = `${Left} left · ${The_Notebook.Done} removed` + (The_Notebook.Paused === true ? " · paused" : "") + (The_Notebook.Scanning === true ? " · scanning…" : "") + (The_Notebook.Notice === "" ? "" : " · " + The_Notebook.Notice);
	$("#qEmpty").hidden = (The_Notebook.Queue.length > 0);
}

//	=== THE FLOCKS ===	//

let Regroup_Timer = null;

// "Taste the rainbow"
function Taste_The_Rainbow() {
	const Row = $("#chips");
	Row.replaceChildren();
	for (const Flock of The_Notebook.Clusters) {
		const Chip = document.createElement("button");
		Chip.className = "flk glass";
		Chip.dataset.key = Flock.Kind + ":" + Flock.Label;
		Chip.textContent = `${Flock.Kind === "keyword" ? "#" : ""}${Flock.Label.replace(/^#+/, "")} · ${Flock.Ids.length}`;
		Row.appendChild(Chip);
	}
	Row.hidden = (The_Notebook.Clusters.length === 0);
	$("#reroll").hidden = (The_Notebook.Clusters.length === 0 || The_Notebook.Chip_Pages < 2);
	Fade_To_Black();
}

// "Roll the dice": show the next set of tags
export function Roll_The_Dice() {
	The_Notebook.Chip_Page = The_Notebook.Chip_Page + 1;
	The_Notebook.Clusters = Birds_Of_A_Feather();
	Taste_The_Rainbow();
	Spotlight();
	// the chips tumble in one after another, and the button spins once
	const Row = $("#chips");
	Row.classList.remove("rolled");
	void Row.offsetWidth;
	Row.classList.add("rolled");
	[...Row.children].forEach((Chip, Index) => Chip.style.setProperty("--i", String(Index)));
	const Button = $("#reroll");
	Button.classList.remove("spin");
	void Button.offsetWidth;
	Button.classList.add("spin");
}

// "Fade to black": soft edges show which side of the chip row has more
export function Fade_To_Black() {
	const Row = $("#chips");
	Row.classList.toggle("l", Row.scrollLeft > 4);
	Row.classList.toggle("r", Row.scrollLeft + Row.clientWidth < Row.scrollWidth - 4);
}

// "Flock together, soon": a burst of updates shares one regroup
function Flock_Together_Soon() {
	if (Regroup_Timer !== null) { return; }
	Regroup_Timer = setTimeout(() => {
		Regroup_Timer = null;
		The_Notebook.Clusters = Birds_Of_A_Feather();
		Taste_The_Rainbow();
		Spotlight();
	}, 700);
}

// "In the spotlight"
export function Spotlight() {
	const Box = $("#flock");
	const Flock = The_Notebook.Clusters.find((Each) => Each.Kind + ":" + Each.Label === The_Notebook.Open_Flock);
	// the open group may have emptied or dissolved since the last regroup
	if (Flock === undefined) { Box.hidden = true; return; }
	const Waiting = Still_Waiting(Flock).length;
	if (Waiting === 0) { Box.hidden = true; return; }
	Box.hidden = false;
	$("#flockName").textContent = Flock.Label;
	$("#flockCount").textContent = `${Waiting} to review`;
	// a bulk unsubscribe has a ceiling; above it the button stays off and Review first is the way in
	const Too_Many = (The_Notebook.Source === "subs" && Waiting > Not_So_Fast_Cap);
	$("#fDiscard").textContent = (The_Notebook.Source === "subs" ? "Unsubscribe " : "Discard ") + Waiting;
	$("#fDiscard").disabled = Too_Many;
	$("#fDiscard").title = Too_Many === true ? `Bulk unsubscribe is limited to ${Not_So_Fast_Cap} channels at a time. Use Review first.` : "";
	$("#fKeep").textContent = `Keep ${Waiting}`;
	$("#fProtect").hidden = (Flock.Kind !== "channel");
	$("#fBlock").hidden = (Flock.Kind !== "channel" || The_Notebook.Source !== "home");
}

//	=== THE COURTROOM ===	//

// "Take the stand"
export function Take_The_Stand() {
	const Plan = I_Am_The_Law();
	const List = $("#ruleList");
	List.replaceChildren();
	for (const Rule of The_Notebook.Rules) {
		const Kind = Rule_Types[Rule.Type];
		const Row = document.createElement("div");
		Row.className = "rule";
		const Text = document.createElement("span");
		Text.textContent = `${Kind.Label}${Kind.Needs_Value === true ? ": " + Rule.Value : ""} · ${Plan.Per_Rule.get(Rule.Id)} match`;
		const Button = document.createElement("button");
		Button.className = "link";
		Button.textContent = "Remove";
		Button.dataset.rule = Rule.Id;
		Row.append(Text, Button);
		List.appendChild(Row);
	}
	const Roster = $("#presetList");
	Roster.replaceChildren();
	for (const Fighter of whole_roster()) {
		const Chip = document.createElement("button");
		Chip.className = "flk glass";
		Chip.textContent = Fighter.Name;
		Chip.title = `${Fighter.Rules.length} rule(s) · format: ${Formats[Fighter.Format]}`;
		Chip.dataset.fighter = Fighter.Name;
		Roster.appendChild(Chip);
		if (Fighter.Built_In !== true) {
			const Retire = document.createElement("button");
			Retire.className = "flk glass retire";
			Retire.textContent = "✕";
			Retire.title = `Delete the setup "${Fighter.Name}"`;
			Retire.setAttribute("aria-label", Retire.title);
			Retire.dataset.retire = Fighter.Name;
			Roster.appendChild(Retire);
		}
	}
	const Locked = $("#protList");
	Locked.replaceChildren();
	for (const Name of The_Notebook.Protected) {
		const Chip = document.createElement("button");
		Chip.className = "flk glass";
		Chip.textContent = Name + "  ✕";
		Chip.dataset.prot = Name;
		Locked.appendChild(Chip);
	}
	let Note = The_Notebook.Deck.length === 0 ? "Load a source to preview what the rules would remove." : `${Plan.Ids.size} videos would be queued.`;
	if (The_Notebook.Format !== "all") { Note = Note + ` Only the ${Formats[The_Notebook.Format].toLowerCase()} view is checked.`; }
	if (Plan.Protected_Skipped > 0) { Note = Note + ` ${Plan.Protected_Skipped} skipped (protected).`; }
	if (Plan.No_Date > 0) { Note = Note + ` ${Plan.No_Date} have no readable date, so "older than" skips them.`; }
	$("#planNote").textContent = Note;
	$("#applyRules").disabled = (Plan.Ids.size === 0);
}

// "Sign on the door": the landing page summary
export function Sign_On_The_Door() {
	const Rule_Word = The_Notebook.Rules.length === 1 ? "rule" : "rules";
	const Channel_Word = The_Notebook.Protected.length === 1 ? "protected channel" : "protected channels";
	$("#lawLine").textContent = `${The_Notebook.Rules.length} ${Rule_Word} · ${The_Notebook.Protected.length} ${Channel_Word} · edit`;
}

// "Round and round": the dial ring fills as the review moves on
function Round_And_Round() {
	const Total = The_Notebook.Items.size + The_Notebook.Done;
	const Reviewed = Total - Still_Unjudged();
	const Percent = Total === 0 ? 0 : Math.round((Reviewed / Total) * 100);
	// the ring is measured in hundredths, so the dash offset is simply what is still left
	$("#arc").style.strokeDashoffset = String(100 - Percent);
	$("#pct").textContent = `${Percent}%`;
}

// "Where is my mind?": the card's place in the deck, like a coordinate readout
function Where_Is_My_Mind() {
	const Total = The_Notebook.Items.size + The_Notebook.Done;
	const Here = Math.min(Total, Total - Still_Unjudged() + 1);
	$("#pos").textContent = `${String(Math.max(0, Here)).padStart(3, "0")} / ${String(Total).padStart(3, "0")}`;
}

//	=== SHOW AND TELL ===	//

// "Show and tell": up to three videos you watched or liked from the channel on the card
export function Show_And_Tell(Item, Animate) {
	const Box = $("#samples");
	// only a channel card (the Subscriptions audit) has anything to show
	Box.hidden = (Item === undefined || Item.Is_Channel !== true);
	if (Box.hidden === true) { return; }
	const Grid = $("#sGrid");
	Grid.replaceChildren();
	const Plain = (Text) => {
		const Note = document.createElement("p");
		Note.className = "smsg";
		Note.textContent = Text;
		return Note;
	};
	if (Item.Samples === null || Item.Samples === undefined) {
		$("#sNext").hidden = true;
		Grid.appendChild(Plain("Scan Watch history and Liked videos to see what you watched here."));
		return;
	} else if (Item.Samples.length === 0) {
		$("#sNext").hidden = true;
		Grid.appendChild(Plain("Nothing from this channel in your last scans of history and likes."));
		return;
	}
	$("#sNext").hidden = (Item.Samples.length <= Samples_Per_Page);
	const Pages = Math.ceil(Item.Samples.length / Samples_Per_Page);
	const Start = (Item.Sample_Page % Pages) * Samples_Per_Page;
	const Page = Item.Samples.slice(Start, Start + Samples_Per_Page);
	// a short last page borrows from the front, so there are always three to look at
	if (Page.length < Samples_Per_Page && Item.Samples.length > Samples_Per_Page) { Page.push(...Item.Samples.slice(0, Samples_Per_Page - Page.length)); }
	Page.forEach((Sample, Index) => {
		const Tile = document.createElement("div");
		Tile.className = "stile" + (Sample.Short === true ? " short" : "") + (Animate === true ? " turned" : "");
		Tile.style.setProperty("--i", String(Index));
		const Picture = new Image();
		Picture.src = `https://i.ytimg.com/vi/${Sample.Id}/mqdefault.jpg`;
		Picture.alt = "";
		Picture.draggable = false;
		const Badge = document.createElement("span");
		Badge.className = "sbadge";
		Badge.textContent = Sample.Short === true ? "short" : (Sample.Tag === "liked" ? "♥ liked" : "watched");
		const Name = document.createElement("p");
		Name.textContent = Sample.Title;
		const Frame = document.createElement("div");
		Frame.className = "sthumb";
		Frame.append(Picture, Badge);
		Tile.append(Frame, Name);
		Grid.appendChild(Tile);
	});
}

// "Turn the page": the next three sample videos, wrapping back to the first
export function Turn_The_Page() {
	const Item = The_Notebook.Items.get(The_Notebook.Deck[0]);
	if (Item === undefined || Item.Samples === null || Item.Samples === undefined || Item.Samples.length === 0) { return; }
	Item.Sample_Page = Item.Sample_Page + 1;
	Show_And_Tell(Item, true);
}
