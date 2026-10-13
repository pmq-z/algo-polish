//	================================== 	//
//		ELEMENTARY, MY DEAR WATSON	 	//
//	==================================	//

//	=== CLUES ===	//

// selectors and menu words live in Where_The_Streets_Have_No_Name.js (Treasure_Map)

//	=== DEDUCTIONS ===	//

// plain helper: one lowercase, decoded path per channel, so "/@Name" and "/@name" match
function channel_key(Href) {
	let Path = new URL(Href, location.origin).pathname;
	try { Path = decodeURIComponent(Path); } catch (Oops) { /* keep the raw path */ }
	return Path.toLowerCase().replace(/\/+$/, "");
}

// "Are we there yet?"
function are_we_there_yet(Source) {
	if (Source === "home") { return location.pathname === "/"; }
	else if (Source === "history") { return location.pathname === "/feed/history"; }
	else if (Source === "subs") { return location.pathname === "/feed/channels"; }
	else if (Source === "liked") { return location.pathname === "/playlist" && new URLSearchParams(location.search).get("list") === "LL"; }
	return false;
}

// "Who's that Pokémon?"
function Whos_That_Pokemon(Anchor) {
	// a normal link carries ?v=ID; a Short is /shorts/ID
	const Match = (Anchor.getAttribute("href") || "").match(/[?&]v=([\w-]{11})|\/shorts\/([\w-]{11})/);
	if (Match === null) { return null; }
	else if (Match !== null) { return Match[1] || Match[2]; }
}

// "Round up the usual suspects!"
function Round_Up_The_Usual_Suspects() {
	const Anchors = [...document.querySelectorAll(Treasure_Map.Video_Link)];
	// keep real video links, and skip the page header and sidebar
	return Anchors.filter((Anchor) => Whos_That_Pokemon(Anchor) !== null && Anchor.closest(Treasure_Map.Excluded) === null);
}

// "Climb every mountain"
function Climb_Every_Mountain(Anchor) {
	let Row = Anchor;
	while (Row.parentElement !== null && Row.parentElement !== document.body) {
		const Parent = Row.parentElement;
		// stop at the list container so one row never swallows its neighbours
		if (Parent.id === Treasure_Map.List_Container_Id || Treasure_Map.List_Container_Tags.test(Parent.tagName)) { break; }
		const Ids = new Set([...Parent.querySelectorAll(Treasure_Map.Video_Link)].map((Link) => Whos_That_Pokemon(Link)).filter((Id) => Id !== null));
		// a second video id means the parent holds more than this row
		if (Ids.size > 1) { break; }
		Row = Parent;
	}
	return Row;
}

// "How far did you get?" (percent of the video watched, -1 when the page shows no bar)
function How_Far_Did_You_Get(Row) {
	const Bars = [...Row.querySelectorAll(Treasure_Map.Progress_Bar)];
	for (const Bar of Bars) {
		// a percentage width is the watched share
		if (Bar.style.width.endsWith("%") === true) { return Math.round(parseFloat(Bar.style.width)); }
	}
	return -1;
}

// "What day is it?" (the date header of the history section this row sits in)
function What_Day_Is_It(Row) {
	const Section = Row.closest(Treasure_Map.Date_Section);
	if (Section === null) { return ""; }
	const Header = Section.querySelector(Treasure_Map.Date_Header);
	return Header === null ? "" : Header.textContent.trim();
}

// "Reelin' in the years": the id of every Short linked anywhere on the page (a Short seen in a shelf marks the same video elsewhere)
function Reelin_In_The_Years() {
	const Ids = new Set();
	for (const Anchor of document.querySelectorAll('a[href*="/shorts/"]')) {
		const Id = Whos_That_Pokemon(Anchor);
		if (Id !== null) { Ids.add(Id); }
	}
	return Ids;
}

// "How long is it?": the duration label on the thumbnail ("1:05", "1:02:10") in seconds, or -1 when there is none
function How_Long_Is_It(Row) {
	for (const Label of Row.querySelectorAll(Treasure_Map.Thumb_Labels)) {
		const Match = (Label.textContent || "").trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
		if (Match !== null) { return Number(Match[1] || 0) * 3600 + Number(Match[2]) * 60 + Number(Match[3]); }
	}
	return -1;
}

