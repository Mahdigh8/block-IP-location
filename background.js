// background.js
"use strict";

chrome.runtime.onInstalled.addListener(function() {
	// Data Structure >> {"Country_1": ["Domain_1", "Domain_2"], "Country_2": ["Domain_3"]}
	var keys = ["bl_country_domain", "wl_country_domain"];
	
	for(let i in keys){
		var jsonfile = {};
		jsonfile[keys[i]] = JSON.stringify({});
		chrome.storage.local.set(jsonfile, function() {
			console.log(`${keys[i]} has set in storage`);
		});
	}
	updateLocalStorage();
});

//----RECEIVE MESSAGES FROM UI 
chrome.runtime.onMessage.addListener(
	function(message, sender, reply) {
		if (message.type === "update"){
			updateLocalStorage();

		}else if(message.type === "refresh"){
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		    chrome.tabs.executeScript(
		        tabs[0].id,
		        {code: 'window.setTimeout(function(){window.location.reload();}, 500);'});
		  });
		}
});

function setWithExpiry(key, value, ttl) {
	const now = new Date()

	// `item` is an object which contains the original value
	// as well as the time when it's supposed to expire
	const item = {
		value: value,
		expiry: now.getTime() + ttl,
	}
	sessionStorage.setItem(key, JSON.stringify(item))
}

function getWithExpiry(key) {
	const itemStr = sessionStorage.getItem(key)

	// if the item doesn't exist, return null
	if (!itemStr) {
		return null
	}

	const item = JSON.parse(itemStr)
	const now = new Date()

	// compare the expiry time of the item with the current time
	if (now.getTime() > item.expiry) {
		// If the item is expired, delete the item from storage
		// and return null
		sessionStorage.removeItem(key)
		return null
	}
	return item.value
}

function updateLocation(){
	var request = new XMLHttpRequest();
	request.open('GET', 'http://ip-api.com/json/', false);
	request.send(null);

	if (request.status === 200) {
		var data = request.response;
		var obj = JSON.parse(data);
		var country = obj["country"];

		// 5 second expiry time for location
		setWithExpiry("location", country, 5000);
		console.log("location stored in sessionStorage");
	}else{
		console.log("API has some problems.");
	}
}

chrome.tabs.onActivated.addListener(function(info){
	// sessionStorage.getItem("tabColors"+info.tabId);
	// sessionStorage.setItem("current_tab_id", info.tabId);
	// setColor(info.tabId);
	updateLocation();
});

function getAllDomains(data, all_domains_list){
	data = JSON.parse(data);

	for(let key in data){
		for(let i in data[key]){
			if( !(all_domains_list.includes(data[key][i])) ){
				all_domains_list.push(data[key][i]);
			}
		}
	}
	return all_domains_list;
}

// for ease of access to data stored in chrome.storage.local I also stored
// the same data in localStorage.
function updateLocalStorage(){
	chrome.storage.local.get("bl_country_domain", function (bl_domain_array) {
		var bl_data = bl_domain_array.bl_country_domain;
		localStorage.bl_country_domain = bl_data;
		var bl_restricted_domains = getAllDomains(bl_data, []);
		
		localStorage.blRestrictedDomains = bl_restricted_domains;
		console.log("all bl restricted domains=> "+bl_restricted_domains);
	});

	chrome.storage.local.get("wl_country_domain", function (wl_domain_array){
		var wl_data = wl_domain_array.wl_country_domain;
		localStorage.wl_country_domain = wl_data;
		var wl_restricted_domains = getAllDomains(wl_data, []);

		localStorage.wlRestrictedDomains = wl_restricted_domains;
		console.log("all wl restricted domains=> "+wl_restricted_domains);
	});
}


function setColor(tabID){
	var LS = sessionStorage.getItem("tabColors"+tabID);
	if(LS === "red"){
		chrome.browserAction.setIcon ( { path: '/img/icon-64x64-red.png' } );
	}else if(LS === "green"){
		chrome.browserAction.setIcon ( { path: '/img/icon-64x64-black.png' } );
	}else{
		chrome.browserAction.setIcon ( { path: '/img/icon-64x64-black.png' } );
	}
}

function matchDomain(domains_list, domain){

	var flag = false;
	for(let i in domains_list){
		if(domain.includes(domains_list[i])){
			flag = true;
			break;
		}
	}

	return flag;
};


function isDomainValid(domain, key) {
	// in this function we check if our requested domain
	// is restricted in our current IP-Location.
	var isValid = false;

	var location = getWithExpiry("location");
	if (location == null){
		updateLocation();
		location = getWithExpiry("location");
	}

	console.log("location => " + location);
	
	var domain_list = localStorage[key];
	
	domain_list = JSON.parse(domain_list);

	isValid = matchDomain(domain_list[location] ,domain);

	return isValid;
}


var validateLocation = function(details) {
	var access_url = details.url;
	var domain = (new URL(access_url));
	domain = domain.hostname;

	console.log("domain => " + domain);
	var block = false;
	var pass = false;

	// wl_restricted_domains and bl_restricted_domains will use to
	// check if our requested domain is in black list of white list domains 
	var wl_restricted_domains = localStorage.wlRestrictedDomains;
	var bl_restricted_domains = localStorage.blRestrictedDomains;

	if(wl_restricted_domains){
		wl_restricted_domains = wl_restricted_domains.split(",");
		// matchDomain checks if our requested domain is in the white list
		// restricted domains and needs to be checked with our Geo-location.
		var isIncludeDomain = matchDomain(wl_restricted_domains ,domain);
		if (isIncludeDomain){
			var isValid = isDomainValid(domain, "wl_country_domain");
			if (!isValid){
				block = true;
			}else{
				block = false;
				pass = true;
			}
		}
	}

	if(bl_restricted_domains && !block){
		bl_restricted_domains = bl_restricted_domains.split(",");
		var isIncludeDomain = matchDomain(bl_restricted_domains ,domain);
		if (isIncludeDomain){
			var isValid = isDomainValid(domain, "bl_country_domain");
			if (isValid){
				block = true;
				pass = false;
			}else{
				block = false;
				pass = true;
			}
		}
	}

	// var this_tab_id = sessionStorage.getItem('current_tab_id');
	
	// if(block){
	// 	sessionStorage.setItem('tabColors'+this_tab_id, "red");
	// }else{
	// 	if(pass){
	// 		sessionStorage.setItem('tabColors'+this_tab_id, "green");
	// 	}else{
	// 		sessionStorage.setItem('tabColors'+this_tab_id, "grey");
	// 	}
	// }
	// setColor(this_tab_id);

	return {cancel: block}
}
	


chrome.webRequest.onBeforeRequest.addListener(
	validateLocation,
	{ urls: ["<all_urls>"] },
	["blocking"]
);
