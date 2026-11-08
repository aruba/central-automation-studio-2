/*
Central Automation v2.x
Last Updated 2.0.0
Aaron Scott (WiFi Downunder) 2025-2026
*/

var profileNotification;
var saveNotification;
var profiles = [];
var editingProfile = '';
var editingConfig = {};
var editingScope = '';
var editingPersona = '';
var editingType = 'SHARED';

var option82Selector;

var profileSelector;
const profileName = 'AP System'
const profileUniqueLeaf = 'name'
const profileType = 'ap-system';
const singleInstance = true;

var deletePromise;
var deleteResolve;
var deleteReject;

var profileEndpoint = '/network-config/v1/ap-system';
var uiURL = '/gravity/monitoring/config/profiles/apsystem';
var selectedHierarchyLevel = 'library';
var selectedScopeId = '';

function populateChoices() {
	let splocationElement = document.getElementById('indoor-sp-location');
	if (splocationElement) {
		splocationElement.addEventListener('change', function() {
			changeSPLocation(this.checked);
		});
	}
	
	let dfElement = document.getElementById('devicefunctionselector');
	if (dfElement) {
		deviceFunctionSelector = new Choices(dfElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: "Press to select",
			removeItemButton:true
		});
		let deviceFunctionChoices = [];
		deviceFunctionChoices.push({ value: 'CAMPUS_AP', label: 'Campus AP' });
		//deviceFunctionChoices.push({ value: 'MICROBRANCH_AP', label: 'Microbranch AP' });
		deviceFunctionSelector.clearChoices();
		deviceFunctionSelector.setChoices(deviceFunctionChoices);
		deviceFunctionSelector.setChoiceByValue(['CAMPUS_AP']);
	}
	
	var optionElement = document.getElementById('dhcp-option82-xml');
	if (optionElement) {
			option82Selector = new Choices(optionElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: ""
		});
		var optionChoices = [];
		optionChoices.push({ value: 'NONE', label: 'None' });
		optionChoices.push({ value: 'DEFAULT_DHCPOPT82_1_XML', label: 'Default Options 1' });
		optionChoices.push({ value: 'DEFAULT_DHCPOPT82_2_XML', label: 'Default Options 2' });
		optionChoices.push({ value: 'DEFAULT_DHCPOPT82_3_XML', label: 'Default Options 3' });
		option82Selector.clearChoices();
		option82Selector.setChoices(optionChoices);
		option82Selector.setChoiceByValue('NONE');
		
		optionElement.addEventListener('change', function() {
			changeOption82();
		});
	}
}

function populateProfileChoice() {
	let pElement = document.getElementById('profileselector');
	if (pElement) {
		if (!profileSelector) {
			profileSelector = new Choices(pElement, {
				searchEnabled: false,
				shouldSort: true,
				itemSelectText: "Press to select",
				removeItemButton:true
			});
		}
		let selectChoices = [];
		profiles.forEach(function(p) {
			selectChoices.push({ value: p.name, label: p.name });
		});
		profileSelector.clearChoices();
		profileSelector.setChoices(selectChoices);	
	}
}

function hierarchyChange(scopeID, hierarchyLevel) {
	// Override at each page
	refreshProfilesForHierarchy();
}

function updateInformation() {
	getHierarchyData().then(function() {
		refreshProfilesForHierarchy();
	});
}

function refreshProfilesForHierarchy() {
	// Split selector value into scopeid and hierarchy level 
	var hierarchyChoices = getHierarchySelector();
	var matches =  hierarchyChoices.getValue(true).match(/^(.*?)::(.*)/);
	selectedHierarchyLevel = matches[1];
	selectedScopeId = matches[2];
	authenticateWithCentral().then(function() {
		profiles = [];
		getProfiles(0, selectedScopeId);
	});
}

function getProfiles(offset, scope) {
	
	if (profileNotification) profileNotification.close();
	profileNotification = showNotification('ca-ap-icon3', 'Obtaining profiles...', 'bottom', 'center', 'info');
	
	let command = profileEndpoint + '?detailed=true';
	if (scope !== 'Library') command = profileEndpoint + '?effective=true&detailed=true&view_type=LOCAL&scope_id='+scope;

	fetchProxyWithAuth('/tools/getCommandwHeaders', {
		url: localStorage.getItem('base_url') + command,
		access_token: localStorage.getItem('access_token'),
	})
	.then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		//console.log(commandResults)
		// Process The status code of the result
		let result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429 || result == 409) {
			setTimeout(getProfiles, apiWaitDelay, offset);
		} else if (result !== 200) {
			if (profileNotification) {
				profileNotification.update({ type: 'danger', message: 'Failed to retrieve AP System Profiles' });
				setTimeout(profileNotification.close, 2000);
			}
		} else {
			let response = JSON.parse(commandResults.responseBody);
			if (response['profile']) profiles = profiles.concat(response['profile']);
			offset = response.offset;
			if (offset) {
				let getProgress = ((profiles.length) / response.total) * 100;
				profileNotification.update({ progress: getProgress });
				getProfiles(offset,scope);
			} else {
				if (profileNotification) {
					profileNotification.update({ progress: 100, type: 'success', message: 'Retrieved AP System Profiles' });
					setTimeout(profileNotification.close, 1000);
				}
				loadProfilesTable();
				populateProfileChoice();
			}
		}
	});
}

