/*
Central Automation v2.x
Last Updated 2.0.0
Aaron Scott (WiFi Downunder) 2025-2026
*/

const CASVersion = "2.8.0";
function getCASVersion() {
	var versionP = document.getElementById('cas-version');
	if (versionP) versionP.innerHTML = 'Version: ' + CASVersion;
}