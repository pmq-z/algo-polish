//	==================== //
//		THE NOTEBOOK	 //
//	==================== //

//	=== RULES OF THE GAME ===	//

export const Hold_Your_Horses_Ms = 2000;      // undo window before a removal starts
export const Catch_Your_Breath_Min_Ms = 250;  // shortest pause between removals
export const Catch_Your_Breath_Max_Ms = 700;  // longest normal pause between removals
export const Long_Breather_Every = 10;        // every Nth removal gets the long pause
export const Long_Breather_Ms = 1500;
export const The_Line_In_The_Sand = 110;      // drag distance (px) that counts as a swipe
export const Strength_In_Numbers = 5;         // smallest group that counts as a cluster
export const Channel_Chips_Max = 5;           // most channel tags shown
export const Keyword_Chips_Max = 6;           // most keyword tags shown
export const Group_Share_Of_Deck = 0.015;     // a group must cover at least this share of the deck
export const Too_Common_Share = 0.3;          // a keyword in more than this share of the deck says nothing
export const Home_Scan_Cap = 60;              // the Home feed never ends, so a scan stops here
export const Slow_Dance_Min_Ms = 1500;        // unsubscribing is slower than removing a video
export const Slow_Dance_Max_Ms = 3000;
export const Slow_Dance_Long_Every = 5;       // every Nth unsubscribe gets the long pause
export const Slow_Dance_Long_Ms = 6000;
export const Not_So_Fast_Cap = 25;            // most channels one bulk unsubscribe may cover
export const Months_Of_Silence = 6;           // "quiet" means no history for this long
export const Smallest_Habit = 3;              // fewest channels worth a Subscriptions tag
export const Samples_Per_Channel = 9;     // watched or liked videos remembered per channel, per scan
export const Samples_Per_Page = 3;        // sample videos shown on a channel card at once
export const Dots_On_The_Line = 40;        // dots on the progress track
export const Known_Shorts_Max = 5000;      // how many Short ids are remembered
export const Day_Ms = 24 * 60 * 60 * 1000;
export const Month_Ms = 30.44 * Day_Ms;

//	=== TWO ROADS ===	//

export const Two_Roads_Diverged = {
	liked: {
		Label: "Liked videos",
		Url: "https://www.youtube.com/playlist?list=LL",
		Matches: (Link) => Link.pathname === "/playlist" && Link.searchParams.get("list") === "LL",
	},
	home: {
		Label: "Home feed",
		Url: "https://www.youtube.com/",
		Matches: (Link) => Link.pathname === "/",
	},
	subs: {
		Label: "Subscriptions",
		Url: "https://www.youtube.com/feed/channels",
		Matches: (Link) => Link.pathname === "/feed/channels",
	},
	history: {
		Label: "Watch history",
		Url: "https://www.youtube.com/feed/history",
		Matches: (Link) => Link.pathname === "/feed/history",
	},
};

//	=== MEMORIES ===	//

export const The_Notebook = {
	Items: new Map(),   // Id -> { Id, Title, Channel, Thumb, State: unseen | kept | queued }
	Deck: [],           // Ids still waiting for a verdict
	Kept: new Set(),    // Ids the person chose to keep (saved between sessions)
	Queue: [],          // removal entries: { Id, Status, Error, Gone, El, Refs, Shown }
	Undo_Stack: [],
	Rules: [],          // { Id, Type, Value }, kept between sessions
	Protected: [],      // lowercase channel names that rules and bulk actions never touch
	Known_Shorts: new Set(), // video ids seen as Shorts in any earlier scan (a Short in History is also one in Liked)
	Format: "all",      // the deck's format filter: all | long | shorts
	Presets: [],        // saved setups { Name, Rules: [{Type, Value}], Format }
	Clusters: [],       // { Kind: channel | keyword, Label, Ids }
	Chip_Page: 0,       // which set of tags is showing (the reload button turns it)
	Chip_Pages: 1,      // how many sets of tags there are
	Open_Flock: null,   // "kind:label" of the group whose panel is open
	Backup_Done: false, // one automatic backup per session
	Source: null,
	Tab_Id: null,
	Done: 0,
	Stats: {},           // saved per-channel counts from earlier Liked / History scans
	Removed: new Set(),  // ids reported removed this session (checked again after a fresh scan)
	Retried: new Set(),  // ids already re-queued once by Boomerang
	Notice: "",         // one-line message shown under the queue summary
	Paused: false,
	Running: false,
	Busy: false,
	Scanning: false,
};
