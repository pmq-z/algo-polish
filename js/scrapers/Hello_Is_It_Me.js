//	======================= //
//		HELLO, IS IT ME	 	//
//	======================= //

//	=== THE PHONE ===	//

// plain check: is this tab still on the list the app is asking about?
function on_the_list(Source) {
	const Test = Treasure_Map.Pages[Source];
	return Test !== undefined && Test(new URL(location.href)) === true;
}

// "Hello, is it me you're looking for?"
function Answer_The_Phone(Message, Sender, Send_Reply) {
	// a tab that moved on (to a video, say) is left completely alone: no scrolling, no clicking
	if ((Message.Type === "Algo_Scan" || Message.Type === "Algo_Remove") && on_the_list(Message.Source) === false) {
		Send_Reply({ Ok: false, Moved: true, Error: "This YouTube tab is no longer on the list, so nothing was touched." });
		return true;
	}
	// the search box lives in the page header, on every YouTube page
	if (Message.Type === "Algo_Clear_Searches") {
		Search_And_Destroy()
			.then(Send_Reply)
			.catch((Oops) => Send_Reply({ Ok: false, Error: String(Oops) }));
		return true;
	}
	if (Message.Type === "Algo_Scan") {
		Never_Ending_Story(Message.Cap, Message.Source, Message.Hidden_Ok)
			.then((Result) => Send_Reply({ Ok: true, ...Result }))
			.catch((Oops) => Send_Reply({ Ok: false, Error: String(Oops) }));
		return true;
	} else if (Message.Type === "Algo_Remove") {
		Hasta_La_Vista_Baby(Message.Id, Message.Source, Message.Action === undefined ? "remove" : Message.Action)
			.then(Send_Reply)
			.catch((Oops) => Send_Reply({ Ok: false, Error: String(Oops) }));
		return true;
	}
	return false;
}

// wire the listener once per page, even if the files are injected twice
if (window.Algo_Polish_Is_Here !== true) {
	window.Algo_Polish_Is_Here = true;
	chrome.runtime.onMessage.addListener(Answer_The_Phone);
}
