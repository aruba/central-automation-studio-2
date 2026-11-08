/*
Central Automation v2.x
Last Updated 2.3.0
Aaron Scott (WiFi Downunder) 2025-2026
*/

var profiles = [];
var editingState = false;

const modeValues = { BASIC:"BASIC", ADVANCED:"ADVANCED" };
const importValues = { RENAME:0, REPLACE:0 };

var profilePromise;
var interfacePromise;
var adminPromise;
var profileResolve;
var interfaceResolve;
var adminResolve;
var profileNotification;
var configSetNotification;
var saveNotification;
var unassignNotification;
var assignNotification;

// userAdminProfiles, sysAdminProfiles, apSysProfiles, rfProfiles, wlanProfiles, namedVLANProfiles,
// authServerGroupProfiles, authServerProfiles, captivePortalProfiles, ntpProfiles, uplinkProfiles,
// interfaceProfiles, ipmProfiles, proxyProfiles, syslogProfiles, snmpProfiles, arcProfiles, certProfiles,
// widsProfiles, rtlsProfiles, greProfiles, mpskProfiles, apPortProfiles are declared in config-retriever.js

var modeSelector;
var functionSelector;
var userAdminSelector;
var sysAdminSelector;
var apSysSelector;
var rfSelector;
var wlanSelector;
var ntpSelector;
var interfaceSelector;
var uplinkSelector;
var downlinkSelector0;
var downlinkSelector1;
var downlinkSelector2;
var downlinkSelector3;
var downlinkSelector4;
var ipmSelector;
var proxySelector;
var syslogSelector;
var snmpSelector;
var arcSelector;
var certSelector;
var widsSelector;
var rtlsSelector;
var greSelector;
var downlinkSelectorArray = [];

var unassignProfiles = [];
var unassignCounter = 0
var unassignErrors = 0;
var skipAssignmentProfiles = [];
var assignmentTotal = 0;
var assignmentCounter = 0;
var assignmentErrors = 0;

var requireAdmin = true;

// profileList and profileCounter are declared/managed in config-retriever.js

const requiredFields = document.querySelectorAll('.required-field');
const nextButton = document.getElementById('next-button');
const fileInput = document.getElementById('json-upload');

var importMode = importValues['REPLACE'];

var selectedScopes = [];
var selectedConfigSet;

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Selector Config
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function populateUIChoices() {
	populateUserAdminChoice();
	populateSystemAdminChoice();
	populateAPSystemChoice();
	populateRFChoice();
	populateWLANChoice();
	populateNTPChoice();
	populateInterfaceChoice();
	populateUplinkChoice();
	populateDownlinkChoice();
	populateGREChoice();
	populateProxyChoice();
	populateSNMPChoice();
	populateSyslogChoice();
	populateARCChoice();
	populateIPMChoice();
	populateCertChoice();
	populateWIDSChoice();
	populateRTLSChoice();
}

function populateChoices() {
	let hElement = document.getElementById('hierarchyselector');
	if (hElement) {
			hierarchySelector = new Choices(hElement, {
			searchEnabled: true,
			shouldSort: false,
			itemSelectText: "Press to select",
			removeItemButton:true
		});
		let hierarchyChoices = [];
		hierarchyChoices.push({ value: 'library::Library', label: 'Library' });
		hierarchySelector.clearChoices();
		hierarchySelector.setChoices(hierarchyChoices);		
		hierarchySelector.setChoiceByValue(['library::Library']);
	}
	
	let ahElement = document.getElementById('assignhierarchyselector');
	if (ahElement) {
			assignhierarchySelector = new Choices(ahElement, {
			searchEnabled: true,
			shouldSort: false,
			itemSelectText: "Press to select",
			removeItemButton:true
		});
		let hierarchyChoices = [];
		hierarchyChoices.push({ value: 'library::Library', label: 'Library' });
		assignHierarchySelector.clearChoices();
		assignHierarchySelector.setChoices(hierarchyChoices);		
	}
	
	let cfgMode = document.getElementById('cfg-mode');
	if (cfgMode) {
		if (!modeSelector) {
				modeSelector = new Choices(cfgMode, {
				searchEnabled: false,
				shouldSort: false,
				itemSelectText: "Press to select"
			});
		}
		let selectChoices = [];
		selectChoices.push({ value: 'BASIC', label: 'Basic' });
		selectChoices.push({ value: 'ADVANCED', label: 'Advanced' });
		modeSelector.clearChoices();
		modeSelector.setChoices(selectChoices);		
		modeSelector.setChoiceByValue(['BASIC']);
		
		cfgMode.addEventListener('change', function() {
			changingMode();
		});
		changingMode();
	}
	
	let cfgFunction = document.getElementById('cfg-devicefunction');
	if (cfgFunction) {
		if (!functionSelector) {
				functionSelector = new Choices(cfgFunction, {
				searchEnabled: false,
				shouldSort: false,
				itemSelectText: "Press to select"
			});
		}
		let selectChoices = [];
		selectChoices.push({ value: 'CAMPUS_AP', label: 'Campus AP' });
		functionSelector.clearChoices();
		functionSelector.setChoices(selectChoices);		
		functionSelector.setChoiceByValue(['CAMPUS_AP']);
	}
	
	populateUIChoices();
}

function populateUserAdminChoice() {
	let dElement = document.getElementById('cfg-user-admin');
	if (dElement) {
		if (!userAdminSelector) {
				userAdminSelector = new Choices(dElement, {
				searchEnabled: false,
				shouldSort: true,
				itemSelectText: "Press to select",
				removeItemButton:true
			});
		}
		let selectChoices = [];
		userAdminProfiles.forEach(function(p) {
			selectChoices.push({ value: p.name, label: p.name });
		});
		userAdminSelector.clearChoices();
		userAdminSelector.setChoices(selectChoices);	
	}
}

function populateSystemAdminChoice() {
	let dElement = document.getElementById('cfg-sys-admin');
	if (dElement) {
		if (!sysAdminSelector) {
				sysAdminSelector = new Choices(dElement, {
				searchEnabled: false,
				shouldSort: true,
				itemSelectText: "Press to select",
				removeItemButton:true
			});
		}
		let selectChoices = [];
		//selectChoices.push({ value: 'device_profile', label: 'device_profile'});
		sysAdminProfiles.forEach(function(p) {
			selectChoices.push({ value: p.name, label: p.name });
		});
		sysAdminSelector.clearChoices();
		sysAdminSelector.setChoices(selectChoices);	
	}
}

function populateAPSystemChoice() {
	let dElement = document.getElementById('cfg-sys');
	if (dElement) {
		if (!apSysSelector) {
				apSysSelector = new Choices(dElement, {
				searchEnabled: false,
				shouldSort: true,
				itemSelectText: "Press to select",
				removeItemButton:true
			});
		}
		let selectChoices = [];
		//selectChoices.push({ value: 'default-system-config', label: 'default-system-config'});
		apSysProfiles.forEach(function(p) {
			selectChoices.push({ value: p.name, label: p.name });
		});
		apSysSelector.clearChoices();
		apSysSelector.setChoices(selectChoices);
		if (apSysSelector.getValue(true)) apSysSelector.setChoiceByValue(apSysSelector.getValue(true));
		else apSysSelector.setChoiceByValue(['default-system-config']);
	}
}

function populateRFChoice() {
	let dElement = document.getElementById('cfg-rf');
	if (dElement) {
		if (!rfSelector) {
				rfSelector = new Choices(dElement, {
				searchEnabled: false,
				shouldSort: true,
				itemSelectText: "Press to select",
				removeItemButton:true
			});
		}
		let selectChoices = [];
		//selectChoices.push({ value: 'default-radio-profile', label: 'default-radio-profile'});
		rfProfiles.forEach(function(p) {
			selectChoices.push({ value: p.name, label: p.name });
		});
		rfSelector.clearChoices();
		rfSelector.setChoices(selectChoices);
		if (rfSelector.getValue(true)) rfSelector.setChoiceByValue(rfSelector.getValue(true));
		else rfSelector.setChoiceByValue(['default-radio-profile']);
	}
}

