//	=============== //
//		TIK TOK	 	//
//	=============== //

//	=== THE CLOCK ===	//

// "Tick tock, on the clock!" (worker timers are not throttled in background tabs)
onmessage = function Tick_Tock_On_The_Clock(Event) {
	setTimeout(() => postMessage(Event.data.Id), Event.data.Ms);
};
