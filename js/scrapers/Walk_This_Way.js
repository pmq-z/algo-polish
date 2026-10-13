//	===================== 	//
//		WALK THIS WAY	 	//
//	=====================	//

//	=== WAITING ===	//

var Max_Quiet_Passes = 5;  // the scan ends after this many passes with nothing new and no "more is coming" spinner
var Max_Patient_Passes = 25; // with the spinner still showing, a visible tab waits this long (a slow network is not the end of the list)
var Hidden_Trust_Max = 30; // a hidden tab's answer is only believed for lists this small (a hidden tab cannot prove a long list ended)
var Hidden_Wait_Passes = 600; // a visible-mode scan whose tab was hidden waits for it (up to ~10 minutes) instead of giving up
var Hidden_Patience = 4;   // a hidden tab gives up sooner: if it has not grown by now, it will not (the app brings the tab forward)
var First_Paint_Ms = 20000; // how long to wait for the page to draw its first rows (a reload in a hidden tab can be slow)

// "Take five"
function Take_Five(Ms) {
	return new Promise((Done) => setTimeout(Done, Ms));
}

// "Wait for it..." (timers are throttled in background tabs, DOM watchers are not)
function Wait_For_It(Test, Timeout_Ms) {
	return new Promise((Resolve) => {
		const Hit = Test();
		if (Hit !== null) { Resolve(Hit); return; }
		const Done = (Value) => { Watcher.disconnect(); clearTimeout(Timer); Resolve(Value); };
		const Watcher = new MutationObserver(() => {
			const Found = Test();
			if (Found !== null) { Done(Found); }
		});
		const Timer = setTimeout(() => Done(Test()), Timeout_Ms);
		Watcher.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
	});
}

// "Did you hear that?"
function Did_You_Hear_That(Timeout_Ms) {
	return new Promise((Resolve) => {
		const Watcher = new MutationObserver(() => { Watcher.disconnect(); clearTimeout(Timer); Resolve(true); });
		const Timer = setTimeout(() => { Watcher.disconnect(); Resolve(false); }, Timeout_Ms);
		Watcher.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
	});
}

//	=== SCROLLING ===	//

// "Pick up the pieces"
function Pick_Up_The_Pieces(Seen, Source) {
	// rows already collected are skipped before the costly reading, so a 4,000-row page does not get slower every pass
	const Fresh = (Source === "subs" ? Wont_You_Be_My_Neighbor() : Connect_The_Dots(Seen)).filter((Item) => Seen.has(Item.Id) === false);
	for (const Item of Fresh) { Seen.set(Item.Id, Item); }
	if (Fresh.length > 0) { chrome.runtime.sendMessage({ Type: "Algo_Progress", Items: Fresh }).catch(() => {}); }
	return Fresh.length;
}

// "Look again": rows already collected get a second look now that the page has settled
function Look_Again(Seen) {
	for (const Fresh of Connect_The_Dots()) {
		const Old = Seen.get(Fresh.Id);
		if (Old === undefined) { continue; }
		if (Fresh.Is_Short === true && Old.Is_Short !== true) { Old.Is_Short = true; Old.Short_Signal = Fresh.Short_Signal; }
		if (Old.Duration_Sec === -1 && Fresh.Duration_Sec > -1) { Old.Duration_Sec = Fresh.Duration_Sec; }
		if (Old.Date_Label === "" && Fresh.Date_Label !== "") { Old.Date_Label = Fresh.Date_Label; }
	}
}

// plain check: does YouTube still show its "more is coming" spinner?
function list_has_more() {
	return document.querySelector(Treasure_Map.More_Spinner) !== null;
}

// "Waiting on the world to change": a tab that is not on screen cannot load more rows, so a scan that was meant to run visibly waits for it
function Waiting_On_The_World(Ms) {
	return new Promise((Resolve) => {
		const Done = () => { document.removeEventListener("visibilitychange", Check); clearTimeout(Timer); Resolve(); };
		const Check = () => { if (document.visibilityState === "visible") { Done(); } };
		const Timer = setTimeout(Done, Ms);
		document.addEventListener("visibilitychange", Check);
	});
}