function loadProfilesTable() {
	let table = $('#profiles-table').DataTable();
	disposeTooltips(document.getElementById('profiles-table'));
	$('#profiles-table').DataTable().clear();
	
	profiles.forEach(function(profile) {
		let profileName = profile['name'].replace(/^ /, "&nbsp");
		let description = '';
		if (profile['description']) description = profile['description'];
		let editable = true;
		if (profile['@'] && profile['@']['aruba-annotation:is_editable']) {
			editable = profile['@']['aruba-annotation:is_editable'];
		}
		
		// Action Buttons
		let status = '<i class="fa-solid fa-diamond text-danger"></i>';
		let actionBtns = '';
		if (editable) {
			actionBtns += '<a class="btn btn-link btn-warning mt-2" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Edit UI" onclick="loadEditUI(\'' + profileName + '\')"><i class="fa-solid fa-pencil" style="color: #67748e; font-size:18px;"></i></a> ';
			actionBtns += '<a class="btn btn-link btn-warning mt-2" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Edit JSON" onclick="loadJSONUI(\'' + profileName + '\')"><i class="fa-solid fa-rectangle-code" style="color: #67748e; font-size:18px;"></i></a> ';
		}
		
		// Make Name as a link to Central
		let name = encodeURI(profile['name']);
		let apiURL = localStorage.getItem('base_url');
		let centralBaseURL = centralURLs[apiURL];
		let centralURL = centralBaseURL + uiURL;
		if (selectedHierarchyLevel == 'library') centralURL += '?contextType=global&selectedView=configuration&configMenu=library&configView=profile&configTab=profiles';
		else if (selectedHierarchyLevel == 'global') centralURL += '?contextType=global&selectedView=configuration&configMenu=global&configView=profile&configTab=profiles';
		else if (selectedHierarchyLevel == 'site-collection') centralURL += '?contextType=site-collection&selectedView=configuration&configMenu=selected-site-collection&configTab=profiles&configView=profile&siteCollectionId='+selectedScopeId;
		else if (selectedHierarchyLevel == 'site') centralURL += '?contextType=site&selectedView=configuration&siteId='+selectedScopeId+'&configMenu=selected-site&configTab=profiles&configView=profile';
		else if (selectedHierarchyLevel == 'device-group') centralURL += '?contextType=device-group&selectedView=configuration&deviceGroupId='+selectedScopeId+'&configMenu=selected-device-group&configTab=profiles&configView=profile';
		
		let scopeInfo = [];
		if (profile['@'] && profile['@']['aruba-annotation:scope_device_function']) {
			scopeInfo = parseScopeDeviceFunction(profile['@']['aruba-annotation:scope_device_function']);
		}
		
		let scopeDescriptions = [];
		scopeInfo.forEach(function(si) {
			let currentDevice = findDeviceInMonitoring(si['scope_name']);
			if (currentDevice) scopeDescriptions.push(currentDevice['deviceName'] + ' <i>(' +deviceFunctionDisplay[si['device_function']] + ')</i>');
			else if (si['scope_type'] === 'GLOBAL') scopeDescriptions.push('Global' + ' <i>(' +deviceFunctionDisplay[si['device_function']] + ')</i>');
			else scopeDescriptions.push(si['scope_name'] + ' <i>(' +deviceFunctionDisplay[si['device_function']] + ')</i>');
		})
		if (scopeDescriptions.length == 0) scopeDescriptions.push('-')
		
		let icon = '<i class="fa-regular fa-thumbtack-angle" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Local Profile"></i> ';
		if (profile['@'] && profile['@']['aruba-annotation:object_type']) {
			if (profile['@']['aruba-annotation:object_type'] === "SHARED") icon = '<i class="fa-regular fa-share-nodes" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Library Profile"></i> ';
		}
		
		if (profile['@'] && profile['@']['aruba-annotation:inherited']) {
			icon += '<i class="fa-regular fa-up" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Inherited from '+scopeDisplay[profile['@']['aruba-annotation:overridden_scope']]+'"></i>';
		} else {
			if (profile['@'] && profile['@']['aruba-annotation:overridden_scope'] && profile['@']['aruba-annotation:overridden_scope'] !== '') {
				icon += '<i class="fa-solid fa-circle-dot" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Overriding: '+scopeDisplay[profile['@']['aruba-annotation:overridden_scope']]+'"></i>';
			}
			if (profile['@'] && profile['@']['aruba-annotation:overriding_scopes_count'] && profile['@']['aruba-annotation:overriding_scopes_count'] > 0) {
				if (profile['@']['aruba-annotation:overriding_scopes_count'] < 10) icon += '<i class="fa-regular fa-circle-'+profile['@']['aruba-annotation:overriding_scopes_count']+'" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Overriding Profiles: '+profile['@']['aruba-annotation:overriding_scopes_count']+'"></i>';
				else icon += '<i class="fa-solid fa-circle-dot" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Overriding Profiles: '+profile['@']['aruba-annotation:overriding_scopes_count']+'"></i>';
			}
		}
		
		if (scopeDescriptions.length == 1 && scopeDescriptions[0] === '-') {
			actionBtns += '<a class="btn btn-link btn-warning mt-2" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Delete WLAN" onclick="deleteProfile(\'' + profileName + '\')"><i class="fa-solid fa-trash-can" style="color: #67748e; font-size:18px;"></i></a> ';
		}

		// Add row to table
		table.row.add([icon, '<a href="' + centralURL + '" target="_blank"><strong>' + profileName + '</strong></a><br />'+description, scopeDescriptions.join('<br>'), actionBtns]);
	});
	$('#profiles-table').DataTable().rows().draw();
	initializeTooltips(document.getElementById('profiles-table'));
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Deleting Profiles
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function deleteProfile(profileName) {
	profiles.forEach(function(p) {
		let profile = { ...p };
		var cleanProfile = profile['name'].replace(/^ /, "&nbsp");
		if (cleanProfile === profileName) {
			Swal.fire({
				title: 'Delete Profile',
				html: 'Are you sure you want to delete "'+profileName+'"?',
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
					deleteProfileConfirmed(profileName);
				}
			});
		}
	});
	
}

