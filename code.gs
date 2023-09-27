/////////////////////////////////////////////////////////////////////////////////////////////
// Author: Ben Darpel
// Date:   09/13/2023
// Credit: Modified from Ryan Buckner
// Usage:  Free and Open
/////////////////////////////////////////////////////////////////////////////////////////////

// using sets the timezone equal to the timezone in the sheet settings
var TIMEZONE = Session.getScriptTimeZone();
// API error trapping
options = {muteHttpExceptions: true};

// the main function drives the show 
function main() {
  scoreData = allGameScores();
  oddsData = allGameOdds();
  writeScoresToSheet(scoreData);
  writeOddsToSheet(oddsData);
  // saveFinalOdds();
}

function writeOddsToSheet(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Odds/Spreads");
  sheet.clear();
  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
}

function saveFinalOdds() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Odds/Spreads");
  var odds = sheet.getDataRange().getValues();
  sheet = ss.getSheetByName("Past Spreads");
  var bottom = sheet.getLastRow();

  var now = new Date();
  var today = Utilities.formatDate(now, TIMEZONE, "MM/d/YYYY");
  var finalOdds = [];
  for(var i = 0; i < odds.length; i++){
    var gameDay = Utilities.formatDate(new Date(odds[i][1]),TIMEZONE, "MM/d/YYYY");
    if(gameDay == today)
      finalOdds.push(odds[i]);
  }

  sheet.getRange(bottom+1, 1, finalOdds.length, finalOdds[0].length).setValues(finalOdds);
}

// use this to write the info to the sheet 
function writeScoresToSheet(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Live Scoring");
  sheet.clear();
  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
}

function allGameOdds() {
  result = [];
      result.push(["Week", "Date", "Home Team", "Favorite", "Underdog", "Spread", "Book", "Last Update"]);
  api_key = "44134319fd33d12748fb4edc60f2e8ae";
  var url = "https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds/?apiKey=" + api_key + "&regions=us&markets=spreads&oddsFormat=american";

  var json = UrlFetchApp.fetch(url,options).getContentText();
  var games = JSON.parse(json);
    
  for (var i = 0; i < games.length-1; i++) {
        var game = games[i];


        // get game time information for the game
        var gameTime = new Date(game['commence_time']);
        var date = Utilities.formatDate(gameTime, TIMEZONE, "MM/d/YYYY");
        var week = Utilities.formatDate(gameTime, TIMEZONE, "w");
        var day =  Utilities.formatDate(gameTime, TIMEZONE, "u");

        //compensating for Mondays being part of the previous week #s games
        if(day < 3){
          week = week - 36;
        }
        if(day > 3){
          week = week - 35;
          if(day == 7){
            week = week - 1;
          }
        }
        var weekName = week;

        for (var j = 0; j < game['bookmakers'].length; j++) {
          //get book and odds
          var book = game['bookmakers'][j]['title'];
          var homeTeam = game['home_team'];
          var team1 = game['bookmakers'][j]['markets'][0]['outcomes'][0]['name'];
          var team1Odds = game['bookmakers'][j]['markets'][0]['outcomes'][0]['point'];
          var team2 = game['bookmakers'][j]['markets'][0]['outcomes'][1]['name'];
          var team2Odds = game['bookmakers'][j]['markets'][0]['outcomes'][1]['point'];
          var spread = 0;
          var favorite = 0;
          var underdog = 0;
          var last_update =  game['bookmakers'][j]['last_update'];

          if(team1Odds < 0 && team2Odds > 0){
            favorite = team1;
            underdog = team2;
            spread = team2Odds;
          }
          if(team1Odds > 0 && team2Odds < 0){
            underdog = team1;
            favorite = team2;
            spread = team1Odds;
          }

          // push the game data to the result object 
          result.push([
              weekName,
              date,
              homeTeam,
              favorite, 
              underdog, 
              spread,
              book,
              last_update,
          ]);
        }
    }
  return result;
}