// "The Neverending Story"
async function Never_Ending_Story(Cap, Source, Hidden_Ok) {
	/*
		scroll down, scroll again
		the list has no end, they say
		yet here is the floor
	*/
	const Seen = new Map();
	let Quiet_Passes = 0;
	let Hidden_Waits = 0;
	const Started_At = Date.now();
	let Passes = 0;
	// the page may still be drawing its first rows: wait for them instead of counting empty passes
	await Wait_For_It(() => ((Source === "subs" ? Round_Up_The_Neighbors() : Round_Up_The_Usual_Suspects()).length > 0 ? true : null), First_Paint_Ms);
	// the Home feed never ends, so it gets a cap; the other lists run to the end
	const Limit = Cap === undefined ? Infinity : Cap;

	const Is_Hidden = () => (Hidden_Ok === true && document.visibilityState === "hidden");
	// the number of quiet passes that counts as "the end" depends on whether YouTube still promises more
	const Quiet_Limit = () => (list_has_more() === true ? (Is_Hidden() === true ? Hidden_Patience : Max_Patient_Passes) : Max_Quiet_Passes);

	// n-1 scrolling passes; the last look happens after the loop
	while (Quiet_Passes < Quiet_Limit() - 1 && Seen.size < Limit) {
		Passes = Passes + 1;
		// a visible-mode scan whose tab was sent to the background (the person switched tabs): wait for it to come back, do not count it as the end
		if (Hidden_Ok !== true && document.visibilityState === "hidden" && Hidden_Waits < Hidden_Wait_Passes) {
			Hidden_Waits = Hidden_Waits + 1;
			await Waiting_On_The_World(1000);
			continue;
		}
		const Caught = Pick_Up_The_Pieces(Seen, Source);
		if (Caught > 0) { Quiet_Passes = 0; }
		else if (Caught === 0) { Quiet_Passes = Quiet_Passes + 1; }
		const Links = Source === "subs" ? Round_Up_The_Neighbors() : Round_Up_The_Usual_Suspects();
		if (Links.length > 0) { Links[Links.length - 1].scrollIntoView({ block: "end" }); }
		window.scrollTo(0, document.documentElement.scrollHeight);
		await Take_Five(1000);
	}
	// act once more: the final scroll may have loaded one last batch
	Pick_Up_The_Pieces(Seen, Source);
	// badges and labels often paint after the row appears: read the rows again and only ever upgrade ("this is a Short")
	if (Source !== "subs") { Look_Again(Seen); }
	window.scrollTo(0, 0);
	// a hidden tab can stop YouTube from loading more: if the spinner is still there, ask for the tab to be brought forward
	// a hidden tab cannot prove the list ended: a full first batch (100, 200...) with no growth is treated as a stall too
	// (a hidden tab cannot prove a list ended, so anything but a short list is passed to a visible rescan)
	const Stalled = (Is_Hidden() === true && Seen.size < Limit && (list_has_more() === true || Seen.size === 0 || Seen.size >= Hidden_Trust_Max));
	// the scan stopped while YouTube still offered more: the answer may be short, and a rescan carries on
	const Incomplete = (Source !== "home" && Stalled === false && list_has_more() === true && Seen.size < Limit);
	return {
		Needs_Focus: Stalled,
		Incomplete,
		Items: [...Seen.values()],
		Debug: {
			Url: location.href,
			Hidden: document.visibilityState === "hidden",
			Passes,
			Seconds: Math.round((Date.now() - Started_At) / 1000),
			Spinner_At_End: list_has_more(),
			Video_Links: Round_Up_The_Usual_Suspects().length,
			Shorts_Found: [...Seen.values()].filter((Item) => Item.Is_Short === true).length,
			Renderers: document.querySelectorAll(Treasure_Map.Debug_Counters.Renderers).length,
			Lockups: document.querySelectorAll(Treasure_Map.Debug_Counters.Lockups).length,
			Channels: document.querySelectorAll(Treasure_Map.Debug_Counters.Channels).length,
		},
	};
}

//	=== FORGETTING SEARCHES ===	//

// plain helper: the first selector in a list that finds something
function first_hit(Selectors, Root) {
	for (const Selector of Selectors) {
		const Found = Root.querySelector(Selector);
		if (Found !== null) { return Found; }
	}
	return null;
}

// "Stop making sense": the remembered-search rows that carry a Remove control, each paired with that control
function Stop_Making_Sense() {
	const Pairs = [];
	const Seen = new Set();
	for (const Selector of Treasure_Map.Search_Rows) {
		for (const Row of document.querySelectorAll(Selector)) {
			if (Seen.has(Row) === true) { continue; }
			Seen.add(Row);
			const Candidates = [...Row.querySelectorAll(Treasure_Map.Search_Remove.join(","))];
			const Control = Candidates.find((Each) => Treasure_Map.Words.remove.test((Each.getAttribute("aria-label") || "") + " " + Each.textContent + " " + Each.className)) || null;
			if (Control !== null) { Pairs.push({ Row, Control }); }
		}
		if (Pairs.length > 0) { break; }
	}
	return Pairs;
}

