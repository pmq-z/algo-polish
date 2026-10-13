//	==================== //
//		SHAKE IT OFF	 //
//	==================== //

//	=== IMPORTS ===	//

import { The_Notebook, The_Line_In_The_Sand } from "../core/The_Notebook.js";

const Peek_Gap = 22;   // how far the waiting card shows above the top one (must match the CSS)

//	=== SETTINGS ===	//

const Flight_Ms = 460;                                  // a swipe's trip to the queue or the kept counter
const Spring = "cubic-bezier(.34, 1.56, .64, 1)";       // overshoots a little, then settles
const Resting = "translate(0px, 0px) rotate(0deg) scale(1)";
// must match the card's transform-origin in the CSS (50% 120%)
const Pivot = 1.2;

// plain check: people who ask for less motion get none
function calm() {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches === true;
}

// plain helper: the middle of an element on screen
function centre_of(Element) {
	const Box = Element.getBoundingClientRect();
	return { x: Box.left + Box.width / 2, y: Box.top + Box.height / 2 };
}

//	=== WINDING UP ===	//

// "Wind it up": a key or button press leans the card toward its verdict first (tilt, stamp, the card behind stirs), then the flight begins
export function Wind_It_Up(Card, Action) {
	if (calm() === true) { return Promise.resolve(); }
	const Reach = The_Line_In_The_Sand * 0.7;
	Card.getAnimations().forEach((Playing) => Playing.cancel());
	Card.style.transition = "transform .16s cubic-bezier(.2, .8, .3, 1)";
	if (Action === "keep") { Lean_On_Me(Card, Reach, 0); }
	else if (Action === "discard") { Lean_On_Me(Card, -Reach, 0); }
	// a block dips straight down
	else if (Action === "block") { Lean_On_Me(Card, 0, Reach * 1.6); }
	return new Promise((Done) => setTimeout(Done, 170));
}

//	=== LEAVING ===	//

// "Ghost Rider": a copy of the card stays on screen and rides off, while the real card moves on to the next video
export function Ghost_Rider(Card) {
	const From = Card.style.transform === "" ? Resting : Card.style.transform;
	// measure the card at rest, so the copy starts exactly where the card sat
	Card.style.transition = "none";
	Card.style.transform = "";
	const Layout = Card.getBoundingClientRect();
	const Ghost = Card.cloneNode(true);
	// duplicate ids would confuse every later lookup
	Ghost.removeAttribute("id");
	Ghost.querySelectorAll("[id]").forEach((Part) => Part.removeAttribute("id"));
	Ghost.classList.add("ghost");
	Ghost.style.cssText = `left:${Layout.left}px;top:${Layout.top}px;width:${Layout.width}px;height:${Layout.height}px;transform:${From};`
		+ `--no:${Card.style.getPropertyValue("--no") || 0};--yes:${Card.style.getPropertyValue("--yes") || 0};`;
	// the frame sizes itself from the stage, which the copy no longer sits in
	const Frame = Ghost.querySelector(".frame");
	Frame.style.width = Card.querySelector(".frame").getBoundingClientRect().width + "px";
	document.body.appendChild(Ghost);
	Ghost.Layout = Layout;
	Ghost.From = From;
	// how far the waiting card had grown while the top card was being dragged away
	Ghost.Lift = parseFloat(document.querySelector(".deckwrap").style.getPropertyValue("--lift")) || 0;
	return Ghost;
}

// "Where do we go from here?": the spot a swipe lands on, and the element that should react when it arrives
function Where_Do_We_Go_From_Here(Action, Row) {
	if (Action === "keep") {
		const Node = document.querySelector("#main .nodes .node:last-child");
		if (Node !== null) { return { ...centre_of(Node), Scale: 0.12, Turn: 10, Pulse: [document.querySelector("#cKeep")] }; }
	} else if (Action !== "keep") {
		const List = document.querySelector("#qList");
		const Summary = document.querySelector("#qSummary");
		// land on the new row when it is in view, otherwise on the queue's heading
		if (Row !== undefined && List !== null) {
			const Inside = List.getBoundingClientRect();
			const Spot = centre_of(Row);
			if (Spot.y > Inside.top && Spot.y < Inside.bottom) { return { ...Spot, Scale: 0.14, Turn: -8, Pulse: [Summary, document.querySelector("#cDisc")] }; }
		}
		if (Summary !== null) { return { ...centre_of(Summary), Scale: 0.14, Turn: -8, Pulse: [Summary, document.querySelector("#cDisc")] }; }
	}
	// nowhere to land (the panel is hidden): just fly out sideways
	return { x: window.innerWidth * (Action === "keep" ? 1.2 : -0.2), y: window.innerHeight / 2, Scale: 0.5, Turn: Action === "keep" ? 14 : -14, Pulse: [] };
}

