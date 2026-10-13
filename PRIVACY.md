# Privacy

Algo Polish runs entirely in your browser. It has no server, no account, no analytics and no tracking.

## What it reads

- The titles, channel names, IDs, watch progress and history date headers of videos shown on your YouTube Liked videos, Watch history or Home page, while you use the extension.
- On the Subscriptions page: the names, links and avatar addresses of the channels you subscribe to.

## What it stores

- A list of video IDs you chose to **Keep**, so they are skipped next time.
- Your **rules** and **protected channel names**, so they apply next time.
- Your unfinished **removal queue** (video ID, title, channel name and thumbnail address for each video, plus a count of removals), so it can resume after a reload.
- For the Subscriptions audit: after a Liked or Watch history scan, a count of videos per channel and the date you last watched each (channel name or link, number, date) and up to nine sample videos per channel (video id and title) from each of the two scans, so the audit can show how much you watch each channel and which videos. It is replaced by the next scan and removed by uninstalling the extension.
- Your light or dark theme choice, in the page's `localStorage`.
- Both live in your browser's local extension storage (`chrome.storage.local`), on your device only.
- The queue entry for a video is deleted once it is removed or undone. Use **Forget kept** in the app, or uninstall the extension, to delete the rest.

## What it sends

- Nothing to the developer or any third party.
- Your browser loads video thumbnails from YouTube's image servers (`i.ytimg.com`), as it does when you browse YouTube normally.
- "Not interested" and "Don't recommend channel" are sent by clicking those menu items on YouTube, so they go to YouTube like any feedback you give there.
- Unsubscribes are performed by clicking the Subscribe button, the Unsubscribe menu entry and the confirmation on YouTube, so they go to YouTube like any action you take there.
- Remove actions are performed by clicking buttons on the YouTube page, so they go to YouTube like any action you take there.

## Permissions

| Permission | Why |
| --- | --- |
| `youtube.com` host access | Read the list and click remove, only on YouTube |
| `tabs` | Find your YouTube tab, open the source you pick in a background tab, and switch between it and the app when needed |
| `scripting` | Load the page scripts into the YouTube tab |
| `storage` | Remember the videos you kept, your rules, protected channels and unfinished queue |

Algo Polish does not read your password, cookies or any other site.

## Settings and setups

Rules, protected channels and saved setups are stored on your device (chrome.storage.local). Export settings saves them to a file you choose to keep; nothing is uploaded.

## Backups

Backup files are only made when you ask for one (the Backup button, or by answering yes in the bulk-removal popup). They are created by your browser as a normal download to your own device. The extension never uploads them. A subscriptions backup contains the names and links of your subscribed channels.