function deleteProfileConfirmed(profileName) {
	authenticateWithCentral().then(function() {
		logStart('Deleting AP System profile: '+ profileName);
		deleteSystem(profileName);
	});
}

function deleteSystem(profileName) {
	deletePromise = new Promise(function(resolve, reject) { deleteResolve = resolve; deleteReject = reject; });
	fetchProxyWithAuth('/tools/deleteCommand', {
		url: localStorage.getItem('base_url') + profileEndpoint + '/' + profileName,
		access_token: localStorage.getItem('access_token'),
	})
	.then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		//console.log(commandResults)
		// Process The status code of the result
		let result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429 || result == 409) {
			// Over API threshold limit or backend busy. Wait apiWaitDelay value and try again.
			setTimeout(deleteSystem, apiWaitDelay, profileName);
		} else if (result !== 200) {
			logError('Unable to delete '+ profileName);
			showNotification('ca-bin', 'Unable to delete profile', 'bottom', 'center', 'danger');
			if (deleteReject) deleteReject();
		} else {
			logInformation(profileName + ' was deleted');
			showNotification('ca-bin', profileName+' was successfully deleted', 'bottom', 'center', 'success');
			deleteResolve();
		}
		updateInformation();
		logEnd('Profile deletion complete');
	}).catch(function(err) {
		logError('Failed to delete '+profileName);
		if (deleteReject) deleteReject();
	});
	return deletePromise;
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Loading Profiles UI
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */


function loadJSONUI(profileName) {
	let config = '';
	profiles.forEach(function(p) {
		let profile = { ...p };
		let cleanProfile = profile['name'].replace(/^ /, "&nbsp");
		if (cleanProfile === profileName) {
			
			if (profile['@']['aruba-annotation:object_type'] === 'LOCAL') {
				let scopeInfo = [{scope_name:'', device_function:''}];
				if (profile['@'] && profile['@']['aruba-annotation:scope_device_function']) {
					scopeInfo = parseScopeDeviceFunction(profile['@']['aruba-annotation:scope_device_function']);
				}		
				editingType = 'LOCAL'		
				editingScope = scopeInfo[0]['scope_id'];
				editingPersona = scopeInfo[0]['device_function']
			} else {
				editingType = 'SHARED';
			}
			
			delete profile['@']; 
			config = JSON.stringify(profile, null, 2);
			document.getElementById('profileConfig').value = config;
			document.getElementById('json-title').innerHTML = 'AP System Configuration: <strong>'+ cleanProfile + '</strong>'
			editingProfile = profileName;
			new bootstrap.Modal(document.getElementById('JSONModal')).show();
		}
	});
}

