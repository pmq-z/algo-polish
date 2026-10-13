//	====================== 	//
//		RULE THE WORLD	 	//
//	====================== 	//

//	=== IMPORTS ===	//

import { The_Notebook, Day_Ms, Month_Ms } from "./The_Notebook.js";

//	=== THE LAW BOOK ===	//

export const Rule_Types = {
	channel: { Label: "Channel is", Needs_Value: true, Hint: "channel name" },
	keyword: { Label: "Title contains", Needs_Value: true, Hint: "word or phrase" },
	short: { Label: "Is a Short", Needs_Value: false, Hint: "" },
	barely: { Label: "Watched less than (%)", Needs_Value: true, Hint: "10" },
	older: { Label: "Older than (months)", Needs_Value: true, Hint: "6" },
};

// "Order in the court!"
export async function Order_In_The_Court() {
	const Saved = await chrome.storage.local.get(["rules", "protected"]);
	The_Notebook.Rules = Saved.rules || [];
	The_Notebook.Protected = Saved.protected || [];
}

// "The gavel falls"
export function The_Gavel_Falls() {
	return chrome.storage.local.set({ rules: The_Notebook.Rules, protected: The_Notebook.Protected });
}

// plain check: is this rule valid? returns the problem as text, or null when it is fine
export function check_a_law(Type, Raw) {
	const Kind = Rule_Types[Type];
	const Value = String(Raw === undefined || Raw === null ? "" : Raw).trim();
	if (Kind === undefined) { return "Unknown rule type."; }
	if (Kind.Needs_Value === true && Value === "") { return "This rule needs a value."; }
	// percentages and months must be real numbers; a percentage cannot pass 100
	if (Type === "barely" || Type === "older") {
		const Number_Value = Number(Value);
		if (Number.isFinite(Number_Value) === false || Number_Value <= 0) { return "Enter a number above 0."; }
		if (Type === "barely" && Number_Value > 100) { return "A percentage cannot be above 100."; }
	}
	return null;
}

// plain helper: a brand new rule id
export function fresh_law_id() {
	return String(Date.now()) + String(Math.floor(Math.random() * 1000000));
}

// "Make a law"
export function Make_A_Law(Type, Raw) {
	const Problem = check_a_law(Type, Raw);
	if (Problem !== null) { return Problem; }
	The_Notebook.Rules.push({ Id: fresh_law_id(), Type, Value: Raw.trim() });
	The_Gavel_Falls();
	return null;
}

// "Repeal and replace"
export function Repeal_The_Law(Id) {
	The_Notebook.Rules = The_Notebook.Rules.filter((Rule) => Rule.Id !== Id);
	The_Gavel_Falls();
}

// "To protect and to serve"
export function Protect_And_Serve(Channel) {
	const Name = Channel.trim().toLowerCase();
	if (Name === "" || The_Notebook.Protected.includes(Name) === true) { return; }
	The_Notebook.Protected.push(Name);
	The_Gavel_Falls();
}

// "Let it go, let it go"
export function Let_It_Go(Name) {
	The_Notebook.Protected = The_Notebook.Protected.filter((Each) => Each !== Name);
	The_Gavel_Falls();
}

//	=== JUDGEMENT ===	//

// plain check: is this video's channel on the protected list?
export function is_protected(Item) {
	return The_Notebook.Protected.includes(Item.Channel.trim().toLowerCase());
}

// plain check: does one rule match one video? (unknown data never matches)
export function rule_matches(Rule, Item) {
	if (Rule.Type === "channel") { return Item.Channel.trim().toLowerCase() === Rule.Value.trim().toLowerCase(); }
	else if (Rule.Type === "keyword") { return Item.Title.toLowerCase().includes(Rule.Value.trim().toLowerCase()); }
	else if (Rule.Type === "short") { return Item.Is_Short === true; }
	else if (Rule.Type === "barely") { return typeof Item.Progress === "number" && Item.Progress >= 0 && Item.Progress < Number(Rule.Value); }
	else if (Rule.Type === "older") { return typeof Item.Date_Ms === "number" && (Date.now() - Item.Date_Ms) > Number(Rule.Value) * Month_Ms; }
	return false;
}

// "I am the law!" (a dry run: nothing is queued here)
export function I_Am_The_Law() {
	const Plan = { Per_Rule: new Map(), Ids: new Set(), Protected_Skipped: 0, No_Date: 0 };
	const Needs_Dates = The_Notebook.Rules.some((Rule) => Rule.Type === "older");
	for (const Rule of The_Notebook.Rules) { Plan.Per_Rule.set(Rule.Id, 0); }

	for (const Id of The_Notebook.Deck) {
		const Item = The_Notebook.Items.get(Id);
		if (Needs_Dates === true && typeof Item.Date_Ms !== "number") { Plan.No_Date = Plan.No_Date + 1; }
		const Hits = The_Notebook.Rules.filter((Rule) => rule_matches(Rule, Item) === true);
		if (Hits.length === 0) { continue; }
		// protected channels always win over rules
		if (is_protected(Item) === true) { Plan.Protected_Skipped = Plan.Protected_Skipped + 1; continue; }
		for (const Rule of Hits) { Plan.Per_Rule.set(Rule.Id, Plan.Per_Rule.get(Rule.Id) + 1); }
		Plan.Ids.add(Id);
	}
	return Plan;
}

//	=== DATES ===	//

// "Read between the lines" (history headers: Today, Yesterday, a weekday, or a date)
export function Read_Between_The_Lines(Label) {
	const Text = (Label || "").trim();
	if (Text === "") { return null; }
	const Today = new Date();
	Today.setHours(0, 0, 0, 0);
	const Lower = Text.toLowerCase();
	if (Lower === "today") { return Today.getTime(); }
	else if (Lower === "yesterday") { return Today.getTime() - Day_Ms; }

	const Weekday = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].indexOf(Lower);
	if (Weekday !== -1) {
		// modulo trick: days back to that weekday, never zero (today is handled above)
		let Back = (Today.getDay() - Weekday + 7) % 7;
		if (Back === 0) { Back = 7; }
		return Today.getTime() - Back * Day_Ms;
	}

	// the lenient date parser reads junk like "Hoy" as January 1st, so insist on an English month name
	if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i.test(Text) === false) { return null; }
	const Has_Year = /\b(19|20)\d{2}\b/.test(Text);
	const Parsed = Date.parse(Has_Year === true ? Text : Text + ", " + Today.getFullYear());
	if (Number.isNaN(Parsed) === true) { return null; }
	// no year and the date lies in the future: it was last year
	if (Has_Year === false && Parsed > Today.getTime() + Day_Ms) {
		const Earlier = new Date(Parsed);
		Earlier.setFullYear(Earlier.getFullYear() - 1);
		return Earlier.getTime();
	}
	return Parsed;
}