function populateWLANChoice() {
	let dElement = document.getElementById('cfg-wlans');
	if (dElement) {
		if (!wlanSelector) {
			wlanSelector = new Choices(dElement, {
				searchEnabled: false,
				shouldSort: true,
				itemSelectText: "Press to select",
				removeItemButton:true
			});
		}
		let selectChoices = [];
		wlanProfiles.forEach(function(p) {
			selectChoices.push({ value: p.ssid, label: p.ssid });
		});
		wlanSelector.clearChoices();
		wlanSelector.setChoices(selectChoices);	
	}
}

function populateNTPChoice() {
	let dElement = document.getElementById('cfg-ntp');
	if (dElement) {
		if (!ntpSelector) {
			ntpSelector = new Choices(dElement, {
				searchEnabled: false,
				shouldSort: true,
				itemSelectText: "Press to select",
				removeItemButton:true
			});
		}
		let selectChoices = [];
		ntpProfiles.forEach(function(p) {
			selectChoices.push({ value: p.name, label: p.name });
		});
		ntpSelector.clearChoices();
		ntpSelector.setChoices(selectChoices);	
	}
}

function populateInterfaceChoice() {
	let dElement = document.getElementById('cfg-interface');
	if (dElement) {
		if (!interfaceSelector) {
			interfaceSelector = new Choices(dElement, {
				searchEnabled: false,
				shouldSort: true,
				itemSelectText: "Press to select",
				removeItemButton:true
			});
		}
		let selectChoices = [];
		//selectChoices.push({ value: 'default-ap-uplink-profile', label: 'default-ap-uplink-profile'});
		interfaceProfiles.forEach(function(p) {
			if (p['device-type'] === getConfigType()) selectChoices.push({ value: p.name, label: p.name });
		});
		interfaceSelector.clearChoices();
		interfaceSelector.setChoices(selectChoices);	

		if (interfaceSelector.getValue(true)) interfaceSelector.setChoiceByValue(interfaceSelector.getValue(true));
		//else interfaceSelector.setChoiceByValue(['default-ap-uplink-profile']);
	}
}

function populateUplinkChoice() {
	let dElement = document.getElementById('cfg-ap-uplink');
	if (dElement) {
		if (!uplinkSelector) {
			uplinkSelector = new Choices(dElement, {
				searchEnabled: false,
				shouldSort: true,
				itemSelectText: "Press to select",
				removeItemButton:true
			});
		}
		let selectChoices = [];
		//selectChoices.push({ value: 'default-ap-uplink-profile', label: 'default-ap-uplink-profile'});
		uplinkProfiles.forEach(function(p) {
			selectChoices.push({ value: p.name, label: p.name });
		});
		uplinkSelector.clearChoices();
		uplinkSelector.setChoices(selectChoices);	
		
		dElement.addEventListener('change', function() {
			changingUplink();
		});

		if (uplinkSelector.getValue(true)) uplinkSelector.setChoiceByValue(uplinkSelector.getValue(true));
		else uplinkSelector.setChoiceByValue(['default-ap-uplink-profile']);
	}
}

function populateDownlinkChoice() {
	let selectChoices = [];
	apPortProfiles.forEach(function(p) {
		if (!p['port-bond']) selectChoices.push({ value: p['profile-name'], label: p['profile-name'] });
	});
	
	let dElement = document.getElementById('cfg-eth0');
	if (dElement) {
		if (!downlinkSelector0) {
			downlinkSelector0 = new Choices(dElement, {
				searchEnabled: false,
				shouldSort: true,
				itemSelectText: "Press to select",
				removeItemButton:true
			});
		}
		downlinkSelector0.clearChoices();
		downlinkSelector0.setChoices(selectChoices);	
	}
	
	dElement = document.getElementById('cfg-eth1');
	if (dElement) {
		if (!downlinkSelector1) {
			downlinkSelector1 = new Choices(dElement, {
				searchEnabled: false,
				shouldSort: true,
				itemSelectText: "Press to select",
				removeItemButton:true
			});
		}
		downlinkSelector1.clearChoices();
		downlinkSelector1.setChoices(selectChoices);	
	}
	
	dElement = document.getElementById('cfg-eth2');
	if (dElement) {
		if (!downlinkSelector2) {
			downlinkSelector2 = new Choices(dElement, {
				searchEnabled: false,
				shouldSort: true,
				itemSelectText: "Press to select",
				removeItemButton:true
			});
		}
		downlinkSelector2.clearChoices();
		downlinkSelector2.setChoices(selectChoices);	
	}
	
	dElement = document.getElementById('cfg-eth3');
	if (dElement) {
		if (!downlinkSelector3) {
			downlinkSelector3 = new Choices(dElement, {
				searchEnabled: false,
				shouldSort: true,
				itemSelectText: "Press to select",
				removeItemButton:true
			});
		}
		downlinkSelector3.clearChoices();
		downlinkSelector3.setChoices(selectChoices);	
	}
	
	dElement = document.getElementById('cfg-eth4');
	if (dElement) {
		if (!downlinkSelector4) {
			downlinkSelector4 = new Choices(dElement, {
				searchEnabled: false,
				shouldSort: true,
				itemSelectText: "Press to select",
				removeItemButton:true
			});
		}
		downlinkSelector4.clearChoices();
		downlinkSelector4.setChoices(selectChoices);	
	}
	
	downlinkSelectorArray = [downlinkSelector0, downlinkSelector1, downlinkSelector2, downlinkSelector3, downlinkSelector4];
}

function populateIPMChoice() {
	let dElement = document.getElementById('cfg-ipm');
	if (dElement) {
		if (!ipmSelector) {
			ipmSelector = new Choices(dElement, {
				searchEnabled: false,
				shouldSort: true,
				itemSelectText: "Press to select",
				removeItemButton:true
			});
		}
		let selectChoices = [];
		//selectChoices.push({ value: 'default-ipm-config', label: 'default-ipm-config'});
		ipmProfiles.forEach(function(p) {
			selectChoices.push({ value: p.name, label: p.name });
		});
		ipmSelector.clearChoices();
		ipmSelector.setChoices(selectChoices);	
		if (ipmSelector.getValue(true)) ipmSelector.setChoiceByValue(ipmSelector.getValue(true));
		else ipmSelector.setChoiceByValue(['default-ipm-config']);
	}
}

function populateProxyChoice() {
	let dElement = document.getElementById('cfg-proxy');
	if (dElement) {
		if (!proxySelector) {
			proxySelector = new Choices(dElement, {
				searchEnabled: false,
				shouldSort: true,
				itemSelectText: "Press to select",
				removeItemButton:true
			});
		}
		let selectChoices = [];
		proxyProfiles.forEach(function(p) {
			selectChoices.push({ value: p.name, label: p.name });
		});
		proxySelector.clearChoices();
		proxySelector.setChoices(selectChoices);	
	}
}

function populateSyslogChoice() {
	let dElement = document.getElementById('cfg-syslog');
	if (dElement) {
		if (!syslogSelector) {
			syslogSelector = new Choices(dElement, {
				searchEnabled: false,
				shouldSort: true,
				itemSelectText: "Press to select",
				removeItemButton:true
			});
		}
		let selectChoices = [];
		syslogProfiles.forEach(function(p) {
			selectChoices.push({ value: p.name, label: p.name });
		});
		syslogSelector.clearChoices();
		syslogSelector.setChoices(selectChoices);	
	}
}

function populateSNMPChoice() {
	let dElement = document.getElementById('cfg-snmp');
	if (dElement) {
		if (!snmpSelector) {
			snmpSelector = new Choices(dElement, {
				searchEnabled: false,
				shouldSort: true,
				itemSelectText: "Press to select",
				removeItemButton:true
			});
		}
		let selectChoices = [];
		snmpProfiles.forEach(function(p) {
			selectChoices.push({ value: p.name, label: p.name });
		});
		snmpSelector.clearChoices();
		snmpSelector.setChoices(selectChoices);	
	}
}

function populateARCChoice() {
	let dElement = document.getElementById('cfg-arc');
	if (dElement) {
		if (!arcSelector) {
			arcSelector = new Choices(dElement, {
				searchEnabled: false,
				shouldSort: true,
				itemSelectText: "Press to select",
				removeItemButton:true
			});
		}
		let selectChoices = [];
		arcProfiles.forEach(function(p) {
			selectChoices.push({ value: p.name, label: p.name });
		});
		arcSelector.clearChoices();
		arcSelector.setChoices(selectChoices);	
	}
}