// "Search and destroy": click the empty search box, then remove every remembered search it offers, one at a time
async function Search_And_Destroy() {
	/*
		an empty box, a click
		the old questions rise like smoke
		one by one, they go
	*/
	const Box = first_hit(Treasure_Map.Search_Input, document);
	if (Box === null) { return { Ok: false, Error: "The YouTube search box was not found on this page." }; }
	let Removed = 0;
	let Stuck = 0;
	Box.focus();
	Box.value = "";
	Box.dispatchEvent(new Event("input", { bubbles: true }));
	Box.click();
	// suggestions appear a moment after the click; none at all means there is nothing to clear (or the history is off)
	let Pairs = await Wait_For_It(() => { const Now = Stop_Making_Sense(); return Now.length > 0 ? Now : null; }, 4000);
	while (Pairs !== null && Pairs.length > 0 && Stuck < 3 && Removed < 300) {
		const Count_Before = Pairs.length;
		Pairs[0].Control.click();
		// some layouts ask "remove from search history?"
		const Confirm = await Wait_For_It(() => [...document.querySelectorAll(Treasure_Map.Dialog_Buttons)].find((Each) => Treasure_Map.Words.remove.test((Each.getAttribute("aria-label") || "") + " " + Each.textContent)) || null, 700);
		if (Confirm !== null) { Confirm.click(); }
		// the row goes away (a new one may slide in): wait for the list to change
		const Changed = await Wait_For_It(() => (Pairs[0].Row.isConnected === false || Stop_Making_Sense().length !== Count_Before ? true : null), 2500);
		if (Changed === null) { Stuck = Stuck + 1; }
		else { Removed = Removed + 1; Stuck = 0; }
		Box.focus();
		Pairs = await Wait_For_It(() => { const Now = Stop_Making_Sense(); return Now.length > 0 ? Now : null; }, 1500);
	}
	Box.blur();
	document.body.click();
	if (Stuck >= 3) { return { Ok: true, Removed, Partial: true }; }
	return { Ok: true, Removed, Partial: false };
}

//	=== REMOVING ===	//

// "Open Pandora's box"
function Pandoras_Box(Row) {
	const Menu = Plan_B(Row, Treasure_Map.Menu_Button);
	if (Menu !== null) { return Menu; }
	const Last_Resort = [...Row.querySelectorAll("button")].pop();
	return Last_Resort === undefined ? null : Last_Resort;
}

// "Say the magic word"
function Say_The_Magic_Word(Words) {
	const Items = [...document.querySelectorAll(Treasure_Map.Menu_Items)];
	const Hit = Items.reverse().find((Item) => Words.test(Item.textContent));
	return Hit === undefined ? null : Hit;
}

// "Hasta la vista, baby"
function find_channel_row(Id) {
	return Round_Up_The_Neighbors().find((Row) => {
		const Link = Plan_B(Row, Treasure_Map.Channel_Main_Link);
		return Link !== null && channel_key(Link.getAttribute("href")) === Id;
	});
}

function find_target(Id, Source) {
	return Source === "subs" ? find_channel_row(Id) : find_anchor(Id);
}

function find_anchor(Id) {
	return [...document.querySelectorAll(Treasure_Map.Link_For(Id))].find((Link) => Whos_That_Pokemon(Link) === Id && Link.closest(Treasure_Map.Excluded) === null);
}

async function Dig_A_Little_Deeper(Id, Source) {
	/*
		not here, not just yet
		the list is longer than it looks
		down we go once more
	*/
	// the row may not be loaded yet: scroll down in passes until it shows up or the list ends
	let Passes = 0;
	let Last_Height = -1;
	while (Passes < 40) {
		const Found = find_target(Id, Source);
		if (Found !== undefined) { return Found; }
		const Height = document.documentElement.scrollHeight;
		// the page stopped growing twice in a row: this is the floor
		if (Height === Last_Height && Passes > 1) { break; }
		Last_Height = Height;
		window.scrollTo(0, Height);
		// DOM watcher, not a timer: background tabs throttle timers
		const Arrived = await Wait_For_It(() => (find_target(Id, Source) === undefined ? null : true), 1500);
		if (Arrived !== null) { return find_target(Id, Source); }
		Passes = Passes + 1;
	}
	return find_target(Id, Source);
}

async function Trust_But_Verify(Id, Source) {
	// the history list drops the row when the removal works; Liked keeps it until a reload, Home swaps it for a notice
	if (Source !== "history") { await Did_You_Hear_That(600); return { Ok: true, Verified: false }; }
	const Gone = await Wait_For_It(() => (find_anchor(Id) === undefined ? true : null), 3000);
	if (Gone === null) { return { Ok: false, Error: "YouTube did not confirm the removal. Try again." }; }
	return { Ok: true, Verified: true };
}