function closeJSON() {
	(bootstrap.Modal.getInstance(document.getElementById('JSONModal')) || new bootstrap.Modal(document.getElementById('JSONModal'))).hide();
}

function updateJSON() {
	if (!isValidJSON(document.getElementById('profileConfig').value)) showNotification('ca-window-code', 'Input is not valid JSON', 'bottom', 'center', 'warning')
	else {
		logStart('Updating AP System Profile: '+editingProfile);
		authenticateWithCentral().then(function() {
			if (saveNotification) saveNotification.close();
			saveNotification = showNotification('ca-ap-icon3', 'Saving Profile: "'+editingProfile+'"...' , 'bottom', 'center', 'info');

			let config = document.getElementById('profileConfig').value;

			let command = profileEndpoint + '/' + editingProfile;
			if (editingType === 'LOCAL') command = profileEndpoint + '/' + editingProfile + '?object_type=LOCAL&scope_id='+editingScope+'&persona='+editingPersona;

			fetchProxyWithAuth('/tools/putCommandwHeaders', {
				url: localStorage.getItem('base_url') + command,
				access_token: localStorage.getItem('access_token'),
				data: config,
			})
			.then(function(commandResults) {
				let result = processStatus(commandResults);
				if (result == 429 || result == 409) {
					if (saveNotification) {
						saveNotification.update({ type: 'danger', message: 'Unable to save profile: "'+editingProfile+'". API Rate Limit hit. Please try again.' });
						setTimeout(saveNotification.close, 2000);
					}
				} else if (result == 400) {
					logError('Unable to update AP System profile: '+editingProfile);
					if (saveNotification) {
						message = JSON.parse(commandResults['responseBody']);
						saveNotification.update({ type: 'warning', message: 'Unable to save profile: "'+ editingProfile+'"<br> '+ message['message'] });
						setTimeout(profileNotification.close, 10000);
					}
				} else if (result !== 200) {
					logError('Unable to update AP System profile: '+editingProfile);
				} else {
					logInformation('AP System profile: ' + editingProfile + ' was updated successfully');
					if (saveNotification) {
						saveNotification.update({ type: 'success', message: 'AP System profile was updated' });
						setTimeout(profileNotification.close, 1000);
					}
					(bootstrap.Modal.getInstance(document.getElementById('JSONModal')) || new bootstrap.Modal(document.getElementById('JSONModal'))).hide();
					refreshProfilesForHierarchy();
				}
			});
		});
	}
}