function populateCertChoice() {
	let dElement = document.getElementById('cfg-cert');
	if (dElement) {
		if (!certSelector) {
			certSelector = new Choices(dElement, {
				searchEnabled: false,
				shouldSort: true,
				itemSelectText: "Press to select",
				removeItemButton:true
			});
		}
		let selectChoices = [];
		//selectChoices.push({ value: 'default-ap-cert-usage-profile', label: 'default-ap-cert-usage-profile'});
		certProfiles.forEach(function(p) {
			selectChoices.push({ value: p.name, label: p.name });
		});
		certSelector.clearChoices();
		certSelector.setChoices(selectChoices);	
		if (certSelector.getValue(true)) certSelector.setChoiceByValue(certSelector.getValue(true));
		else certSelector.setChoiceByValue(['default-ap-cert-usage-profile']);
	}
}

function populateWIDSChoice() {
	let dElement = document.getElementById('cfg-wids');
	if (dElement) {
		if (!widsSelector) {
			widsSelector = new Choices(dElement, {
				searchEnabled: false,
				shouldSort: true,
				itemSelectText: "Press to select",
				removeItemButton:true
			});
		}
		let selectChoices = [];
		widsProfiles.forEach(function(p) {
			selectChoices.push({ value: p.name, label: p.name });
		});
		widsSelector.clearChoices();
		widsSelector.setChoices(selectChoices);	
	}
}

function populateRTLSChoice() {
	let dElement = document.getElementById('cfg-rtls');
	if (dElement) {
		if (!rtlsSelector) {
			rtlsSelector = new Choices(dElement, {
				searchEnabled: false,
				shouldSort: true,
				itemSelectText: "Press to select",
				removeItemButton:true
			});
		}
		let selectChoices = [];
		rtlsProfiles.forEach(function(p) {
			selectChoices.push({ value: p.name, label: p.name });
		});
		rtlsSelector.clearChoices();
		rtlsSelector.setChoices(selectChoices);	
	}
}

function populateGREChoice() {
	let dElement = document.getElementById('cfg-gre');
	if (dElement) {
		if (!greSelector) {
			greSelector = new Choices(dElement, {
				searchEnabled: false,
				shouldSort: true,
				itemSelectText: "Press to select",
				removeItemButton:true
			});
		}
		let selectChoices = [];
		greProfiles.forEach(function(p) {
			selectChoices.push({ value: p.id, label: p.id });
		});
		greSelector.clearChoices();
		greSelector.setChoices(selectChoices);	
	}
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	UI Changes
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function prepareUIChangeFunctions() {
	const prefixField = document.getElementById('cfg-prefix');
	prefixField.addEventListener('input', verifyPrefix);
}

function verifyPrefix() {
	let currentPrefix = document.getElementById("cfg-prefix").value;
	let currentName = document.getElementById("cfg-name").value;
	profiles.forEach(function(profile) {
		if (profile['name'] !== currentName && profile['prefix'] === currentPrefix) showNotification('ca-folder-settings', 'It is advised to use a unique Prefix for each Config Set to prevent overwriting over dynamically built profiles that could impact other scopes', 'bottom', 'center', 'warning');
	});
}

function changingUplink() {
	let foundProfile = findSelectedUplinkProfile();
	if (foundProfile) {
		if (!foundProfile['ethernet-1']) {
			document.getElementById("eth0").style.display = "block";
			document.getElementById("eth1").style.display = "block";
		} else if (foundProfile['ethernet-1']['port'] === 'ETH0_ETH1') {
			document.getElementById("eth0").style.display = "none";
			document.getElementById("eth1").style.display = "none";
		} else if (foundProfile['ethernet-1']['port'] === 'ETH_0') {
			document.getElementById("eth0").style.display = "none";
			document.getElementById("eth1").style.display = "block";
		} else if (foundProfile['ethernet-1']['port'] === 'ETH_1') {
			document.getElementById("eth0").style.display = "block";
			document.getElementById("eth1").style.display = "none";
		}
	} else {
		uplinkSelector.removeActiveItems();
		document.getElementById("eth0").style.display = "none";
		document.getElementById("eth1").style.display = "none";
	}
}

function changingMode() {
	let cfgMode = modeSelector.getValue(true);
	const basicFields = document.querySelectorAll('.basicProfiles');
	const advancedFields = document.querySelectorAll('.advancedProfiles');
	if (cfgMode === modeValues['BASIC']) {
		basicFields.forEach(field => { field.hidden = false; });
		advancedFields.forEach(field => { field.hidden = true; });
		checkFields();
	} else {
		basicFields.forEach(field => { field.hidden = true; });
		advancedFields.forEach(field => { field.hidden = false; });
		checkFields();
	}
	resetConfigSetModalScrollSoon(0);
}

function changingStep(direction) {
	let cfgMode = modeSelector.getValue(true);
	if (cfgMode === modeValues['BASIC']) {
		if (direction === "next") {setTimeout(delayedNext,100);}
		else {setTimeout(delayedPrev,100);}
	}
}

function resetConfigSetModalScroll() {
	const modalContent = document.querySelector('#CFGModal .modal-content');
	if (modalContent) modalContent.scrollTop = 0;
}

function resetConfigSetModalScrollSoon(delay = 140) {
	setTimeout(resetConfigSetModalScroll, delay);
}

function initializeConfigSetModalScrollHandlers() {
	const cfgModal = document.getElementById('CFGModal');
	if (!cfgModal || cfgModal.dataset.scrollHandlersInitialized === 'true') return;

	cfgModal.dataset.scrollHandlersInitialized = 'true';

	cfgModal.addEventListener('shown.bs.modal', function() {
		if (typeof setFormHeight === 'function') {
			setFormHeight();
			setTimeout(function() { setFormHeight(); }, 120);
		}
		resetConfigSetModalScrollSoon(0);
	});

	const stepForm = cfgModal.querySelector('.multisteps-form__form');
	if (stepForm) {
		stepForm.addEventListener('click', function(event) {
			const clickedButton = event.target.closest('.js-btn-prev, .js-btn-next');
			if (clickedButton) resetConfigSetModalScrollSoon();
		});
	}

	const stepsBar = cfgModal.querySelector('.multisteps-form__progress');
	if (stepsBar) {
		stepsBar.addEventListener('click', function(event) {
			const clickedStep = event.target.closest('.multisteps-form__progress-btn');
			if (clickedStep) resetConfigSetModalScrollSoon();
		});
	}
}

function delayedNext() {
	const buttonElement = document.getElementById("advancedConfigNext");
	buttonElement.click();
}

function delayedPrev() {
	const buttonElement = document.getElementById("advancedConfigPrev");
	buttonElement.click();
}

// Function to check if all required fields are filled
function checkFields() {
	let allFilled = true;
	requiredFields.forEach(field => {
		if (field.value.trim() === '') {
			allFilled = false;
		}
	});
	// Enable or disable the button based on the check
	nextButton.disabled = !allFilled;
}

function findSelectedUplinkProfile() {
	let uplinkProfileName = uplinkSelector.getValue(true);
	let foundProfile = uplinkProfiles.find(function(p) { return p.name === uplinkProfileName; }) || null;
	return foundProfile;
}

function getConfigType() {
	return functionSelector.getValue(true);
}


/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Get Information
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */


// Kept as the page's entry point (called from HTML reload button); delegates to config-retriever.js.
function updateInformation() {
	return updateProfiles('CAMPUS_AP');
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Config Set UI Functions
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function loadSavedData(indexKey, data) {
	if (indexKey === 'config_sets') {
		profiles = JSON.parse(data);
		if (!profiles) profiles = [];
		loadProfilesTable();
	}
}

function loadProfilesTable() {
	let table = $('#profiles-table').DataTable();
	disposeTooltips(document.getElementById('profiles-table'));
	$('#profiles-table').DataTable().clear();
	
	profiles.forEach(function(profile) {
		let profileName = profile['name'].replace(/^ /, "&nbsp");
		let description = '';
		if (profile['description']) description = profile['description'];
		let mode = 'Unknown';
		if (profile['mode']) mode = profile['mode'];
		let profileData = profile['profiles'];
		
		// Action Buttons
		let status = '<i class="fa-solid fa-diamond text-danger"></i>';
		let actionBtns = '';
		actionBtns += '<a class="btn btn-link btn-warning mt-2" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Edit Config Set" onclick="loadConfigSet(\'' + profileName + '\')"><i class="fa-solid fa-pencil" style="color: #67748e; font-size:18px;"></i></a> ';
		actionBtns += '<a class="btn btn-link btn-warning mt-2" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Delete Config Set" onclick="deleteConfigSet(\''+ profileName + '\')"><i class="fa-solid fa-trash-can" style="color: #67748e; font-size:18px;"></i></a> ';
		
		let wlanCount = profile['profiles']['wlan-ssids'].length;
		let profileCount = 0;
		
		Object.keys(profileData).forEach(function(key) {
			if ((key !== 'wlan-ssids') && (key !== 'ap-port-profiles') && (profileData[key] != null)) profileCount++;
		});

		let downlinkCount = 0;
		let downlinkProfiles = profile['profiles']['ap-port-profiles'];

		for (let i=0;i<downlinkProfiles.length;i++) {
			if (downlinkProfiles[i]) downlinkCount++;
		}
		// Add row to table
		table.row.add([profileName, description, deviceFunctionDisplay[profile['device-function']], titleCase(mode), profileCount + ' Profiles<br\>'+downlinkCount+' Downlink Port Profiles<br\>'+wlanCount+' WLANs', actionBtns]);
	})
	$('#profiles-table').DataTable().rows().draw();
	initializeTooltips(document.getElementById('profiles-table'));
}

function importConfigSets() {
	
	Swal.fire({
		title: 'Importing Config Sets',
		html: 'Importing will override Config Sets with the same name',
		footer: 'There is no undo for this operation',
		icon: 'warning',
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
			importMode = importValues['REPLACE'];
			fileInput.click();
		}
	});
}

function configureFileListener() {
	fileInput.addEventListener('change', (event) => {
		const file = event.target.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				// Do something with the file content
				let inputProfiles = JSON.parse(e.target.result);
				profiles = inputProfiles;
				saveDataToDB('config_sets', JSON.stringify(profiles));
				loadProfilesTable();
			};
			
			reader.onerror = (e) => {
				logError('Error importing Config Sets:', e.target.error);
			};
			// read the file
			reader.readAsText(file);
		}
	});
}