// "Fly me to the moon": the ghost shrinks into the queue (or the kept counter) and is gone
// "Freeze frame": the glass stops blurring while things move, then thaws (the backdrop is soft, so nothing visibly changes)
let Thaw_Timer = 0;
export function Freeze_Frame(Ms) {
	document.documentElement.classList.add("moving");
	clearTimeout(Thaw_Timer);
	Thaw_Timer = setTimeout(() => document.documentElement.classList.remove("moving"), Ms);
}

export function Fly_Me_To_The_Moon(Ghost, Action, Row) {
	Freeze_Frame(1100);
	const Aim = Where_Do_We_Go_From_Here(Action, Row);
	const Done = () => { Ghost.remove(); for (const Part of Aim.Pulse) { Make_Some_Noise(Part); } };
	if (calm() === true) { Done(); return Promise.resolve(); }

	const Box = Ghost.Layout;
	// the card pivots below its middle, so scaling moves it; solve for where the pivot must go
	const Pivot_X = Box.left + Box.width / 2;
	const Pivot_Y = Box.top + Box.height * Pivot;
	const Dx = Aim.x - Pivot_X;
	const Dy = Aim.y - Pivot_Y + Aim.Scale * Box.height * (Pivot - 0.5);
	Ghost.style.setProperty(Action === "keep" ? "--yes" : "--no", 1);
	const Flight = Ghost.animate([
		{ transform: Ghost.From, opacity: 1 },
		{ opacity: 1, offset: 0.7 },
		{ transform: `translate(${Dx}px, ${Dy}px) rotate(${Aim.Turn}deg) scale(${Aim.Scale})`, opacity: 0 },
	], { duration: Flight_Ms, easing: "cubic-bezier(.55, .05, .25, 1)", fill: "forwards" });
	// a cancelled flight (page hidden, tab closed) still cleans up
	return Flight.finished.catch(() => {}).then(Done);
}

//	=== ARRIVING ===	//