// get all games for the year and return a data set 
function allGameScores() {
  result = [];
      result.push(["Week", "Date", "Time", "Away Team" ,"Home Team", "Away Score", "Home Score", "Game Winner", "Game Loser","Winning Margin"]);

    var year = Utilities.formatDate(new Date(), "GMT-5", "yyyy");

    var url = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?limit=1000&dates=" + year;

    // Hit the API, get the data 
    var json = UrlFetchApp.fetch(url,options).getContentText();
    var data = JSON.parse(json);
    
    var games = data['events']
 
    // cycle through all the games in the week 
    for (var i = 0; i < games.length; i++) {
      if(games[i]['season']['year'] == year && games[i]['season']['slug'] == 'regular-season'){
        var game = games[i]['competitions'][0];
        // shortcut vars
        var _home = game['competitors'][0];
        var _away = game['competitors'][1];

        // get the team names and their scores for the game
        var weekName = "Week " + games[i]['week']['number'];
        var homeTeam = _home['team']['location'] + " " + _home['team']['name'];
        var homeScore = Number(_home['score']);
        var awayTeam = _away['team']['location'] + " " + _away['team']['name'];
        var awayScore = Number(_away['score']);
        
        var gameMargin = 0;
        if(homeScore > awayScore){
          gameMargin = homeScore - awayScore;
        }
        if(awayScore > homeScore){
          gameMargin = awayScore - homeScore;
        }

        // get game time information for the game
        var gameTime = new Date(game['date']);
        var date = Utilities.formatDate(gameTime, TIMEZONE, "E YYYY/MM/d");
        var time = Utilities.formatDate(gameTime, TIMEZONE, "hh:mm a");

        var gameStatus = game['status']['type']['state'];
        // The ESPN API leaves the quarter as 4 even when the game is over. I prefer "F"
        if (gameStatus == "post"){
          period = 'F';
        } else if (gameStatus == "pre"){
          period = 'pre';
        }

        var gameWinner = "";
        var gameLoser = "";
        if (gameStatus == "post") {
          if (game['competitors'][0]['winner'] == true){
            gameWinner = homeTeam;
            gameLoser = awayTeam;
          } else if (game['competitors'][1]['winner'] == true) {
            gameWinner = awayTeam;
            gameLoser = homeTeam;
          } else {
            gameWinner = "TIE";
            gameLoser = "TIE";
          }
        }
        // push the game data to the result object 
        result.push([
            weekName,
            date,
            time,
            awayTeam, 
            homeTeam, 
            awayScore,
            homeScore,
            gameWinner,
            gameLoser,
            gameMargin,
        ]);
      }
    }
  return result;
}

function userPickUpdate(){
  var now = new Date();
  var week = Utilities.formatDate(now, TIMEZONE, "w");
  week = week - 35;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Week " + week + " Picks");
  var data = sheet.getRange('A2:I11').getValues();
  var spreads = sheet.getRange('B16:D31').getValues();

  sheet = ss.getSheetByName("Previous Picks");
  var savedData = sheet.getDataRange().getValues();
  var flag = 0;

  for(var i = 0; i < savedData.length; i++){
    if(flag > 0){
      for(var j = 0; j < data.length; j++){
        //if there is no pick or a change to a pick, save it
        if(data[j][1] == ""){
          data[j][2] = "";
          data[j][3] = "";
        }
        if(data[j][4] == ""){
          data[j][5] = "";
          data[j][6] = "";
        }
        if(data[j][7] == 0){
          data[j][8] = "";
        }
        if(data[j][1] != savedData[i+j][1]){
          for(var k = 0; k < spreads.length; k++){
            if(data[j][1] == spreads[k][0]){
              data[j][2] = spreads[k][2];
              data[j][3] = spreads[k][1];
            }
          }
          savedData[i+j][1] = data[j][1];
          savedData[i+j][2] = data[j][2];
          savedData[i+j][3] = data[j][3];
        }
        if(data[j][4] != savedData[i+j][4]){
          for(var k = 0; k < spreads.length; k++){
            if(data[j][4] == spreads[k][1]){
              data[j][5] = spreads[k][2];
              data[j][6] = spreads[k][0];
            }
          }
          savedData[i+j][4] = data[j][4];
          savedData[i+j][5] = data[j][5];
          savedData[i+j][6] = data[j][6];
        }
        if(data[j][7] != savedData[i+j][7]){
          for(var k = 0; k < spreads.length; k++){
            if(data[j][7] == spreads[k][0]){
              data[j][8] = spreads[k][1];
            }
            if(data[j][7] == spreads[k][1]){
              data[j][8] = spreads[k][0];
            }
          }
          savedData[i+j][7] = data[j][7];
          savedData[i+j][8] = data[j][8];
        }
      }
      flag = 0;
    }
    if(savedData[i][0] == "Week " + week){
      flag = 1;
    }
  }
  sheet.getRange(1, 1, savedData.length, savedData[0].length).setValues(savedData);
  sheet = ss.getSheetByName("Week " + week + " Picks");
  sheet.getRange('A2:I11').setValues(data);

  week = week + 1;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Week " + week + " Picks");
  var data = sheet.getRange('A2:I11').getValues();
  var spreads = sheet.getRange('B16:D31').getValues();

  sheet = ss.getSheetByName("Previous Picks");
  var savedData = sheet.getDataRange().getValues();
  var flag = 0;

  for(var i = 0; i < savedData.length; i++){
    if(flag > 0){
      for(var j = 0; j < data.length; j++){
        //if there is no pick or a change to a pick, save it
        if(data[j][1] == ""){
          data[j][2] = "";
          data[j][3] = "";
        }
        if(data[j][4] == ""){
          data[j][5] = "";
          data[j][6] = "";
        }
        if(data[j][7] == 0){
          data[j][8] = "";
        }
        if(data[j][1] != savedData[i+j][1]){
          for(var k = 0; k < spreads.length; k++){
            if(data[j][1] == spreads[k][0]){
              data[j][2] = spreads[k][2];
              data[j][3] = spreads[k][1];
            }
          }
          savedData[i+j][1] = data[j][1];
          savedData[i+j][2] = data[j][2];
          savedData[i+j][3] = data[j][3];
        }
        if(data[j][4] != savedData[i+j][4]){
          for(var k = 0; k < spreads.length; k++){
            if(data[j][4] == spreads[k][1]){
              data[j][5] = spreads[k][2];
              data[j][6] = spreads[k][0];
            }
          }
          savedData[i+j][4] = data[j][4];
          savedData[i+j][5] = data[j][5];
          savedData[i+j][6] = data[j][6];
        }
        if(data[j][7] != savedData[i+j][7]){
          for(var k = 0; k < spreads.length; k++){
            if(data[j][7] == spreads[k][0]){
              data[j][8] = spreads[k][1];
            }
            if(data[j][7] == spreads[k][1]){
              data[j][8] = spreads[k][0];
            }
          }
          savedData[i+j][7] = data[j][7];
          savedData[i+j][8] = data[j][8];
        }
      }
      flag = 0;
    }
    if(savedData[i][0] == "Week " + week){
      flag = 1;
    }
  }
  sheet.getRange(1, 1, savedData.length, savedData[0].length).setValues(savedData);
  sheet = ss.getSheetByName("Week " + week + " Picks");
  sheet.getRange('A2:I11').setValues(data);
}