function exportConfigSets() {
	const date = new Date(); // e.g., Sun Mar 24 2026 18:23:00 GMT+1000 (AEDT)
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const formattedDateLocal = `${year}${month}${day}`;
	
	// 1. Convert the object to a JSON string
	const jsonString = JSON.stringify(profiles, null, 2);
	
	// 2. Create a Blob (Binary Large Object)
	const blob = new Blob([jsonString], { type: 'application/json' });
	
	// 3. Create a URL for the blob
	const url = URL.createObjectURL(blob);
	
	// 4. Create an anchor element to trigger the download
	const a = document.createElement('a');
	a.href = url;
	a.download = 'ConfigSets-'+formattedDateLocal+'.json'; // Specify the file name
	document.body.appendChild(a); // Append the element to the body (necessary for some browsers)
	
	// 5. Trigger a click event to start the download
	a.click();
	
	// 6. Clean up by removing the element and revoking the object URL
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

function clearConfigSetUI() {
	// Clear existing values
	document.getElementById("cfg-name").value = '';
	document.getElementById("cfg-name").disabled = false;
	document.getElementById("cfg-description").value = '';
	document.getElementById("cfg-prefix").value = '';
	modeSelector.setChoiceByValue('BASIC');
	document.getElementById("cfg-username").value = '';
	document.getElementById("cfg-password").value = '';
	document.getElementById("cfg-passwordConfirm").value = '';
	userAdminSelector.removeActiveItems();
	sysAdminSelector.removeActiveItems();
	apSysSelector.removeActiveItems();
	sysAdminSelector.removeActiveItems();
	ntpSelector.removeActiveItems();
	ipmSelector.removeActiveItems();
	greSelector.removeActiveItems();
	rfSelector.removeActiveItems();
	wlanSelector.removeActiveItems();
	proxySelector.removeActiveItems();
	syslogSelector.removeActiveItems();
	snmpSelector.removeActiveItems();
	arcSelector.removeActiveItems();
	certSelector.removeActiveItems();
	widsSelector.removeActiveItems();
	rtlsSelector.removeActiveItems();
	uplinkSelector.removeActiveItems();
	downlinkSelector0.removeActiveItems();
	downlinkSelector1.removeActiveItems();
	downlinkSelector2.removeActiveItems();
	downlinkSelector3.removeActiveItems();
	downlinkSelector4.removeActiveItems();
	assignHierarchySelector.removeActiveItems();
	document.getElementById("cfg-unassignUnset").checked = false;
	changingMode();
	nextButton.disabled = true;
	document.getElementById("firstStep").click();
}

function loadConfigSet(profileName) {
	clearConfigSetUI();
	initializeConfigSetModalScrollHandlers();
	
	editingState = true;
	let foundProfile = null;
	for(let i=0;i<profiles.length;i++) {
		if (profiles[i]['name'] ===  profileName) {
			let profile = profiles[i];
			let profileData = profile['profiles'];
			document.getElementById("cfg-name").value = profile['name'];
			document.getElementById("cfg-name").disabled = true;
			document.getElementById("cfg-description").value = profile['description'];
			document.getElementById("cfg-prefix").value = profile['prefix'];
			modeSelector.setChoiceByValue(profile['mode']);
			
			if (profileData['admin-username']) document.getElementById("cfg-username").value = profileData['admin-username'];
			if (profileData['admin-password']) {
				document.getElementById("cfg-password").value = profileData['admin-password'];
				document.getElementById("cfg-passwordConfirm").value = profileData['admin-password'];
			}
			
			if (profileData['management-users']) userAdminSelector.setChoiceByValue(profileData['management-users']);
			if (profileData['local-management']) sysAdminSelector.setChoiceByValue(profileData['local-management']);
			if (profileData['ap-system']) apSysSelector.setChoiceByValue(profileData['ap-system']);
			if (profileData['ntp']) ntpSelector.setChoiceByValue(profileData['ntp']);
			if (profileData['ipm']) ipmSelector.setChoiceByValue(profileData['ipm']);
			if (profileData['tunnel']) greSelector.setChoiceByValue(profileData['tunnel']);
			if (profileData['radios']) rfSelector.setChoiceByValue(profileData['radios']);
			if (profileData['wlan-ssids']) wlanSelector.setChoiceByValue(profileData['wlan-ssids']);
			if (profileData['http-proxy-servers']) proxySelector.setChoiceByValue(profileData['http-proxy-servers']);
			if (profileData['logging']) syslogSelector.setChoiceByValue(profileData['logging']);
			if (profileData['snmp']) snmpSelector.setChoiceByValue(profileData['snmp']);
			if (profileData['arc']) arcSelector.setChoiceByValue(profileData['arc']);
			if (profileData['certificate-usage']) certSelector.setChoiceByValue(profileData['certificate-usage']);
			if (profileData['ids']) widsSelector.setChoiceByValue(profileData['ids']);
			if (profileData['location']) rtlsSelector.setChoiceByValue(profileData['location']);
			if (profileData['ap-uplinks']) {
				uplinkSelector.setChoiceByValue(profileData['ap-uplinks']);
				changingUplink();
			}
			if (profileData['ap-port-profiles']) {
				let downlinks = profileData['ap-port-profiles'];
				for(let d=0;d<downlinks.length;d++) {
					if (downlinks[d]) {
						let currentSelector = downlinkSelectorArray[d];
						currentSelector.setChoiceByValue(downlinks[d]);
					}
				}
			}
			nextButton.disabled = false;
			break;
		}
	}
	changingMode();
	new bootstrap.Modal(document.getElementById('CFGModal')).show();
}

function createConfigSet() {
	editingState = false;
	initializeConfigSetModalScrollHandlers();
	// Clear existing values
	clearConfigSetUI();
	if (uplinkSelector) changingUplink();
	nextButton.disabled = false;
	checkFields();

	new bootstrap.Modal(document.getElementById('CFGModal')).show();
}

function deleteConfigSet(profileName) {
	Swal.fire({
		title: 'Delete Config Set',
		html: 'Are you sure you want to delete this config set?',
		footer: 'There is no undo for this operation',
		icon: 'question',
		showCancelButton: true,
		confirmButtonColor: '#3085d6',
		cancelButtonColor: '#888888',
		confirmButtonText: 'Yes',
		cancelButtonText: 'No',
	}).then(result => {
		if (result.isDismissed) {
			return false;
		} else {
			let foundIndex = -1;
			for(let i=0;i<profiles.length;i++) {
				if (profiles[i]['name'] ===  profileName) {
					foundIndex = i;
				}
			}
			if (foundIndex != -1) {
				profiles.splice(foundIndex, 1);
				saveDataToDB('config_sets', JSON.stringify(profiles));
				loadProfilesTable();
			} else {
				showNotification('ca-folder-settings', 'Unable to delete Config Set', 'bottom', 'center', 'warning');
			}
		}
	});
	
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Building & Applying Config Sets
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function saveConfig() {
	buildConfig(false);
}

function assignConfig() {
	if (getAssignHierarchySelector().getValue(true).length == 0) {
		showNotification('ca-folder-settings', 'Please choose one or more scopes to assign profiles', 'bottom', 'center', 'warning');
		return;
	}
	
	Swal.fire({
		title: 'Save & Assign Config Set',
		html: 'Assigning this config set will replace existing profiles assigned at the selected scopes. <br \>Are you sure you want to proceed?',
		footer: document.getElementById("cfg-unassignUnset").checked?'<i>Profiles without a selection will be unassigned from the scopes</i>':'<i>Profiles without a selection are ignored</i>',
		icon: 'question',
		showCancelButton: true,
		confirmButtonColor: '#3085d6',
		cancelButtonColor: '#888888',
		confirmButtonText: 'Yes',
		cancelButtonText: 'No',
	}).then(result => {
		if (result.isDismissed) {
			return false;
		} else {
			buildConfig(true);
		}
	});
}

function buildConfig(assign) {
	
	let cfgMode = modeSelector.getValue(true);
	if (document.getElementById("cfg-username").value === '' && document.getElementById("cfg-password").value === '' && cfgMode === modeValues['BASIC']) {
		// No user admin credential will be created.
		requireAdmin = false;
	} else {
		requireAdmin = true;
		if (document.getElementById("cfg-username").value === '' && cfgMode === modeValues['BASIC']) {
			showNotification('ca-folder-settings', 'Administrator Username cannot be empty', 'bottom', 'center', 'warning')
			return;
		}
		if (document.getElementById("cfg-password").value === '' && cfgMode === modeValues['BASIC']) {
			showNotification('ca-folder-settings', 'Administrator Password cannot be empty', 'bottom', 'center', 'warning')
			return;
		}
	}
	
	if (configSetNotification) configSetNotification.close();	
	configSetNotification = showProgressNotification('ca-folder-settings', 'Preparing config set...', 'bottom', 'center', 'info');
	if (!assign) logStart('Saving Config Set');
	else logStart('Saving and Applying Config Set');
	
	let savedData = {};
	// Config Set Data
	savedData['name'] = document.getElementById("cfg-name").value;
	savedData['description'] = document.getElementById("cfg-description").value;
	savedData['mode'] = modeSelector.getValue(true);
	savedData['device-function'] = functionSelector.getValue(true);
	savedData['prefix'] = document.getElementById("cfg-prefix").value;
	
	let savedProfiles = {};
	// Common profiles
	savedProfiles['ap-system'] = apSysSelector.getValue(true);
	savedProfiles['ntp'] = ntpSelector.getValue(true);
	savedProfiles['ap-uplinks'] = uplinkSelector.getValue(true);
	let downlinks = [];
	downlinks.push(downlinkSelector0.getValue(true));
	downlinks.push(downlinkSelector1.getValue(true));
	downlinks.push(downlinkSelector2.getValue(true));
	downlinks.push(downlinkSelector3.getValue(true));
	downlinks.push(downlinkSelector4.getValue(true));
	savedProfiles['ap-port-profiles'] = downlinks;
	savedProfiles['radios'] = rfSelector.getValue(true);
	savedProfiles['wlan-ssids'] = wlanSelector.getValue(true);
	
	// Basic vs Advanced
	if (cfgMode === modeValues['BASIC']) {
		savedProfiles['admin-username'] = document.getElementById("cfg-username").value;
		savedProfiles['admin-password'] = document.getElementById("cfg-password").value;
	} else if (cfgMode === modeValues['ADVANCED']) {
		savedProfiles['management-users'] = userAdminSelector.getValue(true);
		savedProfiles['local-management'] = sysAdminSelector.getValue(true);
		savedProfiles['ipm'] = ipmSelector.getValue(true);
		savedProfiles['tunnel'] = greSelector.getValue(true);
		savedProfiles['http-proxy-servers'] = proxySelector.getValue(true);
		savedProfiles['snmp'] = snmpSelector.getValue(true);
		savedProfiles['syslog'] = syslogSelector.getValue(true);
		savedProfiles['arc'] = arcSelector.getValue(true);
		savedProfiles['certificate-usage'] = certSelector.getValue(true);
		savedProfiles['ids'] = widsSelector.getValue(true);
		savedProfiles['location'] = rtlsSelector.getValue(true);
	}
	
	savedData['profiles'] = savedProfiles;
	//console.log(savedData);
	
	for (let i=0;i<profiles.length;i++) {
		if (profiles[i]['name'] ===  document.getElementById("cfg-name").value && !editingState) {
			showNotification('ca-folder-settings', 'Please choose a unique Config Set name', 'bottom', 'center', 'warning');
			return;
		} else if (profiles[i]['name'] ===  document.getElementById("cfg-name").value) {
			// found loaded config set
			profiles[i] = savedData;
			break;
		}
	}
	if (!editingState) {
		profiles.push(savedData);
		editingState = true;
	}
	saveDataToDB('config_sets', JSON.stringify(profiles));
	loadProfilesTable();
	
	if (assign) {
		authenticateWithCentral().then(function() {
			logInformationHeading('Applying Config Set "'+savedData['name']+'" to the selected scopes...');
			
			// build simple scope list
			selectedScopes = [];
			getAssignHierarchySelector().getValue(true).forEach(function(s) {
				selectedScopes.push(s.split('::')[1]);
			});
			
			// Convert undefined to null to allow unassigning of unused profiles
			selectedConfigSet = JSON.parse(JSON.stringify(savedData,function(k, v) { return v === undefined ? null : v; }));
			
			// Generate the auto created profile names
			let userProfileName = 'cas-'+document.getElementById("cfg-prefix").value.toLowerCase() + '-user-ap';
			let interfaceProfileName = 'cas-'+document.getElementById("cfg-prefix").value.toLowerCase() + '-int-profile';
			
			logInformationHeading("Verifying autogenerated profiles...")
			configSetNotification.update({ progress: 10, message: 'Verifying autogenerated profiles......'});
			Promise.all([checkAdminUserProfile(userProfileName), checkInterfaceProfile(interfaceProfileName)]).then(function() {
				console.log('Autogenerated profiles verified')
				unassignProfiles = [];
				skipAssignmentProfiles = []
				// Check existing scope mappings for the selected scopes
				checkScopeMapForProfile(functionSelector.getValue(true));;
			});
		});
	} else {
		logEnd('Config Set saved')
		configSetNotification.update({ progress: 100, type: 'success', message: 'Config Set saved' });
		setTimeout(configSetNotification.close, 1000);
		(bootstrap.Modal.getInstance(document.getElementById('CFGModal')) || new bootstrap.Modal(document.getElementById('CFGModal'))).hide();
	}
}

function checkAdminUserProfile(profileName, retry = false) {	
	
	if (!retry) { adminPromise = new Promise(function(resolve) { adminResolve = resolve; }); }
	
	let cfgMode = modeSelector.getValue(true);
	if (cfgMode === modeValues['BASIC']) {	
		if (requireAdmin) {
			logInformation('Verifying Admin User: "' +profileName+'"...');
			// Check if profile already exists and if it's the same config
			let currentProfile = null;
			// build config structure
			let profileConfig = {'name':profileName, 'username':document.getElementById("cfg-username").value, 'format':'CLEARTEXT', 'user-group':'administrators', 'rolename':'ROOT', 'password':document.getElementById("cfg-password").value};
			let requiresNew = true;
			userAdminProfiles.some(function(p) {
				if (p['name'] === profileName) {
					currentProfile = p;
					requiresNew = false;
					return true;
				}
			});
		
			// Add reference to User Admin profile to the selectedConfigSet
			selectedConfigSet['profiles']['management-users'] = profileName;	
		
			let command = profileList['management-users']['endpoint'] +'/'+profileName;
			
			let apiCommand = '/tools/putCommandwHeaders';
			if (requiresNew) apiCommand = '/tools/postCommandwHeaders';
			fetchProxyWithAuth(apiCommand, {
				url: localStorage.getItem('base_url') + command,
				access_token: localStorage.getItem('access_token'),
				data: JSON.stringify(profileConfig),
			}).then(function(commandResults) {
				if (commandResults.hasOwnProperty('headers')) {
					//updateAPILimits(JSON.parse(commandResults.headers));
				}
				// Process The status code of the result
				let result = processStatus(commandResults);
				// will return the status code to trigger next step
				if (result == 429 || result == 409) {
					// Over API threshold limit or backend busy. Wait apiWaitDelay value and try again.
					setTimeout(checkAdminUserProfile, apiWaitDelay, profileName, true);
				} else if (result !== 200) {
					logError('Failed to save Admin User in Central');
				} else {
					logInformation(requiresNew?'Admin user created':'Admin user updated');
					adminResolve();
				}
			});
			if (!retry) return adminPromise;
		} else {
			// Add reference to User Admin profile to the selectedConfigSet
			selectedConfigSet['profiles']['management-users'] = null;
			adminResolve(); return adminPromise;
		}
		
	} else {
		adminResolve(); return adminPromise;
	}
}

function checkInterfaceProfile(profileName, retry = false) {
	if (!retry) { interfacePromise = new Promise(function(resolve) { interfaceResolve = resolve; }); }
	if (uplinkSelector.getValue(true)) {
		
		logInformation('Verifying Interface Profile: "' +profileName+'"...');
		
		// Check if profile already exists and if it's the same config
		let currentProfile = null;
		let profileConfig = {'name':profileName, 'description': 'Autogenerated by CAS for '+document.getElementById("cfg-name").value ,'device-type':'AP', 'ap':{'uplink-port-profile': uplinkSelector.getValue(true), 'ap-downlink-port-map': []}} // build default config structure
		
		interfaceProfiles.some(function(p) {
			if (p['name'] === profileName && p['device-type'] === 'AP') {
				currentProfile = p;
				return true;
			}
		});
		
		// Get the selected uplink profile - to determine the downlink ports
		let foundProfile = findSelectedUplinkProfile();
		let downlinkList = profileConfig['ap']['ap-downlink-port-map'];
		if (!foundProfile['ethernet-1']) { // Mesh
			if (downlinkSelector0.getValue(true)) downlinkList.push({'port-name': 'enet0', 'port-profile':downlinkSelector0.getValue(true)});
		} else if (foundProfile['ethernet-1']['port'] === 'ETH0_ETH1') {
			if (downlinkSelector2.getValue(true)) downlinkList.push({'port-name': 'enet2', 'port-profile':downlinkSelector2.getValue(true)});
			else downlinkList.push({'port-name': 'enet2'});
			if (downlinkSelector3.getValue(true)) downlinkList.push({'port-name': 'enet3', 'port-profile':downlinkSelector3.getValue(true)});
			else downlinkList.push({'port-name': 'enet3'});
			if (downlinkSelector4.getValue(true)) downlinkList.push({'port-name': 'enet4', 'port-profile':downlinkSelector4.getValue(true)});
			else downlinkList.push({'port-name': 'enet4'});
		} else if (foundProfile['ethernet-1']['port'] === 'ETH_0') {
			if (downlinkSelector1.getValue(true)) downlinkList.push({'port-name': 'enet1', 'port-profile':downlinkSelector1.getValue(true)});
			else downlinkList.push({'port-name': 'enet1'});
			if (downlinkSelector2.getValue(true)) downlinkList.push({'port-name': 'enet2', 'port-profile':downlinkSelector2.getValue(true)});
			else downlinkList.push({'port-name': 'enet2'});
			if (downlinkSelector3.getValue(true)) downlinkList.push({'port-name': 'enet3', 'port-profile':downlinkSelector3.getValue(true)});
			else downlinkList.push({'port-name': 'enet3'});
			if (downlinkSelector4.getValue(true)) downlinkList.push({'port-name': 'enet4', 'port-profile':downlinkSelector4.getValue(true)});
			else downlinkList.push({'port-name': 'enet4'});
		} else if (foundProfile['ethernet-1']['port'] === 'ETH_1') {
			if (downlinkSelector0.getValue(true)) downlinkList.push({'port-name': 'enet0', 'port-profile':downlinkSelector0.getValue(true)});
			else downlinkList.push({'port-name': 'enet0'});
			if (downlinkSelector2.getValue(true)) downlinkList.push({'port-name': 'enet2', 'port-profile':downlinkSelector2.getValue(true)});
			else downlinkList.push({'port-name': 'enet2'});
			if (downlinkSelector3.getValue(true)) downlinkList.push({'port-name': 'enet3', 'port-profile':downlinkSelector3.getValue(true)});
			else downlinkList.push({'port-name': 'enet3'});
			if (downlinkSelector4.getValue(true)) downlinkList.push({'port-name': 'enet4', 'port-profile':downlinkSelector4.getValue(true)});
			else downlinkList.push({'port-name': 'enet4'});
		}
		profileConfig['ap']['ap-downlink-port-map'] = downlinkList;
		
		// It already exists - check if it is matching
		let requiresChanges = true;
		let requiresNew = true;
		if (currentProfile) {
			requiresNew = false;
			// convert to strings and compare
			let currentString = JSON.stringify(currentProfile['ap'])
			let newString = JSON.stringify(profileConfig['ap'])
			if (currentString === newString) requiresChanges = false;
		}
		
		
		// Add reference to Interface profile to the selectedConfigSet
		selectedConfigSet['profiles']['interface-profiles'] = profileName;	
		
		let command = profileList['interface-profiles']['endpoint'] + '/' + profileName;
		if (requiresChanges) {
			let apiCommand = '/tools/putCommandwHeaders';
			if (requiresNew) apiCommand = '/tools/postCommandwHeaders';
			fetchProxyWithAuth(apiCommand, {
				url: localStorage.getItem('base_url') + command,
				access_token: localStorage.getItem('access_token'),
				data: JSON.stringify(profileConfig),
			}).then(function(commandResults) {
				if (commandResults.hasOwnProperty('headers')) {
					//updateAPILimits(JSON.parse(commandResults.headers));
				}
				// Process The status code of the result
				let result = processStatus(commandResults);
				// will return the status code to trigger next step
				if (result == 429 || result == 409) {
					// Over API threshold limit or backend busy. Wait apiWaitDelay value and try again.
					setTimeout(checkInterfaceProfile, apiWaitDelay, profileName, true);
				} else if (result !== 200) {
					logError('Failed to save Interface Profile in Central');
				} else {
					logInformation(requiresNew?'Interface profile created':'Interface profile updated');
					interfaceResolve();
				}
			});
			if (!retry) return interfacePromise;
		} else {
			logInformation('Interface profile is already up to date');
			interfaceResolve(); return interfacePromise;
		}
	} else {
		// Add reference to Interface profile to the selectedConfigSet incase it needs to be deleted
		if (document.getElementById("cfg-unassignUnset").checked) selectedConfigSet['profiles']['interface-profiles'] = null;	
		
		interfaceResolve(); return interfacePromise;
	}
}

function checkScopeMapForProfile(deviceFunction) {
	configSetNotification.update({ progress: 40, message: 'Verifying existing scope mappings...' });
	logInformationHeading('Verifying existing scope mappings...');
	let command = '/network-config/v1/config-assignments?device-function='+deviceFunction;
	// Get the existing profiles mapped to the select scopes.
	fetchProxyWithAuth('/tools/getCommandwHeaders', {
		url: localStorage.getItem('base_url') + command,
		access_token: localStorage.getItem('access_token'),
	}).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		//console.log(commandResults)
		// Process The status code of the result
		let result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429 || result == 409) {
			// Over API threshold limit or backend busy. Wait apiWaitDelay value and try again.
			setTimeout(checkScopeMapForProfile, apiWaitDelay, deviceFunction);
		} else if (result !== 200) {
			logError('Failed to retrieve existing Scope Mappings');
		} else {
			let response = JSON.parse(commandResults.responseBody);
			let currentAssignments = response['config-assignment'];
			
			currentAssignments.forEach(function(ca) {
				if (selectedScopes.includes(ca['scope-id'])) { // if is a mapping for the selected scopes
					if (selectedConfigSet['profiles'][ca['profile-type']] != null) { // is a profile that needs to be checked because the config set includes it
						
						if (ca['profile-type'] === 'wlan-ssids') { // special case because it is a list
							if (selectedConfigSet['profiles'][ca['profile-type']].includes(ca['profile-instance'])) {
								console.log(ca['profile-type'] +':'+ ca['profile-instance']+' matches existing scope mapped WLAN profile')
								skipAssignmentProfiles.push(ca)
							} else if (document.getElementById("cfg-unassignUnset").checked) {
								console.log(ca['profile-type'] +':'+ ca['profile-instance']+' needs to be unassigned (Unassign unused)')
								unassignProfiles.push(ca);
							}
						} else if (ca['profile-type'] === 'admin-username' || ca['profile-type'] === 'admin-password') { // not required because the management user handles this
							//console.log('skipping admin-username and admin-password - because its not an actual profile');
						} else if (ca['profile-type'] === 'ap-uplinks') { // not required because the Interface profile handles this
							//console.log('skipping ap-uplinks');
						} else if (ca['profile-type'] === 'ap-port-profiles') { // not required because the Interface profile handles this
							//console.log('skipping ap-port-profiles');
						} else if (ca['profile-instance'] === selectedConfigSet['profiles'][ca['profile-type']]) {
							console.log(ca['profile-instance']+' matches existing scope mapped '+ca['profile-type']+ ' profile.')
							skipAssignmentProfiles.push(ca);
							//console.log(this);
						} else {
							console.log(ca['profile-type'] +':'+ ca['profile-instance']+' needs to be unassigned')
							unassignProfiles.push(ca);
							//console.log(this);
						}
					} else if (ca['profile-type'] in selectedConfigSet['profiles'] && document.getElementById("cfg-unassignUnset").checked) {
						if (ca['profile-type'] === 'admin-username' || ca['profile-type'] === 'admin-password') { // not required because the management user handles this
							//console.log('skipping admin-username and admin-password - because its not an actual profile');
						} else if (ca['profile-type'] === 'ap-uplinks') { // not required because the Interface profile handles this
							//console.log('skipping ap-uplinks');
						} else if (ca['profile-type'] === 'ap-port-profiles') { // not required because the Interface profile handles this
							//console.log('skipping ap-port-profiles');
						} else {
							console.log(ca['profile-type'] +':'+ ca['profile-instance']+' needs to be unassigned (Unassign unused)')
							unassignProfiles.push(ca);
						}
					} 
				}
			})
			if (skipAssignmentProfiles.length > 0) console.log('No need to modify scope mapping for: ' + skipAssignmentProfiles.map(profile => profile['profile-instance']).join(', '));
			if (unassignProfiles.length > 0) console.log('These profiles require unassigning before new profiles can be assigned: ' + unassignProfiles.map(profile => profile['profile-instance']).join(', '));
			unassignCurrentProfiles(deviceFunction)
		}
	});
}

