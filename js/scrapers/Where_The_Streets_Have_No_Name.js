//	====================================== 	//
//		WHERE THE STREETS HAVE NO NAME	 	//
//	====================================== 	//

//	=== THE MAP ===	//

// Every selector and menu word the page scripts rely on lives here.
// When YouTube changes its markup, this is the only file that should need an edit.
// Lists are tried in order: put the newest guess first and keep the old ones as backups.

var Treasure_Map = {
	// the address each source lives at: the page scripts do nothing on any other page (a video being watched, say)
	Pages: {
		liked: (Link) => Link.pathname === "/playlist" && Link.searchParams.get("list") === "LL",
		home: (Link) => Link.pathname === "/",
		history: (Link) => Link.pathname === "/feed/history",
		subs: (Link) => Link.pathname === "/feed/channels",
	},

	// parts of the page that never hold videos worth cleaning
	Excluded: "ytd-masthead, ytd-playlist-header-renderer, yt-page-header-renderer, ytd-guide-renderer, ytd-mini-guide-renderer, ytd-ad-slot-renderer, ytd-display-ad-renderer",

	// every video link on the page
	// (Shorts are linked as /shorts/ID in History and Home, not as watch?v=)
	Video_Link: 'a[href*="watch?v="], a[href*="/shorts/"]',
	// the link for one known video
	Link_For: (Id) => `a[href*="v=${Id}"], a[href*="/shorts/${Id}"]`,

	// climbing from a link to its row stops at one of these
	List_Container_Id: "contents",
	List_Container_Tags: /^(YTD-BROWSE|YTD-TWO-COLUMN|YTD-PLAYLIST-VIDEO-LIST)/,

	// pieces read from inside a row
	Channel_Link: 'a[href^="/@"], a[href^="/channel/"], a[href^="/c/"], a[href^="/user/"]',
	Progress_Bar: '#progress, [class*="ProgressBarSegment"], [class*="progress-bar"]',
	Shorts_Link: 'a[href*="/shorts/"]',
	Shorts_Badge: '[overlay-style="SHORTS"], [aria-label="Shorts" i], [aria-label="Short" i]',
	// small labels on a thumbnail (the Shorts tag, or the duration) live in elements like these
	Thumb_Labels: "badge-shape, yt-thumbnail-badge-view-model, yt-thumbnail-overlay-badge-view-model, ytd-thumbnail-overlay-time-status-renderer, .yt-badge-shape__text, #text",
	// a row (or a shelf around it) built for Shorts says so in its own tag name
	Shorts_Containers: "ytd-reel-shelf-renderer, ytd-reel-item-renderer, ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2, yt-shorts-lockup-view-model, ytd-rich-shelf-renderer[is-shorts], [is-shorts]",

	// history date headers
	Date_Section: "ytd-item-section-renderer",
	Date_Header: "ytd-item-section-header-renderer #title",

	// the row's three-dots button, best guess first
	Menu_Button: [
		"ytd-menu-renderer button",
		'button[aria-label*="menu" i], button[aria-label*="action" i], button[aria-label*="more" i]',
	],
	// a button inside a row that removes it directly (history), matched by its label
	Direct_Button: "button[aria-label]",
	// entries inside the opened menu
	Menu_Items: "ytd-menu-service-item-renderer, yt-list-item-view-model, tp-yt-paper-item",

	// the Subscriptions page (/feed/channels)
	Channel_Row: "ytd-channel-renderer",
	Channel_Name: ["#text-container #text", "#info #text", "#channel-title", "#text"],
	Channel_Main_Link: ["a#main-link[href]", 'a[href^="/@"]', 'a[href^="/channel/"]'],
	Channel_Avatar: ["#avatar img", "yt-img-shadow img", "img"],
	Subscribe_Button: ["ytd-subscribe-button-renderer button", "yt-subscribe-button-view-model button", 'button[aria-label*="ubscri" i]'],
	// set on the subscribe button's renderer while you are subscribed
	Subscribed_Flag: "[subscribed]",
	Dialog_Buttons: "yt-confirm-dialog-renderer button, tp-yt-paper-dialog button, yt-dialog-view-model button",

	// the masthead search box and the recent searches it offers when you click it empty
	Search_Input: ['input[name="search_query"]', "ytd-searchbox input", "input#search"],
	Search_Rows: ["ul.sbsb_b li", ".ytSearchboxComponentSuggestionsContainer .ytSuggestionComponentSuggestion", "ytd-searchbox [role='option']", "[role='listbox'] [role='option']"],
	// the small "Remove" control inside a remembered-search row (found by class, label or wording)
	Search_Remove: ["[class*='remove' i]", "button[aria-label]", "a[aria-label]", "[role='button']"],

	// YouTube shows this loading spinner at the end of a list that has more to give
	More_Spinner: "ytd-continuation-item-renderer",

	// counted only for the scan's debug report
	Debug_Counters: { Renderers: "ytd-playlist-video-renderer", Lockups: "yt-lockup-view-model", Channels: "ytd-channel-renderer" },

	// menu wording per action (English plus a few common languages)
	Words: {
		remove: /remove|eliminar|quitar|supprimer|retirer|entfernen|rimuovi|remover|excluir|удалить|削除|삭제/i,
		not_interested: /not interested|no me interesa|pas intéressé|kein interesse|não tenho interesse|non mi interessa|興味なし/i,
		unsubscribe: /unsubscribe|cancelar suscripci[oó]n|anular suscripci[oó]n|se d[ée]sabonner|abbestellen|annulla iscrizione|cancelar inscri[cç][aã]o|отписаться|登録解除|구독 취소/i,
		// the button's state words: "Subscribed" means you are in, a bare "Subscribe" means you are out
		subscribed: /(?<![a-z])(subscribed|suscrito|abonn[ée]e?|abonniert|iscritto|inscrito|подписки|登録済み|구독중)(?![a-z])/i,
		subscribe: /^\s*(subscribe|suscribirse|s.abonner|abonnieren|iscriviti|inscrever-se|подписаться|チャンネル登録|구독)\s*$/i,
		dont_recommend: /don.?t recommend channel|no recomendar el canal|ne pas recommander la cha[iî]ne|kanal nicht empfehlen|n[aã]o recomendar o canal|non consigliare il canale/i,
	},
};

//	=== PLAN B ===	//

// "Plan B": the first selector in the list that finds something wins
function Plan_B(Root, Selectors) {
	for (const Selector of Selectors) {
		const Hit = Root.querySelector(Selector);
		// a hit ends the search; a miss moves on to the next backup
		if (Hit !== null) { return Hit; }
	}
	return null;
}
