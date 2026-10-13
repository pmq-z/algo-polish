//	=============================== //
//		CHOOSE YOUR FIGHTER	 		//
//	=============================== //

//	=== IMPORTS ===	//

import { The_Notebook } from "./The_Notebook.js";
import { check_a_law, fresh_law_id, The_Gavel_Falls } from "./Rule_The_World.js";
import { Cut_To_Fit, Formats } from "./Short_Shorts.js";

//	=== THE ROSTER ===	//

// ready-made setups; they cannot be deleted
export const Built_In_Fighters = [
	{ Name: "Shorts purge", Built_In: true, Format: "shorts", Rules: [{ Type: "short", Value: "" }] },
	{ Name: "Barely watched", Built_In: true, Format: "all", Rules: [{ Type: "barely", Value: "10" }] },
	{ Name: "Old and forgotten", Built_In: true, Format: "all", Rules: [{ Type: "older", Value: "12" }] },
];

// "Load the roster": saved setups come back from storage
export async function Load_The_Roster() {
	const Saved = await chrome.storage.local.get("presets");
	The_Notebook.Presets = Array.isArray(Saved.presets) ? Saved.presets : [];
}

function Keep_The_Roster() {
	return chrome.storage.local.set({ presets: The_Notebook.Presets });
}

// plain helper: every setup on offer, built-in first
export function whole_roster() {
	return [...Built_In_Fighters, ...The_Notebook.Presets];
}

// plain helper: the current rules as a plain list (no ids)
function current_rules() {
	return The_Notebook.Rules.map((Rule) => ({ Type: Rule.Type, Value: Rule.Value }));
}

// plain check: do the current rules and format equal this setup?
function same_as(Fighter) {
	const Mine = current_rules();
	return Fighter.Format === The_Notebook.Format && Fighter.Rules.length === Mine.length && Fighter.Rules.every((Rule, Index) => Rule.Type === Mine[Index].Type && Rule.Value === Mine[Index].Value);
}

//	=== PICKING ===	//

// "Pick your fighter": load a setup's rules and format; the rules being replaced are parked as "Previous rules" so nothing is lost
export async function Pick_Your_Fighter(Name) {
	const Fighter = whole_roster().find((Each) => Each.Name === Name);
	if (Fighter === undefined) { return false; }
	const Parked = current_rules();
	if (Parked.length > 0 && whole_roster().some(same_as) === false) {
		Save_Fighter_Quietly("Previous rules", Parked, The_Notebook.Format);
	}
	The_Notebook.Rules = Fighter.Rules.map((Rule) => ({ Id: fresh_law_id(), Type: Rule.Type, Value: Rule.Value }));
	await The_Gavel_Falls();
	// the format filter only exists for videos
	if (The_Notebook.Source !== "subs" && The_Notebook.Source !== null) { Cut_To_Fit(Fighter.Format); }
	else { The_Notebook.Format = Fighter.Format; }
	await Keep_The_Roster();
	return true;
}

function Save_Fighter_Quietly(Name, Rules, Format) {
	The_Notebook.Presets = The_Notebook.Presets.filter((Each) => Each.Name !== Name);
	The_Notebook.Presets.push({ Name, Rules, Format });
}

//	=== SAVING ===	//

// "Save fighter": the current rules and format become a named setup; returns a problem text or null
export async function Save_Fighter(Raw_Name) {
	const Name = Raw_Name.trim().slice(0, 40);
	if (Name === "") { return "Give the setup a name."; }
	if (Built_In_Fighters.some((Each) => Each.Name.toLowerCase() === Name.toLowerCase()) === true) { return "That name is taken by a built-in setup."; }
	if (The_Notebook.Rules.length === 0 && The_Notebook.Format === "all") { return "Add a rule or choose a format first: there is nothing to save."; }
	// the same name replaces the older setup
	The_Notebook.Presets = The_Notebook.Presets.filter((Each) => Each.Name.toLowerCase() !== Name.toLowerCase());
	The_Notebook.Presets.push({ Name, Rules: current_rules(), Format: The_Notebook.Format });
	await Keep_The_Roster();
	return null;
}

// "Retire fighter"
export async function Retire_Fighter(Name) {
	The_Notebook.Presets = The_Notebook.Presets.filter((Each) => Each.Name !== Name);
	await Keep_The_Roster();
}

// plain check: is this a setup we can trust? (used by the settings import)
export function sound_fighter(Raw) {
	if (Raw === null || typeof Raw !== "object" || typeof Raw.Name !== "string" || Raw.Name.trim() === "" || Array.isArray(Raw.Rules) === false) { return null; }
	if (Formats[Raw.Format] === undefined) { return null; }
	const Rules = [];
	for (const Rule of Raw.Rules) {
		if (Rule === null || typeof Rule !== "object" || check_a_law(Rule.Type, Rule.Value) !== null) { return null; }
		Rules.push({ Type: Rule.Type, Value: String(Rule.Value === undefined ? "" : Rule.Value).trim() });
	}
	return { Name: Raw.Name.trim().slice(0, 40), Rules, Format: Raw.Format };
}

// "Settle the roster": merge imported setups (same name = the imported one wins)
export async function Add_To_The_Roster(List) {
	for (const Fighter of List) {
		The_Notebook.Presets = The_Notebook.Presets.filter((Each) => Each.Name.toLowerCase() !== Fighter.Name.toLowerCase());
		The_Notebook.Presets.push(Fighter);
	}
	await Keep_The_Roster();
}

// "Clear the roster": used by a replace-everything import
export async function Clear_The_Roster() {
	The_Notebook.Presets = [];
	await Keep_The_Roster();
}