function unassignCurrentProfiles(deviceFunction) {
	if (unassignProfiles.length > 0) {
		configSetNotification.update({ progress: 60, message: 'Unassigning existing scope mappings for the selected scopes...' });
		if (unassignNotification) unassignNotification.close();
		unassignNotification = showProgressNotification('ca-bin', 'Unassigning '+ unassignProfiles.length + ' profiles', 'bottom', 'center', 'info');
		logInformationHeading('Unassigning existing scope mappings for the selected scopes...');
		
		unassignCounter = 0;
		unassignErrors = 0;
		let i =0;
		// Sequentially unassign - to prevent resource conflict errors
		unassignProfileForDeviceFunction(unassignProfiles[unassignCounter], deviceFunction);
	} else {
		// No existing profiles to unassign - jump to assigning the profiles
		logInformation('There are no existing profiles that need to unassigned to the selected scopes');
		assignConfigSetProfiles(deviceFunction);
	}
}

function unassignProfileForDeviceFunction(configProfile, deviceFunction) {
	fetchProxyWithAuth('/tools/deleteCommand', {
		url: localStorage.getItem('base_url') + '/network-config/v1/config-assignments/'+configProfile['scope-id']+'/'+deviceFunction+'/'+configProfile['profile-type']+'/'+configProfile['profile-instance'],
		access_token: localStorage.getItem('access_token'),
	}).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		// Process The status code of the result
		let result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429 || result == 409) {
			// Over API threshold limit or backend busy. Wait apiWaitDelay value and try again.
			setTimeout(unassignProfileForDeviceFunction, apiWaitDelay, configProfile, deviceFunction);
		} else if (result !== 200) {
			logError('Failed to delete existing Scope Mapping for '+configProfile['profile-instance']+' from '+configProfile['scope-name']);
			unassignErrors++;
			checkUnassignComplete(deviceFunction);
		} else {
			logInformation('Unassigned '+ configProfile['profile-instance'] + ' ('+configProfile['profile-type']+') from '+configProfile['scope-name'])
			// Successfully delete mapping
			checkUnassignComplete(deviceFunction);
		}
	}).catch(function(err) {
		// Over API threshold limit or backend busy. Wait apiWaitDelay value and try again.
		if (err && err.status === 400) {
			logError('Failed to delete existing Scope Mapping for '+configProfile['profile-instance']+' for '+ configProfile['scope-name']);
			unassignErrors++;
			checkUnassignComplete(deviceFunction);
		}
		else {
			console.log('Unassign error for ' +configProfile['profile-instance'] + ' ('+configProfile['profile-type']+') for '+configProfile['scope-name']+' - trying again');
			let randDelay = Math.floor(Math.random() * 10) + 1;
			setTimeout(unassignProfileForDeviceFunction, apiWaitDelay * randDelay, configProfile, deviceFunction)
		}
	});
}

