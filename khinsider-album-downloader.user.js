// ==UserScript==
// @name     khinsider-album-downloader
// @version  1
// @grant    GM.xmlHttpRequest
// @require  https://cdn.rawgit.com/colxi/js-sleep/master/js-sleep.js
// @require  https://code.jquery.com/jquery-3.6.1.js
// @require  https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.0/jszip.min.js
// @include  https://*.khinsider.com/*
// ==/UserScript==





const MAX_DOWNLOAD_ASYNC = 5;


$(document).ready(function()
{
	$("#songlist_header").prepend(`<th><input type="checkbox" id="toggle-select-all-tracks" checked /></th>`);
	
	$("#songlist tr:gt(0)").prepend(`<td><input type="checkbox" class="select-track" checked  /></td>`);

	$("#toggle-select-all-tracks").on("change", function()
	{
		$(".select-track").prop("checked", $(this).is(":checked") == true);
	});

	$(".albumMassDownload").after(`
		<button style="margin-left:10px" id="download-selected-tracks">Download selected tracks</button>
		<br />
		<br />
	`);

	$("#download-selected-tracks").on("click", async function(e)
	{
		try
		{
			if($(this).is(":disabled") == true)
				return;

			e.preventDefault();
			e.stopPropagation();

			var originalMessage = $(this).html();
			$(this).html("Generating zip file");
			$(this).prop("disabled", true);

			var songLinks = Array.from($(".select-track:checked").parents("tr").find(".playlistDownloadSong a")).map(x => x.getAttribute("href"));

			console.log("songLinks", songLinks);

			var zip = new JSZip();

			var promises = Array();
			var zippedTrackCount = 0;

			var totalTrackCount = songLinks.length;

			var downloadCount = 0;
			var resolvedCount = 0;

			for(var link of songLinks)
			{
				downloadCount++;

				promises.push(new Promise(async (resolve, reject) =>
				{
					let res = await fetch(`https://downloads.khinsider.com${link}`);

					var content = await res.text();

					var trackDownloadLink = $(content).find(".songDownloadLink").parent().attr("href");

					console.log("track url", trackDownloadLink);

					res = await fetch(trackDownloadLink);
		
					let data = await res.arrayBuffer();
		
					console.log("Finished downloading: " + trackDownloadLink);

					zip.file(decodeURIComponent(trackDownloadLink.split("/").slice(-1)), data);

					console.log("added " + trackDownloadLink + " to zip");

					zippedTrackCount++;

					$(this).html(`Zipped song ${zippedTrackCount} out of ${totalTrackCount}`);
					
					resolvedCount++;

					resolve();					
				}));

				while(downloadCount - resolvedCount >= MAX_DOWNLOAD_ASYNC)
					await sleep(100);
			}

			await Promise.all(promises);

			$(this).html(`Generating download link`);

			var blob = await zip.generateAsync({ type: "blob" })
			var downloadLink = document.createElement("a");
			downloadLink.href = URL.createObjectURL(blob);
			downloadLink.download = $("#pageContent h2").first().text().trim() + ".zip";
			downloadLink.click();
		}
		catch(err)
		{
			console.error(err);
			alert(err.message);
		}

		$(this).prop("disabled", false);
		$(this).html(originalMessage);
	});
});