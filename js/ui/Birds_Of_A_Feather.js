//	========================== 	//
//		BIRDS OF A FEATHER	 	//
//	========================== 	//

//	=== IMPORTS ===	//

import { Out_Of_Sight_Out_Of_Mind } from "../core/Dont_You_Forget_About_Me.js";
import { The_Notebook, Strength_In_Numbers, Channel_Chips_Max, Keyword_Chips_Max, Group_Share_Of_Deck, Too_Common_Share } from "../core/The_Notebook.js";

//	=== THE FLOCK ===	//

const Stop_Words = new Set((
	"the and for with this that from your you are was were have has had not but can will just how what when why who "
	+ "his her its our out all any new one two get got use using into than then them they their there here about "
	+ "over more most very been being also only some such like make made full part video videos official"
).split(" "));

// "Birds of a feather flock together"
export function Birds_Of_A_Feather() {
	const Items = The_Notebook.Deck.map((Id) => The_Notebook.Items.get(Id));
	// channels are grouped by how much you watch them, not by words in a title
	if (The_Notebook.Source === "subs") { return Out_Of_Sight_Out_Of_Mind(Items); }
	const Bar = Raise_The_Bar(Items.length);
	const Tags = Less_Is_More([...Join_The_Club(Items, Bar), ...Words_Words_Words(Items, Bar)], Items);
	// with a format chosen, one extra tag holds everything in view: the "purge" in a single tap
	if (The_Notebook.Format !== "all" && Items.length > 0) {
		return [{ Kind: "format", Label: The_Notebook.Format === "shorts" ? "Every Short" : "Every long video", Ids: Items.map((Item) => Item.Id) }, ...Tags];
	}
	return Tags;
}

// "Raise the bar": the smallest group worth a tag grows with the deck
function Raise_The_Bar(Total) {
	return Math.max(Strength_In_Numbers, Math.ceil(Total * Group_Share_Of_Deck));
}

// "Less is more": drop keyword tags that only repeat a channel tag, then cap each kind
function Less_Is_More(Flocks, Items) {
	const Channel_Of = new Map(Items.map((Item) => [Item.Id, Item.Channel]));
	const Channels = Flocks.filter((Flock) => Flock.Kind === "channel");
	const Keywords = Flocks.filter((Flock) => Flock.Kind === "keyword").filter((Flock) => {
		const Tally = new Map();
		for (const Id of Flock.Ids) { Tally.set(Channel_Of.get(Id), (Tally.get(Channel_Of.get(Id)) || 0) + 1); }
		const Top = Math.max(...Tally.values());
		// 80% from one channel that already has its own tag: the keyword adds nothing
		return (Top >= Flock.Ids.length * 0.8 && Channels.some((Chan) => Chan.Label === [...Tally.entries()].find(([Name, Count]) => Count === Top)[0])) === false;
	});
	// more tags than fit: the reload button turns to the next set, wrapping back to the first
	The_Notebook.Chip_Pages = Math.max(1, Math.ceil(Channels.length / Channel_Chips_Max), Math.ceil(Keywords.length / Keyword_Chips_Max));
	const Page = The_Notebook.Chip_Page % The_Notebook.Chip_Pages;
	return [...Take_Turns(Channels, Channel_Chips_Max, Page), ...Take_Turns(Keywords, Keyword_Chips_Max, Page)];
}

// "Take turns": one page of a ranked list; a list with fewer pages than asked for wraps around
function Take_Turns(List, Size, Page) {
	if (List.length === 0) { return []; }
	const Start = (Page % Math.ceil(List.length / Size)) * Size;
	const Turn = List.slice(Start, Start + Size);
	// a short last page borrows from the front, so there is always a full row to look at
	if (Turn.length < Size && List.length > Size) { Turn.push(...List.slice(0, Size - Turn.length)); }
	return Turn;
}

// "Join the club": one group per channel with enough videos
function Join_The_Club(Items, Bar) {
	const Clubs = new Map();
	for (const Item of Items) {
		if (Item.Channel === "") { continue; }
		if (Clubs.has(Item.Channel) === false) { Clubs.set(Item.Channel, []); }
		Clubs.get(Item.Channel).push(Item.Id);
	}
	return [...Clubs.entries()]
		.filter(([Name, Ids]) => Ids.length >= Bar)
		.sort((A, B) => B[1].length - A[1].length)
		.map(([Name, Ids]) => ({ Kind: "channel", Label: Name, Ids }));
}

// "Chop chop!"
function Chop_Chop(Title) {
	return Title.toLowerCase()
		.split(/[^\p{L}\p{N}#']+/u)
		.filter((Word) => Word.length >= 3 && Stop_Words.has(Word) === false && /^\d+$/.test(Word) === false);
}

// "Words, words, words": repeated words and word pairs across titles
function Words_Words_Words(Items, Bar) {
	const Seen_In = new Map();
	for (const Item of Items) {
		const Words = Chop_Chop(Item.Title);
		const Terms = new Set(Words);
		// n-1 neighbouring pairs
		for (let Index = 0; Index < Words.length - 1; Index++) { Terms.add(Words[Index] + " " + Words[Index + 1]); }
		for (const Term of Terms) {
			if (Seen_In.has(Term) === false) { Seen_In.set(Term, []); }
			Seen_In.get(Term).push(Item.Id);
		}
	}
	// too rare is noise, too common (over 30% of the deck) says nothing
	const Ceiling = Items.length * Too_Common_Share;
	const Good = [...Seen_In.entries()]
		.filter(([Term, Ids]) => Ids.length >= Bar && Ids.length <= Ceiling)
		.sort((A, B) => B[1].length - A[1].length);

	const Picked = [];
	// pairs first, so "league legends" beats "league" when they cover nearly the same videos
	for (const [Term, Ids] of Good.filter(([Term]) => Term.includes(" "))) {
		// skip a pair that only repeats a group we already have
		if (Picked.length < Keyword_Chips_Max * 4 && Is_A_Twin(Picked, Ids) === false) { Picked.push({ Kind: "keyword", Label: Term, Ids }); }
	}
	for (const [Term, Ids] of Good.filter(([Term]) => Term.includes(" ") === false)) {
		const Explained = Picked.some((Flock) => Flock.Label.split(" ").includes(Term) && Flock.Ids.length >= Ids.length * 0.8);
		if (Explained === false && Is_A_Twin(Picked, Ids) === false && Picked.length < Keyword_Chips_Max * 4) { Picked.push({ Kind: "keyword", Label: Term, Ids }); }
	}
	return Picked;
}

// plain check: does a picked group already hold (nearly) these same videos?
function Is_A_Twin(Picked, Ids) {
	return Picked.some((Flock) => Flock.Ids.length <= Ids.length * 1.1 && Ids.every((Id) => Flock.Ids.includes(Id)));
}

// "Still waiting": the group's videos that have not been judged yet
export function Still_Waiting(Flock) {
	return Flock.Ids.filter((Id) => The_Notebook.Items.has(Id) === true && The_Notebook.Items.get(Id).State === "unseen");
}