function checkUnassignComplete(deviceFunction) {
	unassignCounter++;
	let progress = (unassignCounter / unassignProfiles.length) * 100
	if (unassignNotification) unassignNotification.update({ progress: progress });
	if (unassignCounter >= unassignProfiles.length) {
		if (unassignNotification) setTimeout(unassignNotification.close, 1000);
		if (unassignErrors != 0) {
			configSetNotification.close();
			updateInformation();
			hideModalThenSwal('CFGModal', {
				title: 'Error Unassigning Existing Profile',
				html: unassignErrors + ' profiles were not able to unassigned. This prevents profiles from being assigned to the selected scopes',
				icon: 'error',
				showCancelButton: true,
				confirmButtonColor: '#3085d6',
				cancelButtonColor: '#888888',
				confirmButtonText: 'OK',
				cancelButtonText: 'Show Log',
			}).then(result => {
				if (result.isDismissed) setTimeout(showLog,500);
			});
		} else {
			logInformation('Existing scope mappings for the selected scopes have been unassigned');
			assignConfigSetProfiles(deviceFunction);
		}
	} else {
		unassignProfileForDeviceFunction(unassignProfiles[unassignCounter], deviceFunction);
	}

}

function assignConfigSetProfiles(deviceFunction) {
	configSetNotification.update({ progress: 80, message: 'Assigning required Config Set profiles to selected scopes...' });
	logInformationHeading('Assigning required Config Set profiles to selected scopes...');
	assignmentCounter = 0;
	assignmentErrors = 0;

	// build POST data...
	let assignmentList = [];
	let adminList = [];
	// for each of the selected scope
	selectedScopes.forEach(function(scope) {
		let currentScope = scope.toString();;
		// loop through all the config profiles
		Object.keys(selectedConfigSet['profiles']).forEach(function(key) {
			let currentProfileType = key.toString();;
			let currentProfileData = selectedConfigSet['profiles'][key];
			if (currentProfileData) {				
				if (currentProfileType === 'wlan-ssids') {
					// special case for WLANs because they are a list
					currentProfileData.forEach(function(item) {
						let wlanProfileName = item.toString();;
						if (!checkIfSkipping(currentScope, currentProfileType, wlanProfileName)) {
							assignmentList.push({ 'scope-id': currentScope, 'profile-type': currentProfileType, 'profile-instance': wlanProfileName, 'device-function': deviceFunction});
							logInformation('Assigning ' + wlanProfileName + ' (wlan-ssids) to ' + findScopeNameForId(currentScope));
						}
					})
				} else if (currentProfileType === 'admin-username' || currentProfileType === 'admin-password') {
					//console.log('skipping admin-username and admin-password - because its not an actual profile');
				} else if (currentProfileType === 'ap-port-profiles') {
					//console.log('skipping downlink ports');
				} else if (currentProfileType === 'ap-uplinks') {
					//console.log('skipping ap uplink ports');
				} else if (currentProfileType === 'management-users') {
					if (!checkIfSkipping(currentScope, currentProfileType, currentProfileData)) {
						// Assign management-users separately as they might have the most issues
						logInformation('Assigning ' + currentProfileData + ' ('+currentProfileType+') to ' + findScopeNameForId(currentScope));
						adminList.push({ 'scope-id': currentScope, 'profile-type': currentProfileType, 'profile-instance': currentProfileData, 'device-function': deviceFunction});
					}
				} else {
					if (!checkIfSkipping(currentScope, currentProfileType, currentProfileData)) {
						assignmentList.push({ 'scope-id': currentScope, 'profile-type': currentProfileType, 'profile-instance': currentProfileData, 'device-function': deviceFunction});
						logInformation('Assigning ' + currentProfileData + ' ('+currentProfileType+') to ' + findScopeNameForId(currentScope));
					}
				}
			}
		});
	});
	assignmentTotal = assignmentList.length + adminList.length;
	
	if (assignmentList.length > 0 || adminList.length > 0) {
		if (assignNotification) assignNotification.close();
		assignNotification  = showProgressNotification('ca-check-list', 'Assigning '+ assignmentTotal+ ' profiles', 'bottom', 'center', 'info')
		
		// Separate out management-users because of the duplicate username across profile limitations
		for (let i=0;i<adminList.length;i++) {
			setTimeout(assignProfilesBlock, apiProfileDelay * i, [adminList[i]], deviceFunction);
		}
		
		// try and separate multiple calls to the same resource to reduce 409 errors
		shuffleArray(assignmentList);
		let timeoutCounter = 0;
		while (assignmentList.length > 0) {
			var assignmentBlock = [];
			assignmentBlock = assignmentList.splice(0, apiAssignmentLimit);
			
			// Update assignments
			setTimeout(assignProfilesBlock, apiProfileDelay * timeoutCounter, assignmentBlock, deviceFunction);
			timeoutCounter++;
		}
	} else {
		logInformation('No profiles were required to be assigned to the selected scopes');
		if (configSetNotification) {
			configSetNotification.update({ progress: 100, type: 'success', message: 'The Config Set was assigned to the selected scopes' });
			configSetNotification.close();
		}
		// Successfully delete mapping
		logEnd('The Config Set "'+ selectedConfigSet.name + '" was assigned to the selected scopes');
		updateInformation();
		hideModalThenSwal('CFGModal', {
			title: 'Config Set Assigned',
			html: 'The Config Set was assigned to the selected scopes',
			icon: 'success',
			showCancelButton: true,
			confirmButtonColor: '#3085d6',
			cancelButtonColor: '#888888',
			confirmButtonText: 'OK',
			cancelButtonText: 'Show Log',
		}).then(result => {
			if (result.isDismissed) setTimeout(showLog,500);
		});
	}
}