function loadEditUI(profileName) {
	let config = '';
	profiles.forEach(function(p) {
		if (p['name'] === profileName) {
			let profile = { ...p };
			let profileName = profile['name'].replace(/^ /, "&nbsp");
				
			if (profile['@']['aruba-annotation:object_type'] === 'LOCAL') {
				let scopeInfo = [{scope_name:'', device_function:''}];
				if (profile['@'] && profile['@']['aruba-annotation:scope_device_function']) {
					scopeInfo = parseScopeDeviceFunction(profile['@']['aruba-annotation:scope_device_function']);
				}		
				editingType = 'LOCAL'		
				editingScope = scopeInfo[0]['scope_id'];
				editingPersona = scopeInfo[0]['device_function']
			} else {
				editingType = 'SHARED';
			}
			
			delete profile['@']; 
			editingConfig = profile;
			// Load all the settings into the UI
			// load the Current Settings section
			document.getElementById('profileName').value = profileName;
			if (profile['description']) document.getElementById('description').value = profile['description'];
			else document.getElementById('description').value = '';
			
			// Read Only Config
			if (profile['country-code'] === 'AUTO') document.getElementById('country-code').innerHTML = '<strong>Country Code: </strong>Auto (Based on Site)';
			else document.getElementById('country-code').innerHTML = '<strong>Country Code: </strong>'+profile['country-code'];
			if (profile['timezone']['name'] === 'AUTO') document.getElementById('timezone').innerHTML = '<strong>Timezone: </strong>Auto (Based on Site)';
			else document.getElementById('timezone').innerHTML = '<strong>Timezone: </strong>'+titleCase(profile['timezone']['name']);
			document.getElementById('ip-mode').innerHTML = '<strong>IP Mode: </strong>'+ipmode[profile['ip-mode']];
			if (profile['firsthop-security']) document.getElementById('firsthop-security').innerHTML = '<strong>RA & ND Guard: </strong><i class="fa-solid fa-circle-check"></i>';
			else document.getElementById('firsthop-security').innerHTML = '<strong>RA & ND Guard: </strong><i class="fa-solid fa-octagon-xmark"></i>';
			
			let ledDisplay = '<i class="fa-solid fa-octagon-xmark"></i>';
			if (profile['led']) ledDisplay = '<i class="fa-solid fa-circle-check"></i>';
			document.getElementById('led').innerHTML = '<strong>LED: </strong>'+ledDisplay;
			let usb = '<i class="fa-solid fa-octagon-xmark"></i>';
			if (!profile['usb-port-disable']) usb = '<i class="fa-solid fa-circle-check"></i>';
			document.getElementById('usb-port-disable').innerHTML = '<strong>USB Port: </strong>'+usb;
			document.getElementById('lacp').innerHTML = '<strong>LACP Mode: </strong>'+titleCase(profile['lacp']);
			
			let restrictedAccess = '<i class="fa-solid fa-octagon-xmark"></i>';
			if (profile['restricted-access']) restrictedAccess = '<i class="fa-solid fa-circle-check"></i> '+profile['restricted-access'].length + ' subnets';
			document.getElementById('restricted-access').innerHTML = '<strong>Restricted Access: </strong>'+restrictedAccess;
			document.getElementById('auth-survivability-cachetime').innerHTML = '<strong>Auth Survivability: </strong>'+profile['aaa']['auth-survivability-cachetime']+'hrs';
			
			// General Config
			if (profile.hasOwnProperty('drt-upgrade-disable')) document.getElementById('drt-upgrade-disable').checked = profile['drt-upgrade-disable'];
			else document.getElementById('drt-upgrade-disable').checked = false;
			if (profile.hasOwnProperty('disable-factory-reset')) document.getElementById('disable-factory-reset').checked = profile['disable-factory-reset'];
			else document.getElementById('disable-factory-reset').checked = false;
			if (profile.hasOwnProperty('itm')) document.getElementById('itm').checked = profile['itm'];
			else document.getElementById('itm').checked = false;
			if (profile.hasOwnProperty('poe-power-optimization-enable')) document.getElementById('poe-power-optimization-enable').checked = profile['poe-power-optimization-enable'];
			else document.getElementById('poe-power-optimization-enable').checked = false;
			if (profile.hasOwnProperty('voip-qos-trusted')) document.getElementById('voip-qos-trusted').checked = profile['voip-qos-trusted'];
			else document.getElementById('voip-qos-trusted').checked = false;
			if (profile.hasOwnProperty('dhcp-option82-xml')) option82Selector.setChoiceByValue(profile['dhcp-option82-xml']);
			else option82Selector.setChoiceByValue('NONE');
			if (profile.hasOwnProperty('dhcp-option82-xml-vlan-list')) document.getElementById('dhcp-option82-xml-vlan-list').value = profile['dhcp-option82-xml-vlan-list'];
			else document.getElementById('dhcp-option82-xml-vlan-list').value = '';
			changeOption82();
			if (profile.hasOwnProperty('out-of-service-hold-on-time')) document.getElementById('out-of-service-hold-on-time').value = profile['out-of-service-hold-on-time'];
			else document.getElementById('out-of-service-hold-on-time').value = 30;
			if (profile.hasOwnProperty('mtu')) document.getElementById('mtu').value = profile['mtu'];
			else document.getElementById('mtu').value = 1300;
			
			// Recovery Config
			if (profile.hasOwnProperty('advertise-ap-health-ie')) document.getElementById('advertise-ap-health-ie').checked = profile['advertise-ap-health-ie'];
			else document.getElementById('advertise-ap-health-ie').checked = true;
			if (profile.hasOwnProperty('recovery-ssid-backoff-time')) document.getElementById('recovery-ssid-backoff-time').value = profile['recovery-ssid-backoff-time'];
			else document.getElementById('recovery-ssid-backoff-time').value = 3;
			
			// Location Config
			if (profile.hasOwnProperty('advertise-location')) document.getElementById('advertise-location').checked = profile['advertise-location'];
			else document.getElementById('advertise-location').checked = false;
			if (profile.hasOwnProperty('barometer') && profile['barometer'].hasOwnProperty('enable')) document.getElementById('barometer').value = profile['barometer']['enable'];
			else document.getElementById('barometer').checked = true;
			if (profile.hasOwnProperty('gps') && profile['gps'].hasOwnProperty('indoor-sp-location')) document.getElementById('indoor-sp-location').checked = profile['gps']['indoor-sp-location'];
			else document.getElementById('indoor-sp-location').checked = false;
			changeSPLocation(document.getElementById('indoor-sp-location').checked);
			if (profile.hasOwnProperty('max-relay-distance')) document.getElementById('max-relay-distance').value = profile['max-relay-distance'];
			else document.getElementById('max-relay-distance').value = 500;
			
			// Security Config
			if (profile.hasOwnProperty('data-encryption')) document.getElementById('data-encryption').checked = profile['data-encryption'];
			else document.getElementById('data-encryption').checked = false;
			if (profile.hasOwnProperty('fips-enable')) document.getElementById('fips-enable').checked = profile['fips-enable'];
			else document.getElementById('fips-enable').checked = false;
			if (profile.hasOwnProperty('signature-bypass-strict-check')) document.getElementById('signature-bypass-strict-check').checked = profile['signature-bypass-strict-check'];
			else document.getElementById('signature-bypass-strict-check').checked = false;
			if (profile.hasOwnProperty('deny-local-routing')) document.getElementById('deny-local-routing').checked = profile['deny-local-routing'];
			else document.getElementById('deny-local-routing').checked = true;
			if (profile.hasOwnProperty('aaa') && profile['aaa'].hasOwnProperty('aaa-dns-query-interval')) document.getElementById('aaa-dns-query-interval').value = profile['aaa']['aaa-dns-query-interval'];
			else document.getElementById('aaa-dns-query-interval').value = 15;
			if (profile.hasOwnProperty('aaa') && profile['aaa'].hasOwnProperty('auth-failure-denylist-time')) document.getElementById('auth-failure-denylist-time').value = profile['aaa']['auth-failure-denylist-time'];
			else document.getElementById('auth-failure-denylist-time').value = 3600;
			if (profile.hasOwnProperty('aaa') && profile['aaa'].hasOwnProperty('denylist-time')) document.getElementById('denylist-time').value = profile['aaa']['denylist-time'];
			else document.getElementById('denylist-time').value = 3600;
			if (profile.hasOwnProperty('aaa') && profile['aaa'].hasOwnProperty('dot1x-eap-frag-mtu')) document.getElementById('dot1x-eap-frag-mtu').value = profile['aaa']['dot1x-eap-frag-mtu'];
			else document.getElementById('dot1x-eap-frag-mtu').value = '';
			
			// Roaming Config
			if (profile.hasOwnProperty('aaa') && profile['aaa'].hasOwnProperty('local-keyfetch') && profile['aaa']['local-keyfetch'] === 'KEYFETCH_OFF') document.getElementById('local-keyfetch').checked = false;
			else document.getElementById('local-keyfetch').checked = true;
			if (profile.hasOwnProperty('aaa') && profile['aaa'].hasOwnProperty('gateway-key-caching')) document.getElementById('gateway-key-caching').checked = profile['aaa']['gateway-key-caching'];
			else document.getElementById('gateway-key-caching').checked = true;
			if (profile.hasOwnProperty('aaa') && profile['aaa'].hasOwnProperty('pmk-cache-timeout')) document.getElementById('pmk-cache-timeout').value = profile['aaa']['pmk-cache-timeout'];
			else document.getElementById('pmk-cache-timeout').value = 24;
			if (profile.hasOwnProperty('aaa') && profile['aaa'].hasOwnProperty('max-pmk-cache-threshold')) document.getElementById('max-pmk-cache-threshold').value = profile['aaa']['max-pmk-cache-threshold'];
			else document.getElementById('max-pmk-cache-threshold').value = '';
			
			editingProfile = profileName;
			new bootstrap.Modal(document.getElementById('UIModal')).show();
		}
	})
	
}