// "Jump around": the card that was waiting behind steps forward, starting exactly where it stood
export function Jump_Around(Card, Lift) {
	const Wrap = document.querySelector(".deckwrap");
	if (calm() === true || Card.classList.contains("empty") === true) { Wrap.classList.remove("dragging"); return; }
	const Start = Lift === undefined ? 0 : Lift;
	const Size = 0.94 + 0.06 * Start;
	// the card pivots below its middle, so match the waiting card's top edge by solving for the shift
	const Shift = -Peek_Gap * (1 - Start) - Pivot * Card.offsetHeight * (1 - Size);
	Card.animate([
		{ transform: `translate(0px, ${Shift}px) rotate(0deg) scale(${Size})`, filter: `brightness(${0.75 + 0.25 * Start})`, opacity: 0.6 + 0.4 * Start },
		{ transform: Resting, filter: "brightness(1)", opacity: 1 },
	], { duration: 620, easing: Spring });
	// the frosted look the waiting card had melts away with it: the picture sharpens and the glass sheen fades
	const Frost = 1 - Start;
	const Frame = Card.querySelector(".frame");
	Frame.querySelector("img").animate([
		{ filter: `blur(${10 * Frost}px)`, transform: `scale(${1 + 0.12 * Frost})` },
		{ filter: "blur(0px)", transform: "scale(1)" },
	], { duration: 620, easing: "cubic-bezier(.2, .8, .2, 1)" });
	Frame.animate([{ opacity: Frost }, { opacity: 0 }], { duration: 620, easing: "cubic-bezier(.2, .8, .2, 1)", pseudoElement: "::after" });
	// the title and channel follow a beat later, sliding up
	for (const Part of Card.querySelectorAll("h2, #chn")) {
		Part.animate([{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 420, delay: 140, easing: "cubic-bezier(.2, .8, .2, 1)", fill: "backwards" });
	}
	// a fresh card slides into the waiting place behind
	const Peek = document.querySelector("#peek");
	if (Peek.hidden === false) {
		Peek.animate([{ opacity: 0, transform: `translateY(${Peek_Gap + 26}px) scale(.86)` }], { duration: 520, delay: 180, easing: Spring, fill: "backwards" });
	}
	// the stack animates by itself again once this frame is painted
	requestAnimationFrame(() => Wrap.classList.remove("dragging"));
}

// "Come back to me": an undone card slides back in from the side it left
export function Come_Back_To_Me(Card, Direction) {
	if (calm() === true || Card.classList.contains("empty") === true) { return; }
	Card.animate([
		{ transform: `translate(${Direction * 110}px, 0px) rotate(${Direction * 9}deg) scale(.9)`, opacity: 0 },
		{ transform: Resting, opacity: 1 },
	], { duration: 480, easing: Spring });
}

// "Make some noise": a quick pulse on whatever just received something
export function Make_Some_Noise(Part) {
	if (Part === null || Part === undefined || calm() === true) { return; }
	Part.classList.remove("pulse");
	// reading a layout value restarts the animation if it was already running
	void Part.offsetWidth;
	Part.classList.add("pulse");
	Part.addEventListener("animationend", () => Part.classList.remove("pulse"), { once: true });
}

//	=== DRAGGING ===	//

// "Lean on me": the card follows the pointer, tilts, and its stamp fades in
export function Lean_On_Me(Card, Dx, Dy) {
	const Tilt = Math.max(-16, Math.min(16, Dx / 16));
	Card.style.transform = `translate(${Dx}px, ${Dy * 0.25}px) rotate(${Tilt}deg) scale(1)`;
	const Pull = Math.min(1, Math.abs(Dx) / (The_Line_In_The_Sand * 0.9));
	Card.style.setProperty("--no", Dx < 0 ? Pull : 0);
	Card.style.setProperty("--yes", Dx > 0 ? Pull : 0);
	// the card waiting behind grows toward full size as this one leaves
	const Wrap = document.querySelector(".deckwrap");
	Wrap.classList.add("dragging");
	Wrap.style.setProperty("--lift", Pull * 0.8);
	// past halfway, the place the card is heading for lights up
	const Close = Math.abs(Dx) > The_Line_In_The_Sand * 0.6;
	document.querySelector(".qpanel").classList.toggle("aim", Close === true && Dx < 0);
	document.querySelector("#main .nodes .node:last-child").classList.toggle("aim", Close === true && Dx > 0);
}

// "Back to square one": the card returns to rest (springing, unless it is being replaced)
export function Back_To_Square_One(Card, Springy) {
	Card.style.transition = Springy === true ? `transform .5s ${Spring}` : "none";
	Card.style.transform = "";
	Card.style.setProperty("--no", 0);
	Card.style.setProperty("--yes", 0);
	// a snap-back eases the waiting card down; a swipe resets it at once (Jump_Around hands control back)
	const Wrap = document.querySelector(".deckwrap");
	Wrap.style.setProperty("--lift", 0);
	if (Springy === true) { Wrap.classList.remove("dragging"); }
	else if (Springy !== true) { Wrap.classList.add("dragging"); }
	document.querySelector(".qpanel").classList.remove("aim");
	document.querySelector("#main .nodes .node:last-child").classList.remove("aim");
}

// "Drag me down"
export function Drag_Me_Down(Card, On_Verdict) {
	let Start = null;

	Card.onpointerdown = (Event) => {
		// no dragging while a swipe is being filed or the deck is empty
		if (The_Notebook.Busy === true || The_Notebook.Deck.length === 0) { return; }
		// a spring still playing would hold the card in place against the pointer
		Card.getAnimations().forEach((Playing) => Playing.cancel());
		Start = { x: Event.clientX, y: Event.clientY };
		Freeze_Frame(60000);
		Card.setPointerCapture(Event.pointerId);
		Card.style.transition = "none";
	};

	Card.onpointermove = (Event) => {
		if (Start === null) { return; }
		Lean_On_Me(Card, Event.clientX - Start.x, Event.clientY - Start.y);
	};

	Card.onpointerup = (Event) => {
		if (Start === null) { return; }
		const Dx = Event.clientX - Start.x;
		Start = null;
		Freeze_Frame(1100);
		if (Dx > The_Line_In_The_Sand) { On_Verdict("keep"); }
		else if (Dx < -The_Line_In_The_Sand) { On_Verdict("discard"); }
		else if (Math.abs(Dx) <= The_Line_In_The_Sand) { Back_To_Square_One(Card, true); }
	};

	// an interrupted drag (a call, a gesture) counts as "not far enough"
	Card.onpointercancel = () => {
		if (Start === null) { return; }
		Start = null;
		Freeze_Frame(600);
		Back_To_Square_One(Card, true);
	};
}

//	=== BRINGING A ROW BACK ===	//

// "Bring it on home": drag a queue row onto the card to review that video again
export function Bring_It_On_Home(List, On_Drop) {
	let Held = null;

	// plain check: a row can only come back before its removal is under way
	const can_return = (Entry) => Entry !== undefined && Entry.Status !== "deleting";

	// the browser's own image-drag would steal the gesture and cancel ours
	List.ondragstart = (Event) => Event.preventDefault();

	List.onpointerdown = (Event) => {
		const Row = Event.target.closest(".row");
		// buttons inside a row (Undo, Retry) keep their own click
		if (Row === null || Event.target.closest("button") !== null) { return; }
		const Entry = The_Notebook.Queue.find((Each) => Each.Id === Row.dataset.id);
		if (can_return(Entry) === false) { return; }
		Held = { Row, Entry, X: Event.clientX, Y: Event.clientY, Ghost: null, Over: false };
	};

	List.onpointermove = (Event) => {
		if (Held === null) { return; }
		const Dx = Event.clientX - Held.X;
		const Dy = Event.clientY - Held.Y;
		if (Held.Ghost === null) {
			// a small wobble is still a click; only a real pull starts the drag
			if (Math.hypot(Dx, Dy) < 8) { return; }
			Held.Ghost = lift_row(Held.Row);
			Held.Row.classList.add("lifted");
			Held.Box = Held.Row.getBoundingClientRect();
			List.setPointerCapture(Event.pointerId);
		}
		Held.Ghost.style.transform = `translate(${Held.Box.left + Dx}px, ${Held.Box.top + Dy}px) rotate(${Math.max(-8, Math.min(8, Dx / 40))}deg)`;
		const Deck = document.querySelector(".deck").getBoundingClientRect();
		Held.Over = Event.clientX > Deck.left && Event.clientX < Deck.right && Event.clientY > Deck.top && Event.clientY < Deck.bottom;
		document.querySelector(".deck").classList.toggle("drop", Held.Over);
	};

	const finish = (Event, Cancelled) => {
		if (Held === null) { return; }
		const Mine = Held;
		Held = null;
		document.querySelector(".deck").classList.remove("drop");
		// never moved far enough to count as a drag: it was a click
		if (Mine.Ghost === null) { return; }
		// the removal may have started while the row was in the air
		if (Cancelled !== true && Mine.Over === true && can_return(Mine.Entry) === true) { land_on_card(Mine, On_Drop); }
		else { fly_home(Mine); }
	};
	List.onpointerup = (Event) => finish(Event, false);
	List.onpointercancel = (Event) => finish(Event, true);
}

// the floating copy of a row that follows the pointer
function lift_row(Row) {
	const Ghost = document.createElement("div");
	Ghost.className = "dragrow";
	const Picture = Row.querySelector("img").cloneNode(true);
	const Name = document.createElement("div");
	Name.className = "t";
	Name.textContent = Row.querySelector(".t").textContent;
	Ghost.append(Picture, Name);
	Ghost.style.left = "0px";
	Ghost.style.top = "0px";
	document.body.appendChild(Ghost);
	return Ghost;
}

// dropped on the card: the video comes back as the next card
function land_on_card(Held, On_Drop) {
	const Card = document.querySelector("#card");
	const Target = centre_of(document.querySelector(".stage .frame"));
	On_Drop(Held.Entry);
	const Here = Held.Ghost.getBoundingClientRect();
	const Done = () => { Held.Ghost.remove(); };
	// the card arrives from the queue's side, as an undone discard does
	Come_Back_To_Me(Card, -1);
	if (calm() === true) { Done(); return; }
	Held.Ghost.animate([
		{ opacity: 1 },
		{ transform: `translate(${Target.x - Here.width / 2}px, ${Target.y - Here.height / 2}px) scale(.6)`, opacity: 0 },
	], { duration: 300, easing: "cubic-bezier(.4, 0, .2, 1)", fill: "forwards" }).finished.catch(() => {}).then(Done);
}

// dropped anywhere else: the row slides home and settles
function fly_home(Held) {
	const Back = () => { Held.Ghost.remove(); Held.Row.classList.remove("lifted"); };
	if (calm() === true || document.body.contains(Held.Row) === false) { Back(); return; }
	const Home = Held.Row.getBoundingClientRect();
	const Now = Held.Ghost.style.transform;
	Held.Ghost.animate([
		{ transform: Now },
		{ transform: `translate(${Home.left}px, ${Home.top}px) rotate(0deg)` },
	], { duration: 340, easing: Spring, fill: "forwards" }).finished.catch(() => {}).then(Back);
}
