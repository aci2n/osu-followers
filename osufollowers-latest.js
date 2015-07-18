// ==UserScript==
// @name osu! followers
// @version 0.11
// @namespace https://github.com/alvarocalace/osufollowers
// @description Adds link to osu! profile on facebook comments
// @require http://code.jquery.com/jquery-latest.js
// @include https://osu.ppy.sh/u/*
// @copyright 2015, Alvaro Daniel Calace
// @downloadURL https://raw.githubusercontent.com/alvarocalace/osufollowers/master/osufollowers-latest.js
// @grant GM_xmlhttpRequest
// ==/UserScript==

var username;
var URL_USER = 'https://osu.ppy.sh/u/';
var URL_BEATMAP = 'https://osu.ppy.sh/b/';
var index = 0;
var updating = 0;

$(window).load(
	function main(){
		console.log('i started');
		username = getCookie('last_login');
		if (username && ((URL_USER + username).match(document.URL + '*') || $('.profile-username').first().text().trim() === username)) {
		   init();
		}
	}
);

function init() {
    console.log('i loaded');
    var followedDiv = $('<div>');
    $('#full').after(followedDiv);    
    followedDiv.append('<div id="followedPlayersTitle"class="profileStatHeader">Followed Players</div>');

    var followedTable = $('<table>').attr('id', 'followedTable');
	console.log(followedTable);
    followedDiv.append(followedTable);

    appendBatch();
	
	var showMeMore = $('<a>').attr('href', '#').text("Show me more...").on('click', function(event){
		event.preventDefault();
		if (!updating) {
			appendBatch();
		}
	});
	followedDiv.append(showMeMore);
	
	var loadingIcon = $('<img>').attr('id', 'followedLoadingIcon').attr('src', 'http://www.arabianbusiness.com/skins/ab.main/gfx/loading_spinner.gif').css('height', '20px').css('width', '20px');
	showMeMore.after(loadingIcon);
	
	followedDiv.append('<br><br>');
	
	var inputPlayer = $('<input>').attr('placeholder', 'follow a new player!').attr('id', 'inputPlayer');
	followedDiv.append(inputPlayer);
	inputPlayer.on('keydown', function(event) {
		var player = $(this).val();
		if (!updating && event.which === 13 && player) {
			$(this).val('');
			var url = 'http://itoon-osufollower.rhcloud.com/AddFollowedPlayer?'
			+ 'username=' + encodeURIComponent(username)
			+ '&player=' + encodeURIComponent(player);
			processUpdate(url, ' player ' + player + ' added');
		}
	});
}

function processUpdate(url, message) {
	createGetRequest(url, function(){
		$('#messageAdded').remove();
		var span = $('<span>').attr('id', 'messageAdded').css('color', '#424242'). text(message).fadeIn(400).delay(5000).fadeOut(400);
		$('#inputPlayer').after(span);
		$('#followedTable').empty();
		index = 0;
		appendBatch();
		goToByScroll('followedPlayersTitle');
	});
}

function appendBatch() {
	updating = 1;
	var url = 'http://itoon-osufollower.rhcloud.com/api/FollowedPlayersRecentTopScores?username=' + encodeURIComponent(username) + '&startingIndex=' + encodeURIComponent(index);
	console.log('im requesting ' + url);
	$('#followedLoadingIcon').show();
	createGetRequest(url, function(response){
		$('#followedLoadingIcon').hide();
		var data = $.parseJSON(response.responseText);
		for (var i = 0; i < data.length; i++) {
			console.log('appending');
			appendFollowedRow($('#followedTable'), data[i]);
			index++;
		}
		updating = 0;
	});
}

function appendFollowedRow(table, d) {
	var deleteButton = $('<img>').attr('src','https://cdn2.iconfinder.com/data/icons/windows-8-metro-style/128/delete.png').css('width', '10px').css('height', '10px').css('cursor', 'pointer').on('click', function() {
		if (!updating && confirm('Are you sure you want to stop following ' + d.username + '?')) {
			var url = 'http://itoon-osufollower.rhcloud.com/DeleteFollowedPlayer?'
			+ 'username=' + encodeURIComponent(username)
			+ '&player=' + encodeURIComponent(d.username);
			processUpdate(url,  ' player ' + d.username + ' deleted');
		}
	});
	
    table.append($('<tr>')
		 .append($('<td>').css('width', '17%')
			.append($('<time>').attr('class', 'timeago').attr('datetime', d.date).attr('title', d.date).text(d.date))
		)
		.append($('<td>')
			.append($('<div>').attr('class', 'event epic1')
				.append($('<img>').attr('src', '/images/' + d.rank +'_small.png'))
				.append(' ')
				.append($('<a>').attr('href', URL_USER + d.username).attr('target', '_blank').css('font-weight', 'bold').text(d.username)) 
				.append(' got ' + d.pp + ' pp on ')
				.append($('<a>').attr('href',URL_BEATMAP + d.beatmapId).attr('target', '_blank').text(d.artist + ' - ' + d.title + ' [' + d.version + '] '))
				.append (' (' + modsToString(d.mods) + ') ')
				.append(deleteButton)
			)
		)
	);
}

function createGetRequest(url, callback) {
    GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        onload: function(response) {
            callback(response);
        }
    });
}

function getCookie(k){return(document.cookie.match('(^|; )'+k+'=([^;]*)')||0)[2];}

function modsToString(mods) {
	var str = '';
	for (var i = 0; i < mods.length; i++) {
		str += mods[i] + ', ';
	}
	return str.substring(0, str.length - 2);
}

function goToByScroll(id){
    $('html,body').animate({scrollTop: $("#"+id).offset().top},'slow');
}