function assignProfilesBlock(assignmentList, deviceFunction) {
	//console.log(assignmentList)
	fetchProxyWithAuth('/tools/postCommand', {
		url: localStorage.getItem('base_url') + '/network-config/v1/config-assignments',
		access_token: localStorage.getItem('access_token'),
		data: JSON.stringify({ 'config-assignment': assignmentList }),
	}).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		// Process The status code of the result
		let result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429 || result == 409) {
			// Over API threshold limit or backend busy. Wait apiWaitDelay value and try again.
			setTimeout(assignProfilesBlock, apiWaitDelay, assignmentList, deviceFunction);
		} else if (result == 400) {
			if (commandResults.message === "username is conflict across profile") {
				let cfgMode = modeSelector.getValue(true);
				if (cfgMode === modeValues['BASIC']) {
					logError('A User Administration profile with the username "'+document.getElementById("cfg-username").value+'" is already mapped at a higher scope for '+findScopeNameForId(assignmentList[0]['scope-id'])+'. Either choose a different username, or modify the user mapped at a higher scope');
				} else {
					logError('A User Administration profile with the same username is already mapped at a higher scope for '+findScopeNameForId(assignmentList[0]['scope-id'])+'. Either choose a different User Administration that uses a different username, or modify the user mapped at a higher scope');
				}
			}
			assignmentErrors++;
			assignmentCounter += assignmentList.length;
			checkProfileAssignmentComplete();
		} else if (result !== 200) {
			assignmentErrors++;
			assignmentCounter += assignmentList.length;
			checkProfileAssignmentComplete();
		} else {
			assignmentCounter += assignmentList.length;
			checkProfileAssignmentComplete();
		}
		
	});
}