function closeEditUI() {
	(bootstrap.Modal.getInstance(document.getElementById('UIModal')) || new bootstrap.Modal(document.getElementById('UIModal'))).hide();
}

function updateUIProfile() {
	// Update config based on UI knobs
	if (document.getElementById('description').value !== '') editingConfig['description'] = document.getElementById('description').value;
	else delete editingConfig['description'];
	
	if (validateUIForm()) {
		showNotification('ca-ap-icon3', 'The profile contains invalid values. Please correct the values.' , 'bottom', 'center', 'warning');
		return;
	}
	//General Config
	editingConfig['drt-upgrade-disable'] = document.getElementById('drt-upgrade-disable').checked;
	editingConfig['disable-factory-reset'] = document.getElementById('disable-factory-reset').checked;
	editingConfig['itm'] = document.getElementById('itm').checked;
	editingConfig['poe-power-optimization-enable'] = document.getElementById('poe-power-optimization-enable').checked;
	editingConfig['voip-qos-trusted'] = document.getElementById('voip-qos-trusted').checked;
	if (option82Selector.getValue(true) !== 'NONE') {
		editingConfig['dhcp-option82-xml'] = option82Selector.getValue(true);
		let vlanList = document.getElementById('dhcp-option82-xml-vlan-list').value;
		if (vlanList !== '' && validateVlanInput(vlanList)) editingConfig['dhcp-option82-xml-vlan-list'] = document.getElementById('dhcp-option82-xml-vlan-list').value;
		else editingConfig['dhcp-option82-xml-vlan-list'];
	} else {
		delete editingConfig['dhcp-option82-xml'];
		delete editingConfig['dhcp-option82-xml-vlan-list'];
	}
	editingConfig['out-of-service-hold-on-time'] = parseInt(document.getElementById('out-of-service-hold-on-time').value);
	editingConfig['mtu'] = parseInt(document.getElementById('mtu').value);
	
	// Recovery Config
	editingConfig['advertise-ap-health-ie'] = document.getElementById('advertise-ap-health-ie').checked;
	editingConfig['recovery-ssid-backoff-time'] = parseInt(document.getElementById('recovery-ssid-backoff-time').value);
	
	// Location Config
	editingConfig['advertise-location'] = document.getElementById('advertise-location').checked;
	editingConfig['gps']['indoor-sp-location'] = document.getElementById('indoor-sp-location').checked;
	if (document.getElementById('indoor-sp-location').checked) {
		editingConfig['gps']['max-relay-distance'] = parseInt(document.getElementById('max-relay-distance').value);
	}
	
	// Security Config
	editingConfig['data-encryption'] = document.getElementById('data-encryption').checked;
	editingConfig['fips-enable'] = document.getElementById('fips-enable').checked;
	editingConfig['signature-bypass-strict-check'] = document.getElementById('signature-bypass-strict-check').checked;
	editingConfig['deny-local-routing'] = document.getElementById('deny-local-routing').checked;
	editingConfig['aaa']['aaa-dns-query-interval'] = parseInt(document.getElementById('aaa-dns-query-interval').value);
	editingConfig['aaa']['auth-failure-denylist-time'] = parseInt(document.getElementById('auth-failure-denylist-time').value);
	editingConfig['aaa']['denylist-time'] = parseInt(document.getElementById('denylist-time').value);
	if (parseInt(document.getElementById('dot1x-eap-frag-mtu').value)) editingConfig['aaa']['dot1x-eap-frag-mtu'] = parseInt(document.getElementById('dot1x-eap-frag-mtu').value);
	else delete editingConfig['aaa']['dot1x-eap-frag-mtu']
	
	// Roaming Confing
	if (document.getElementById('local-keyfetch').checked) editingConfig['aaa']['local-keyfetch'] = 'ENCKEY_DEFAULT';
	else editingConfig['aaa']['local-keyfetch'] = 'KEYFETCH_OFF';
	editingConfig['aaa']['gateway-key-caching'] = document.getElementById('gateway-key-caching').checked;
	editingConfig['aaa']['pmk-cache-timeout'] = parseInt(document.getElementById('pmk-cache-timeout').value);
	if (parseInt(document.getElementById('max-pmk-cache-threshold').value)) editingConfig['aaa']['max-pmk-cache-threshold'] = parseInt(document.getElementById('max-pmk-cache-threshold').value);
	else delete editingConfig['aaa']['max-pmk-cache-threshold']

	//console.log(editingConfig)
	
	// Save back to Central
	logStart('Updating AP System Profile: '+editingProfile);
	authenticateWithCentral().then(function() {
		if (saveNotification) saveNotification.close();
		saveNotification = showNotification('ca-wifi', 'Saving Profile: "'+editingProfile+'"...' , 'bottom', 'center', 'info');

		let command = profileEndpoint + '/' + editingProfile;
		if (editingType === 'LOCAL') command = profileEndpoint + '/' + editingProfile + '?object_type=LOCAL&scope_id='+editingScope+'&persona='+editingPersona;

		fetchProxyWithAuth('/tools/putCommandwHeaders', {
			url: localStorage.getItem('base_url') + command,
			access_token: localStorage.getItem('access_token'),
			data: JSON.stringify(editingConfig),
		})
		.then(function(commandResults) {
			let result = processStatus(commandResults);
			if (result == 429 || result == 409) {
				if (saveNotification) {
					saveNotification.update({ type: 'danger', message: 'Unable to save AP System: "'+editingProfile+'". API Rate Limit hit. Please try again.' });
					setTimeout(saveNotification.close, 2000);
				}
			} else if (result == 400) {
				logError('Unable to update AP System profile: '+editingProfile);
				if (saveNotification) {
					message = JSON.parse(commandResults['responseBody']);
					saveNotification.update({ type: 'warning', message: 'Unable to save AP System: "'+ editingProfile+'"<br> '+ message['message'] });
					setTimeout(saveNotification.close, 10000);
				}
			} else if (result !== 200) {
				if (saveNotification) {
					message = JSON.parse(commandResults['responseBody']);
					saveNotification.update({ type: 'warning', message: 'Unable to save AP System: "'+ editingProfile+'"<br> '+ message['message'] });
					setTimeout(saveNotification.close, 10000);
				}
				logError('Unable to update AP System profile: '+editingProfile);
			} else {
				logInformation('AP System profile: ' + editingProfile + ' was updated successfully');
				if (saveNotification) {
					saveNotification.update({ type: 'success', message: 'AP System profile was updated' });
					setTimeout(saveNotification.close, 1000);
				}
				(bootstrap.Modal.getInstance(document.getElementById('UIModal')) || new bootstrap.Modal(document.getElementById('UIModal'))).hide();
				refreshProfilesForHierarchy();
			}
		});
	});
}