// "Short and sweet": which signal says this is a Short, or "" when none does.
// Duration alone is NOT a signal: Shorts can run to three minutes, and plenty of ordinary clips are that short.
function Short_And_Sweet(Id, Title, Row, Known_Shorts) {
	if (Row.querySelector('a[href*="/shorts/"]') !== null) { return "link"; }
	if (Known_Shorts.has(Id) === true) { return "seen-elsewhere"; }
	if (Row.matches(Treasure_Map.Shorts_Containers) === true || Row.closest(Treasure_Map.Shorts_Containers) !== null || Row.querySelector(Treasure_Map.Shorts_Containers) !== null) { return "container"; }
	if (Row.querySelector(Treasure_Map.Shorts_Badge) !== null) { return "badge"; }
	// a thumbnail label that just says "Shorts" (it replaces the duration)
	for (const Label of Row.querySelectorAll(Treasure_Map.Thumb_Labels)) {
		if (/^shorts?$/i.test((Label.textContent || "").trim()) === true) { return "label"; }
	}
	if (/#shorts?\b/i.test(Title) === true) { return "hashtag"; }
	// a tall thumbnail (loaded images only)
	for (const Picture of Row.querySelectorAll("img")) {
		if (Picture.naturalWidth > 0 && Picture.naturalHeight > Picture.naturalWidth * 1.2) { return "vertical"; }
	}
	return "";
}

// "Connect the dots"
function Connect_The_Dots(Skip) {
	const Best = new Map();
	const Known_Shorts = Reelin_In_The_Years();
	for (const Anchor of Round_Up_The_Usual_Suspects()) {
		const Id = Whos_That_Pokemon(Anchor);
		// rows the caller already has are not read again
		if (Skip !== undefined && Skip.has(Id) === true) { continue; }
		const Text = ((Anchor.getAttribute("title") || Anchor.textContent) + "").trim();
		// the title link beats the thumbnail link: prefer a "title" id/class, then longer text
		let Score = Text.length;
		if (Anchor.id === "video-title" || /title/i.test(Anchor.className)) { Score = Score + 1000; }
		if (Best.has(Id) === false || Score > Best.get(Id).Score) { Best.set(Id, { Anchor, Score, Text }); }
	}
	const Found = [];
	for (const [Id, { Anchor, Text }] of Best) {
		const Row = Climb_Every_Mountain(Anchor);
		const Byline = Row.querySelector(Treasure_Map.Channel_Link);
		// a Short's link often has no title text of its own: fall back to its label, a title inside the row, then a plain placeholder
		let Title = Text.replace(/\s+/g, " ");
		if (Title === "") {
			const Named = Row.querySelector('[class*="title" i], h3, [role="text"]');
			Title = ((Anchor.getAttribute("aria-label") || (Named === null ? "" : Named.textContent) || "") + "").replace(/\s+/g, " ").trim();
		}
		if (Title === "") { Title = "Short " + Id; }
		const Signal = Short_And_Sweet(Id, Title, Row, Known_Shorts);
		Found.push({
			Id,
			Title,
			Channel: Byline === null ? "" : Byline.textContent.trim(),
			Channel_Key: Byline === null ? "" : channel_key(Byline.getAttribute("href")),
			Thumb: `https://i.ytimg.com/vi/${Id}/mqdefault.jpg`,
			Is_Short: Signal !== "",
			Short_Signal: Signal,
			Duration_Sec: How_Long_Is_It(Row),
			Progress: How_Far_Did_You_Get(Row),
			Date_Label: What_Day_Is_It(Row),
		});
	}
	return Found;
}

//	=== NEIGHBOURS ===	//

// the channel rows of the Subscriptions page
function Round_Up_The_Neighbors() {
	return [...document.querySelectorAll(Treasure_Map.Channel_Row)].filter((Row) => Row.closest(Treasure_Map.Excluded) === null);
}

// "Won't you be my neighbor?"
function Wont_You_Be_My_Neighbor() {
	const Found = [];
	for (const Row of Round_Up_The_Neighbors()) {
		const Link = Plan_B(Row, Treasure_Map.Channel_Main_Link);
		if (Link === null) { continue; }
		const Name_Node = Plan_B(Row, Treasure_Map.Channel_Name);
		const Name = ((Name_Node === null ? Link.textContent : Name_Node.textContent) + "").replace(/\s+/g, " ").trim();
		// a row without a readable name cannot be judged
		if (Name === "") { continue; }
		const Avatar = Plan_B(Row, Treasure_Map.Channel_Avatar);
		let Thumb = Avatar === null ? "" : (Avatar.getAttribute("src") || "");
		if (Thumb.startsWith("//") === true) { Thumb = "https:" + Thumb; }
		Found.push({
			Id: channel_key(Link.getAttribute("href")),
			Url: new URL(Link.getAttribute("href"), location.origin).pathname,
			Title: Name, Channel: Name, Thumb, Is_Short: false, Progress: -1, Date_Label: "", Is_Channel: true,
		});
	}
	return Found;
}
