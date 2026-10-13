//	===================	//
//		DAY TRIPPER	 	//
//	=================== //

//	=== THE SWITCH ===	//

// "She's a day tripper" (runs before the page paints, so the theme never flashes)
(function Day_Tripper() {
	let Mood = "dark";
	try {
		// a saved "light" is the only thing that overrides the dark default
		if (localStorage.getItem("algo-theme") === "light") { Mood = "light"; }
	} catch (Blocked) {
		// storage unavailable: stay dark
	}
	document.documentElement.dataset.theme = Mood;
})();
