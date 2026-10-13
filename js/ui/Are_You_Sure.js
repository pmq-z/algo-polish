//	======================= //
//		ARE YOU SURE	 	//
//	======================= //

//	=== IMPORTS ===	//

import { $ } from "./Paint_It_Black.js";

//	=== THE QUESTIONS ===	//

// "Are you sure?": the bulk-action popup. Step one asks "are you sure?"; if a backup is on offer, step two asks about it.
// Resolves to { Confirmed, Backup } where Backup is true / false when the backup question was asked, otherwise null.
export function Are_You_Sure(Options) {
	const Box = $("#sure");
	return new Promise((Resolve) => {
		let Settled = false;
		const Finish = (Result) => {
			if (Settled === true) { return; }
			Settled = true;
			Box.close();
			Resolve({ ...Result, Option: $("#sureOptBox").checked === true });
		};
		// Escape (or the browser's own close) counts as "no"
		Box.oncancel = (Event) => { Event.preventDefault(); Finish({ Confirmed: false, Backup: null }); };
		const Step_One = () => {
			$("#sureStep").textContent = Options.Ask_Backup === true ? "1 / 2" : "";
			$("#sureTitle").textContent = Options.Title;
			Fill($("#sureBody"), Options.Lines || [], Options.Warn);
			// an optional tick-box that does not gate the Yes button (an import can ask "replace instead of merge?")
			$("#sureOpt").hidden = (Options.Option === undefined);
			$("#sureOptBox").checked = false;
			if (Options.Option !== undefined) { $("#sureOpt").querySelector("span").textContent = Options.Option; }
			const Ack = $("#sureAck");
			const Box_Ticked = $("#sureAckBox");
			Ack.hidden = (Options.Ack === undefined);
			Box_Ticked.checked = false;
			if (Options.Ack !== undefined) { Ack.querySelector("span").textContent = Options.Ack; }
			const Yes = $("#sureYes");
			Yes.textContent = Options.Yes;
			Yes.disabled = (Options.Ack !== undefined);
			Box_Ticked.onchange = () => { Yes.disabled = (Box_Ticked.checked === false); };
			$("#sureNo").textContent = "Cancel";
			$("#sureNo").onclick = () => Finish({ Confirmed: false, Backup: null });
			$("#sureAlt").hidden = true;
			Yes.onclick = () => {
				if (Options.Ask_Backup === true) { Save_Me(Options, Finish, Step_One); }
				else if (Options.Ask_Backup !== true) { Finish({ Confirmed: true, Backup: null }); }
			};
		};
		Step_One();
		Box.showModal();
		// the safe button is the one under the cursor first, never the destructive one
		$("#sureNo").focus();
	});
}

// "Save me": step two, the backup question, with plain words about what the file is for
function Save_Me(Options, Finish, Back) {
	$("#sureStep").textContent = "2 / 2";
	$("#sureTitle").textContent = "Save a backup first?";
	const Facts = Options.Backup;
	const Body = $("#sureBody");
	Fill(Body, [Facts.What]);
	const Heading = document.createElement("p");
	Heading.className = "sub";
	Heading.textContent = "What you can do with it";
	const List = document.createElement("ul");
	for (const Line of Facts.Uses) {
		const Item = document.createElement("li");
		Item.textContent = Line;
		List.appendChild(Item);
	}
	const Cannot = document.createElement("p");
	Cannot.className = "note";
	Cannot.textContent = Facts.Cannot;
	Body.append(Heading, List, Cannot);
	$("#sureAck").hidden = true;
	$("#sureOpt").hidden = true;
	const Yes = $("#sureYes");
	Yes.disabled = false;
	Yes.textContent = "Download backup and continue";
	Yes.onclick = () => Finish({ Confirmed: true, Backup: true });
	const Alt = $("#sureAlt");
	Alt.hidden = false;
	Alt.textContent = "Continue without backup";
	Alt.onclick = () => Finish({ Confirmed: true, Backup: false });
	$("#sureNo").textContent = "Back";
	$("#sureNo").onclick = Back;
}

// plain helper: paragraphs (and an optional warning) as text, never as markup
function Fill(Body, Lines, Warn) {
	Body.replaceChildren();
	for (const Line of Lines) {
		const Paragraph = document.createElement("p");
		Paragraph.textContent = Line;
		Body.appendChild(Paragraph);
	}
	if (Warn !== undefined && Warn !== null) {
		const Alert = document.createElement("p");
		Alert.className = "warn";
		Alert.textContent = Warn;
		Body.appendChild(Alert);
	}
}