function Subscribed_Or_Not(Row) {
	/*
		to be, or not to be
		the button knows which one it is
		read it, then decide
	*/
	// the renderer carries a flag while you are subscribed
	if (Row.querySelector(Treasure_Map.Subscribed_Flag) !== null) { return "subscribed"; }
	const Button = Plan_B(Row, Treasure_Map.Subscribe_Button);
	if (Button === null) { return "unknown"; }
	const Label = (Button.getAttribute("aria-label") || "") + " " + Button.textContent;
	// "Unsubscribe from X" or "Subscribed" both mean you are in
	if (Treasure_Map.Words.unsubscribe.test(Label) === true || Treasure_Map.Words.subscribed.test(Label) === true) { return "subscribed"; }
	if (Treasure_Map.Words.subscribe.test(Button.textContent) === true || Treasure_Map.Words.subscribe.test(Button.getAttribute("aria-label") || "") === true) { return "not"; }
	return "unknown";
}

async function Thank_U_Next(Id, Source) {
	/*
		thank you, goodbye
		the little bell has stopped its ring
		one less voice in the room
	*/
	const Row = await Dig_A_Little_Deeper(Id, Source);
	if (Row === undefined) { return { Ok: false, Error: "Channel not found on the page. Try rescanning." }; }
	Row.scrollIntoView({ block: "center" });

	// a click on "Subscribe" would subscribe you, so the state is read before anything is clicked
	const State = Subscribed_Or_Not(Row);
	if (State === "not") { return { Ok: true, Verified: true }; }
	else if (State === "unknown") { return { Ok: false, Error: "Could not tell whether you are subscribed to this channel (page language not recognised), so nothing was clicked." }; }

	const Button = Plan_B(Row, Treasure_Map.Subscribe_Button);
	Button.click();
	await Did_You_Hear_That(400);
	const Item = await Wait_For_It(() => Say_The_Magic_Word(Treasure_Map.Words.unsubscribe), 3000);
	if (Item === null) { document.body.click(); return { Ok: false, Error: "The Unsubscribe entry was not found in the menu." }; }
	Item.click();

	// YouTube asks "Unsubscribe from X?"; some layouts skip the question
	const Confirm = await Wait_For_It(() => [...document.querySelectorAll(Treasure_Map.Dialog_Buttons)].find((Each) => Treasure_Map.Words.unsubscribe.test((Each.getAttribute("aria-label") || "") + " " + Each.textContent)) || null, 2500);
	if (Confirm !== null) { Confirm.click(); }

	// trust, but verify: the button must no longer say "subscribed"
	const Changed = await Wait_For_It(() => {
		const Fresh = find_channel_row(Id);
		if (Fresh === undefined) { return true; }
		return Subscribed_Or_Not(Fresh) === "subscribed" ? null : true;
	}, 4000);
	if (Changed === null) { return { Ok: false, Error: "YouTube did not confirm the unsubscribe. Try again." }; }
	return { Ok: true, Verified: true };
}

async function Hasta_La_Vista_Baby(Id, Source, Action) {
	/*
		tap the little dots
		a small door swings open wide
		out goes the old song
	*/
	const Words = Treasure_Map.Words[Action];
	if (Words === undefined) { return { Ok: false, Error: "Unknown action: " + Action }; }
	// the tab must still be on the page it was scanned from
	if (are_we_there_yet(Source) === false) { return { Ok: false, Error: "The YouTube tab left the page it was scanned from." }; }
	// unsubscribing is its own routine, with its own safety checks
	if (Action === "unsubscribe") { return Thank_U_Next(Id, Source); }
	const Anchor = await Dig_A_Little_Deeper(Id, Source);
	if (Anchor === undefined) { return { Ok: false, Error: "Video not found on the page. Try rescanning." }; }

	const Row = Climb_Every_Mountain(Anchor);
	Row.scrollIntoView({ block: "center" });

	// history rows carry their own remove button, no menu needed
	const Direct = [...Row.querySelectorAll(Treasure_Map.Direct_Button)].find((Button) => Treasure_Map.Words.remove.test(Button.getAttribute("aria-label")));
	// only a plain removal has a direct button; the Home feed always goes through the menu
	if (Action === "remove" && Direct !== undefined) { Direct.click(); return Trust_But_Verify(Id, Source); }

	const Box = Pandoras_Box(Row);
	if (Box === null) { return { Ok: false, Error: "Menu button not found." }; }
	Box.click();
	await Did_You_Hear_That(400);  // let YouTube start filling the menu before reading it
	const Item = await Wait_For_It(() => Say_The_Magic_Word(Words), 3000);
	if (Item === null) {
		document.body.click();
		return { Ok: false, Error: `The menu item for "${Action}" was not found.` };
	}
	Item.click();
	return Trust_But_Verify(Id, Source);
}