function changeSPLocation(state) {
	let splocation = document.getElementById("spLocationKnobs");
	if (state) splocation.style.display = "block";
	else splocation.style.display = "none";
}

function changeOption82() {
	if (option82Selector.getValue(true) === 'NONE') {
		option82VLAN.style.display = "none";
	} else {
		option82VLAN.style.display = "block";
	}
}

function validateUIField(field) {
	if (field.type === 'number') {
		if (!field.value) field.value = field.placeholder;
		
		let result = false;
		// Check for valid value
		if ((parseInt(field.value) >= parseInt(field.min)) && (parseInt(field.value) <= parseInt(field.max))) result = true;

		if (result) field.classList.remove("is-invalid");
		else if ((!result) && (field.value === '') && (field.placeholder === '' || field.placeholder === 'AP Model Default')) field.classList.remove("is-invalid"); // Special case - remove warning
		else if (!field.classList.contains("is-invalid")) field.classList.add("is-invalid");
	}
}

function validateUIForm() {
	// querySelectorAll returns a NodeList of all matching elements.
	// We use a CSS selector string (e.g., '.my-class') to find elements with the class.
	const elements = document.querySelectorAll('.' + "is-invalid");
	// If the length is greater than 0, at least one element with the class exists.
	return elements.length > 0;
}