function checkProfileAssignmentComplete() {
	let progress = (assignmentCounter / assignmentTotal) * 100
	if (assignNotification) assignNotification.update({ progress: progress });
	
	if (assignmentCounter >= assignmentTotal) {
		if (assignNotification) setTimeout(assignNotification.close, 1000);
		if (assignmentErrors > 0) {
			if (configSetNotification) {
				configSetNotification.update({ progress: 100, type: 'danger', message: 'Failed to assign config set to selected scopes' });
				setTimeout(configSetNotification.close, 1000);
			}
			logError('Failed to assign the complete config set to selected scopes');
			
			updateInformation();
			hideModalThenSwal('CFGModal', {
				title: 'Config Set Failure',
				html: 'The Config Set failed to be completely assigned to the selected scopes',
				icon: 'error',
				showCancelButton: true,
				confirmButtonColor: '#3085d6',
				cancelButtonColor: '#888888',
				confirmButtonText: 'OK',
				cancelButtonText: 'Show Log',
			}).then(result => {
				if (result.isDismissed) setTimeout(showLog,500);
			});
		} else {
			
			logInformation(assignmentTotal+' profiles were assigned to the selected scopes')
			if (configSetNotification) {
				configSetNotification.update({ progress: 100, type: 'success', message: 'The Config Set was assigned to the selected scopes' });
				configSetNotification.close();
			}
			
			// Successfully mapping
			logEnd(selectedConfigSet.name + ' was assigned to the selected scopes');
			updateInformation();
			hideModalThenSwal('CFGModal', {
				title: 'Config Set Assigned',
				html: 'The Config Set was assigned to the selected scopes',
				icon: 'success',
				showCancelButton: true,
				confirmButtonColor: '#3085d6',
				cancelButtonColor: '#888888',
				confirmButtonText: 'OK',
				cancelButtonText: 'Show Log',
			}).then(result => {
				if (result.isDismissed) setTimeout(showLog,500);
			});
		}
	}
}

function checkIfSkipping(profileScope, profileType, profileName) {
	let response = false;
	if (skipAssignmentProfiles.length != 0) {
		// loop through the 
		skipAssignmentProfiles.forEach(function(currentSkip) {
			if ((profileScope === currentSkip['scope-id']) && (profileType === currentSkip['profile-type']) && (profileName === currentSkip['profile-instance'])) response = true;
		});
	}
	return response;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
	// Pick a random index from 0 to i
	const j = Math.floor(Math.random() * (i + 1));

	// Swap elements at indices i and j
	[array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}