function weekCurrentSpreadUpdate(){
  var now = new Date();
  var week = Utilities.formatDate(now, TIMEZONE, "w");
  var day =  Utilities.formatDate(now, TIMEZONE, "u");

  if(day < 3){
    week = week - 36;
  }
  if(day > 3){
    week = week - 35;
    if(day == 7){
      week = week - 1;
    }
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Week "+ week +" Picks");
  var data = sheet.getRange('N16:P363').getValues();
  var currentSpreads = sheet.getRange('B16:D31').getValues();
  for(var k = currentSpreads.length-1; k >= 0; k--){
    if(currentSpreads[k][0] == 0){
      currentSpreads.pop();
    }
  }
  for(var i = 0; i < data.length; i++){
    var foundFlag = 0;
    if(data[i][0] != "#N/A"){
      for(var j = 0; j < currentSpreads.length; j++){
        if(currentSpreads[j][0] != ""){
          if(data[i][0] == currentSpreads[j][0] || data[i][1] == currentSpreads[j][0]){
            currentSpreads[j] = data[i];
            foundFlag = 1;
          }
        }
      }
      if(foundFlag == 0){
        currentSpreads.push(data[i])
      }
    }
  }
  sheet.getRange(16, 2, currentSpreads.length, currentSpreads[0].length).setValues(currentSpreads);

    sheet = ss.getSheetByName("Week "+ (week+1) +" Picks");
    data = sheet.getRange('N16:P363').getValues();
    currentSpreads = sheet.getRange('B16:D31').getValues();
    for(var k = currentSpreads.length-1; k >= 0; k--){
      if(currentSpreads[k][0] == 0){
        currentSpreads.pop();
      }
    }
    for(var i = 0; i < data.length; i++){
      var foundFlag = 0;
      if(data[i][0] != "#N/A"){
        for(var j = 0; j < currentSpreads.length; j++){
          if(currentSpreads[j][0] != ""){
            if(data[i][0] == currentSpreads[j][0] || data[i][1] == currentSpreads[j][0]){
              currentSpreads[j] = data[i];
              foundFlag = 1;
            }
          }
        }
        if(foundFlag == 0){
          currentSpreads.push(data[i])
        }
      }
    }

    sheet.getRange(16, 2, currentSpreads.length, currentSpreads[0].length).setValues(currentSpreads);
    sheet = ss.getSheetByName("Week "+ (week+2) +" Picks");
    data = sheet.getRange('N16:P363').getValues();
    currentSpreads = sheet.getRange('B16:D31').getValues();
    for(var k = currentSpreads.length-1; k >= 0; k--){
      if(currentSpreads[k][0] == 0){
        currentSpreads.pop();
      }
    }
    for(var i = 0; i < data.length; i++){
      var foundFlag = 0;
      if(data[i][0] != "#N/A"){
        for(var j = 0; j < currentSpreads.length; j++){
          if(currentSpreads[j][0] != ""){
            if(data[i][0] == currentSpreads[j][0] || data[i][1] == currentSpreads[j][0]){
              currentSpreads[j] = data[i];
              foundFlag = 1;
            }
          }
        }
        if(foundFlag == 0){
          currentSpreads.push(data[i])
        }
      }
    }
    sheet.getRange(16, 2, currentSpreads.length, currentSpreads[0].length).setValues(currentSpreads);

}
