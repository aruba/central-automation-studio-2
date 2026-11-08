/*
Central Automation v2.x
Last Updated 2.0.0
Aaron Scott (WiFi Downunder) 2025-2026
*/

const uiURL = '/gravity/monitoring/scope-management/site/list';
const profileEndpoint = '/network-config/v1/sites';

var csvData;
var csvDataCount = 0;
var csvNotification;

var siteCounter = 0;
var siteErrors = 0;

function updateInformation() {
	getSiteConfigData(1).then(function () {
		refreshProfilesForHierarchy();
	});
}

function refreshProfilesForHierarchy() {
	loadProfilesTable();
}

function loadCurrentPageSite() {
	loadProfilesTable();
}

function loadProfilesTable() {
	var table = $('#profiles-table').DataTable();
	$('#profiles-table').DataTable().clear();
	
	let siteList = getConfigSites();
	
	siteList.forEach(function(profile) {
		let profileName = profile['scopeName'];
		let description = '';
		if (profile['address']) description = profile['address'];
		
		let siteHealth = getSiteForId(profile['id']);
		console.log(siteHealth)

		// Make Name as a link to Central
		let name = encodeURI(profile['name']);
		let apiURL = localStorage.getItem('base_url');
		let centralBaseURL = centralURLs[apiURL];
		let centralURL = centralBaseURL + uiURL;
		centralURL += '?contextType=global&selectedView=configuration&configMenu=sites&configView=list&configTab=profiles';
		
		// Profile specific info
		let collectionUrl = centralBaseURL + '/gravity/monitoring/scope-management/site-collection/sites?contextType=site-collection&selectedView=configuration&siteCollectionId='+profile['collectionId']+'&configView=list&configMenu=selected-site-collection&configTab=profiles';
		
		// Action buttons
		let mapsString = 'https://www.google.com/maps/search/?api=1&query='+profile['latitude']+','+profile['longitude'];
		let configString = 'https://internal-ui.central.arubanetworks.com/gravity/monitoring/config/profiles?contextType=site&selectedView=configuration&siteId='+profile['id']+'&selectedPlanet=sun&configMenu=selected-site&configView=profile&configTab=profiles';
		let deleteString = '';
		if (profile['deviceCount'] == 0) deleteString = '&nbsp;<span data-bs-toggle="tooltip" data-bs-placement="top" title="Delete Site"><a onclick="deleteProfile(\'' + profile['id'] + '\')"><strong><i class="fa-solid fa-trash fa-fw text-dark"></i></strong></a></span>';
		
		// Add row to table
		table.row.add(['<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(profileName) + '</strong></a><br />' + escapeHtml(description), escapeHtml(profile['city']), escapeHtml(profile['state']), escapeHtml(profile['zipcode']), escapeHtml(profile['country']), escapeHtml(profile['timezone']['timezoneId']), profile['collectionId'] ? '<a href="' + collectionUrl + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(profile['collectionName']) + '</strong></a>' : '-', escapeHtml(profile['deviceCount']), '<span data-bs-toggle="tooltip" data-bs-placement="top" title="Open location in Google Maps"><a href="' + mapsString + '" target="_blank" rel="noopener noreferrer"><strong><i class="fa-solid fa-globe-pointer fa-fw text-dark"></i></strong></a></span>&nbsp;<span data-bs-toggle="tooltip" data-bs-placement="top" title="Open config in Central"><a href="' + configString + '" target="_blank" rel="noopener noreferrer"><strong><i class="fa-solid fa-gear fa-fw text-dark"></i></strong></a></span>' + deleteString]);
		
		initializeTooltips(table.table().body());
	})
	$('#profiles-table').DataTable().rows().draw();
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Create new profile
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function openCreate() {
	new bootstrap.Modal(document.getElementById('createModal')).show();
}

function closeCreate() {
	(bootstrap.Modal.getInstance(document.getElementById('createModal')) || new bootstrap.Modal(document.getElementById('createModal'))).hide();
}

function createProfile() {
	loadCSVFile(this);
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
		CSV functions
	------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function processCSV(results) {
	apiErrorCount = 0;
	csvData = results.data;
	csvDataCount = csvData.length;
	forcedTokenRefresh = false;
}

function loadCSVFile(clickedRow) {
	const fileInput = document.getElementById('files');
	if (!fileInput.files.length) return;
	csvNotification = showNotification('ca-cpu', 'Processing CSV File...', 'bottom', 'center', 'info');
	Papa.parse(fileInput.files[0], {
		delimiter: ',',
		header: true,
		skipEmptyLines: 'greedy',
		transformHeader: function(h) {
			return h.toUpperCase().trim();
		},
		error: function(err) {
			showNotification('ca-c-warning', err.message, 'bottom', 'center', 'danger');
		},
		complete: function(results) {
			processCSV(results);
			if (csvNotification) csvNotification.close();
			if (!csvData) {
				showNotification('ca-c-warning', 'No CSV data found. Try selecting a CSV document.', 'bottom', 'center', 'danger');
				return;
			}
			Swal.fire({
				title: 'Creating Sites',
				html: csvData.length+' site(s) will be created. Are you sure?',
				footer: 'There is no undo for this operation',
				icon: 'question',
				showCancelButton: true,
				confirmButtonColor: '#3085d6',
				cancelButtonColor: '#888888',
				confirmButtonText: 'Yes',
				cancelButtonText: 'No',
			}).then(result => {
				if (result.isDismissed) {
					//importMode = importValues['RENAME'];
					//fileInput.click();
				} else {
					authenticateWithCentral().then(function() {
						createSites();
					});
				}
			});
		},
	});
}

function createSites() {
	csvNotification = showProgressNotification('ca-ca-pin-settings', 'Creating sites...', 'bottom', 'center', 'info');
	logStart('Creating sites...');
	
	siteCounter = 0;
	siteErrors = 0;
	let createTimeout = 0;
	csvData.forEach(function(row) {
		// check CSV row data
		if (row['SITE NAME'] && row['ADDRESS'] && row['CITY'] && row['STATE'] && row['POSTCODE'] && row['COUNTRY'] && row['TIMEZONE']) {
			setTimeout(createSite, createTimeout*apiDelay, row);
			createTimeout++;
		} else {
			logError(row['NAME']+ ' is missing mandatory information required to create a site');
			siteErrors++;
			checkForSiteCompletion();
		}
	});
}

function createSite(siteInfo) {
	let siteName = siteInfo['SITE NAME'];
	let siteDict = {
		name: siteInfo['SITE NAME'],
		city: siteInfo['CITY'],
		state: siteInfo['STATE'],
		country: siteInfo['COUNTRY'],
		zipcode: siteInfo['POSTCODE'],
		address: siteInfo['ADDRESS'],
		timezone: {timezoneId: siteInfo['TIMEZONE']}
	};
	if (siteInfo['LONGITUDE'] && siteInfo['LATITUDE']) {
		siteDict['longitude'] = parseFloat(siteInfo['LONGITUDE']);
		siteDict['latitude'] = parseFloat(siteInfo['LATITUDE']);
	}
	
	fetchProxyWithAuth('/tools/postCommandwHeaders', {
		url: localStorage.getItem('base_url') + profileEndpoint,
		access_token: localStorage.getItem('access_token'),
		data: JSON.stringify(siteDict)
	})
	.then(function(commandResults) {
		// Process The status code of the result
		var result = processStatus(commandResults);

		// will return the status code to trigger next step
		if (result == 429 || result == 409) {
			//console.log(JSON.parse(commandResults.responseBody))
			// Over API threshold limit. Wait 'apiWaitDelay' value and try again.
			setTimeout(createSite, apiWaitDelay, siteInfo);
			return;
		} else if (result !== 200) {
			if (commandResults['message']) logError('Unable to create site for '+siteName + ': '+ commandResults['message']);
			else logError('Unable to create site for '+siteName);
			siteErrors++;
		} else {
			logInformation('Site "'+ siteName + '" was successfully created');
		}
		checkForSiteCompletion();
	}).catch(function(err) {
		logError('Unable to create site for '+siteName+' due to API connection error');
		siteErrors++;
		checkForSiteCompletion();
	});
}

function checkForSiteCompletion() {
	siteCounter++;
	var siteProgress = (siteCounter / csvData.length) * 100;
	csvNotification.update({ progress: siteProgress });	
	
	if (siteCounter >= csvData.length) {
		if (csvNotification) csvNotification.close();
		if (siteErrors != 0) {
			Swal.fire({
				title: 'Site Creation Failure',
				text: siteErrors+ ' site(s) failed to be created',
				icon: 'error',
				showCancelButton: true,
				confirmButtonColor: '#3085d6',
				cancelButtonColor: '#888888',
				confirmButtonText: 'OK',
				cancelButtonText: 'Show Log',
			}).then(result => {
				if (result.isDismissed) {
					(bootstrap.Modal.getInstance(document.getElementById('createModal')) || new bootstrap.Modal(document.getElementById('createModal'))).hide();
					setTimeout(showLog,500);
				}
			});
		} else {
			Swal.fire({
				title: 'Site Creation Success',
				text: 'All sites were created',
				icon: 'success',
				showCancelButton: true,
				confirmButtonColor: '#3085d6',
				cancelButtonColor: '#888888',
				confirmButtonText: 'OK',
				cancelButtonText: 'Show Log',
			}).then(result => {
				if (result.isDismissed) {
					(bootstrap.Modal.getInstance(document.getElementById('createModal')) || new bootstrap.Modal(document.getElementById('createModal'))).hide();
					setTimeout(showLog,500);
				}
			});
		}
		
		logEnd('Site creation complete');
		updateInformation();
	}
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Deleting Profiles
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function deleteProfile(profileName) {
	let siteList = getConfigSites();
	siteList.forEach(function(profileItem) {
		let profile = { ...profileItem };
		let cleanProfile = profile['id'].toString();
		if (cleanProfile === profileName) {
			Swal.fire({
				title: 'Delete Site',
				html: 'Are you sure you want to delete the Site "'+ getSiteForId(profileName).siteName+'"',
				footer: 'There is no undo for this operation',
				icon: 'warning',
				showCancelButton: true,
				confirmButtonColor: '#3085d6',
				cancelButtonColor: '#888888',
				confirmButtonText: 'Yes',
				cancelButtonText: 'No',
			}).then(result => {
				if (result.isDismissed) {
					return false;
				} else {
					deleteProfileConfirmed(profileName, false);
				}
			});
		}
	});
	
}

function deleteProfileConfirmed(profileName) {
	let siteName = getSiteForId(profileName).siteName;

	logStart('Deleting Site "'+ siteName+'"');
	fetchProxyWithAuth('/tools/deleteCommand', {
		url: localStorage.getItem('base_url') + profileEndpoint + '?scope-id='+ profileName,
		access_token: localStorage.getItem('access_token')
	})
		.then(function(commandResults) {
			if (commandResults.hasOwnProperty('headers')) {
				//updateAPILimits(JSON.parse(commandResults.headers));
			}
			// Process The status code of the result
			let result = processStatus(commandResults);
			// will return the status code to trigger next step
			if (result == 429 || result == 409) {
				// Over API threshold limit or backend busy. Wait apiWaitDelay value and try again.
				setTimeout(deleteProfileConfirmed, apiWaitDelay, profileName);
			} else if (result !== 200) {
				logError('Unable to delete Site "'+ siteName+'"');
				showNotification('ca-bin', 'Unable to delete site', 'bottom', 'center', 'danger');
			} else {
				logInformation('Site "'+ siteName + '" was deleted');
				showNotification('ca-bin', 'Site '+siteName+' was successfully deleted', 'bottom', 'center', 'success');
			}
			updateInformation();
			logEnd('Site Deletion complete');
		}).catch(function(err) {
			logError('Failed to delete Site "'+siteName+'"');
		});
}