function validateVlanInput(input) {
  const MIN = 1;
  const MAX = 4094;

  if (typeof input !== 'string' || input.trim() === '') return false;

  const trimmed = input.trim();

  // Match a single number
  if (/^\d+$/.test(trimmed)) {
	const num = Number(trimmed);
	return num >= MIN && num <= MAX;
  }

  // Match a range (e.g. 10-100)
  if (/^\d+-\d+$/.test(trimmed)) {
	const [start, end] = trimmed.split('-').map(Number);
	return start >= MIN && end <= MAX && start < end;
  }

  return false;
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Assigning profile
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
// Open assign panel
function openAssign() {
	profileSelector.removeActiveItems();
	assignHierarchySelector.removeActiveItems();
	//deviceFunctionSelector.removeActiveItems();
	new bootstrap.Modal(document.getElementById('assignModal')).show();
}

function closeAssign() {
	(bootstrap.Modal.getInstance(document.getElementById('assignModal')) || new bootstrap.Modal(document.getElementById('assignModal'))).hide();
}

// Verify the input (profile list,etc) is valid
function verifyAssign() {
	if (!profileSelector.getValue(true)) {
		showNotification('ca-folder-settings', 'Please choose an AP System Profile to assign', 'bottom', 'center', 'warning');
		return;
	}
	
	if (getAssignHierarchySelector().getValue(true).length == 0) {
		showNotification('ca-folder-settings', 'Please choose one or more scopes to assign profiles', 'bottom', 'center', 'warning');
		return;
	}
	
	if (deviceFunctionSelector.getValue(true).length == 0) {
		showNotification('ca-folder-settings', 'Please choose one or more device functions to assign profiles', 'bottom', 'center', 'warning');
		return;
	}
	
	assignProfile();
}

// Verify the input (profile selection, etc) is valid
function verifyUnassign() {
	if (!profileSelector.getValue(true)) {
		showNotification('ca-folder-settings', 'Please choose an AP System to assign', 'bottom', 'center', 'warning');
		return;
	}
	
	if (getAssignHierarchySelector().getValue(true).length == 0) {
		showNotification('ca-folder-settings', 'Please choose one or more scopes to unassign profiles', 'bottom', 'center', 'warning');
		return;
	}
	
	if (deviceFunctionSelector.getValue(true).length == 0) {
		showNotification('ca-folder-settings', 'Please choose one or more device functions to unassign profiles', 'bottom', 'center', 'warning');
		return;
	}
	
	unassignProfile();
}

// build list of profiles and call generic function
function getProfileList(isAssigning) {
	// build list of profiles that need to be assigned...
	let profileSelected = profileSelector.getValue(true);

	let profileList = [];
	profiles.forEach(function(profile) {
		if (profile.name === profileSelected.toString()) {
			profileList.push(profile);
		}
	});
	
	// call generic assign workflow
	if (isAssigning) assignConfirmed(profileList, profileType, profileName, profileUniqueLeaf,singleInstance);
	else unassignConfirmed(profileList, profileType, profileName, profileUniqueLeaf);
}
