//	======================= //
//		TAKE ME HOME	 	//
//	======================= //

//	=== IMPORTS ===	//

import { The_Notebook } from "./The_Notebook.js";
import { check_a_law, fresh_law_id, The_Gavel_Falls } from "./Rule_The_World.js";
import { sound_fighter, Add_To_The_Roster, Clear_The_Roster } from "./Choose_Your_Fighter.js";

//	=== THE SUITCASE ===	//

const Marker = "algo-polish-settings";
const Biggest_File_Bytes = 1024 * 1024;

// "Pack your bags": the rules, protected channels and saved setups as a file the person keeps
export function Pack_Your_Bags() {
	const Pack = {
		Kind: Marker,
		Version: 1,
		Exported_At: new Date().toISOString(),
		About: "Your Algo Polish settings: cleaning rules, protected channels and saved setups. Import this file in Algo Polish (Rules, Import settings) on any computer.",
		Rules: The_Notebook.Rules.map((Rule) => ({ Type: Rule.Type, Value: Rule.Value })),
		Protected: [...The_Notebook.Protected],
		Presets: The_Notebook.Presets.map((Each) => ({ Name: Each.Name, Rules: Each.Rules, Format: Each.Format })),
	};
	const Blob_File = new Blob([JSON.stringify(Pack, null, 2)], { type: "application/json" });
	const Link = document.createElement("a");
	Link.href = URL.createObjectURL(Blob_File);
	Link.download = `algo-polish-settings-${new Date().toISOString().slice(0, 10)}.json`;
	document.body.appendChild(Link);
	Link.click();
	Link.remove();
	setTimeout(() => URL.revokeObjectURL(Link.href), 4000);
}

//	=== UNPACKING ===	//

// "Open the bags": read a chosen file and keep only what is sound; returns { Problem } or { Rules, Protected, Presets, Skipped }
export async function Open_The_Bags(File) {
	if (File.size > Biggest_File_Bytes) { return { Problem: "That file is too large to be a settings file." }; }
	let Raw;
	try { Raw = JSON.parse(await File.text()); }
	catch (Oops) { return { Problem: "That file is not valid JSON." }; }
	if (Raw === null || typeof Raw !== "object" || Raw.Kind !== Marker) { return { Problem: "That is not an Algo Polish settings file." }; }
	let Skipped = 0;
	const Rules = [];
	for (const Rule of (Array.isArray(Raw.Rules) ? Raw.Rules : [])) {
		if (Rule !== null && typeof Rule === "object" && check_a_law(Rule.Type, Rule.Value) === null) { Rules.push({ Type: Rule.Type, Value: String(Rule.Value === undefined ? "" : Rule.Value).trim() }); }
		else { Skipped = Skipped + 1; }
	}
	const Protected = [];
	for (const Name of (Array.isArray(Raw.Protected) ? Raw.Protected : [])) {
		if (typeof Name === "string" && Name.trim() !== "") { Protected.push(Name.trim().toLowerCase().slice(0, 200)); }
		else { Skipped = Skipped + 1; }
	}
	const Presets = [];
	for (const Each of (Array.isArray(Raw.Presets) ? Raw.Presets : [])) {
		const Sound = sound_fighter(Each);
		if (Sound !== null) { Presets.push(Sound); }
		else { Skipped = Skipped + 1; }
	}
	if (Rules.length + Protected.length + Presets.length === 0) { return { Problem: "That file holds no rules, protected channels or setups." }; }
	return { Rules, Protected, Presets, Skipped };
}

// "Settle in": add the imported settings to the current ones (merge), or replace the current ones
export async function Settle_In(Bags, Replace) {
	if (Replace === true) {
		The_Notebook.Rules = [];
		The_Notebook.Protected = [];
		await Clear_The_Roster();
	}
	const Known = new Set(The_Notebook.Rules.map((Rule) => Rule.Type + "|" + Rule.Value.toLowerCase()));
	let Added_Rules = 0;
	for (const Rule of Bags.Rules) {
		const Key = Rule.Type + "|" + Rule.Value.toLowerCase();
		if (Known.has(Key) === true) { continue; }
		Known.add(Key);
		The_Notebook.Rules.push({ Id: fresh_law_id(), Type: Rule.Type, Value: Rule.Value });
		Added_Rules = Added_Rules + 1;
	}
	let Added_Protected = 0;
	for (const Name of Bags.Protected) {
		if (The_Notebook.Protected.includes(Name) === true) { continue; }
		The_Notebook.Protected.push(Name);
		Added_Protected = Added_Protected + 1;
	}
	await The_Gavel_Falls();
	await Add_To_The_Roster(Bags.Presets);
	return { Added_Rules, Added_Protected, Added_Presets: Bags.Presets.length };
}
