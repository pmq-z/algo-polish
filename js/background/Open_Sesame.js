//	=================== //
//		OPEN SESAME	 	//
//	=================== //

//	=== THE DOOR ===	//

// "Open sesame!"
function Open_The_Cave_Of_Wonders() {
	chrome.tabs.create({ url: chrome.runtime.getURL("pages/Welcome_To_The_Jungle.html") });
}

chrome.action.onClicked.addListener(Open_The_Cave_Of_Wonders);
